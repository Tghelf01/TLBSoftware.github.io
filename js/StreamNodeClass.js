//Class implementation of the StreamNodeHierarchy, requires ES6
class StreamNodeHierarchy{
    constructor(){
        this.Context = this;
    }
    //Getters and Setters
        /*Getters and setters cannot be the same name as the property they update
        *For example:
        * set StreamFile(input){this.StreamFile = input}
        * This will cause an infinite loop by invoking the setter again
        */
        get getStreamFile(){
            return this.StreamFile;
        }
        set setStreamFile(input){
            this.StreamFile = input;
        }
        get getNodeFile(){
            return this.NodeFile;
        }
        set setNodeFile(input){
            this.NodeFile = input;
        }
    
    //Methods
        AddData(streams, nodes){
            //add data and then parse
            if(streams !== null && nodes !== null &&
            streams !== undefined && nodes !== undefined){
                this.StreamFile = streams;
                this.NodeFile = nodes;
                this.ParseNodesToStreams();
            }else if(streams !== null && streams !== undefined){
                if(streams.features[0].geometry.type === "MultiLineString"){
                    this.StreamFile = this.ConvertStreams(streams);
                }else{
                    this.StreamFile = streams;
                }
                this.NodeFile = this.DirtyNodeCreator();
                this.ParseNodesToStreams();
            }else{
                console.log("AddData Method: neither streams or nodes can be null or undefined");
            }
                
        }
        LoadData(streams, nodes){
            if(streams !== null && nodes !== null &&
            streams !== undefined && nodes !== undefined){
                this.StreamFile = streams;
                this.NodeFile = nodes;
            }else{
                console.log("LoadData Method: neither streams or nodes can be null");
            }
        }

        /*
        There is a dirty and an optimized way to do this.
        Dirty Way: Use the beginnings and ends of every feature to create a non duplicate
        NodeFile and then use pre existing parser to create relations

        GeoJSON files retrieved using qgis from the nhd will have features with a type of "Multilinestring"
        as oppossed to linestring, which makes the streams nested one layer deeper. Unsure how to fix this right now
        other than the ConvertStreams method quick fix, will update later to make class more robust.

        Optimized way: While creating the Nodes for a stream, concurrently add the nodes to streams and vice versa
        */
        DirtyNodeCreator(){
            const nodegeojson = {"type": "FeatureCollection", "features": []};
            const temparray = [];
            for(var i=0;i<this.StreamFile.features.length;i++){
                let nodearray = new Array(2);
                const streamcoordinates = this.StreamFile.features[i].geometry.coordinates;
                nodearray[0] = [streamcoordinates[0][0], streamcoordinates[0][1]];
                nodearray[1] = [streamcoordinates[streamcoordinates.length-1][0], streamcoordinates[streamcoordinates.length-1][1]];
                for(var y=0;y<nodearray.length;y++){
                    //does it contain the feature already
                    var counter = temparray.length;
                    for(var x=0;x<temparray.length;x++){
                        if(temparray[x][0] === nodearray[y][0] &&
                            temparray[x][1] === nodearray[y][1]){
                            break;
                        }else{
                            counter--;
                        }
                    }
                    if(counter === 0){
                        temparray.push([nodearray[y][0], nodearray[y][1]]);
                    }
                }
            }
            const featureArray = new Array(temparray.length);
            for(var i=0;i<temparray.length;i++){
                featureArray[i] = this.CreateBlankNodeFeature(temparray[i]);
            }
            nodegeojson.features = featureArray;
            return nodegeojson;
        }

        /*
            A VERY CRUDE AND UNROBUST WAY TO HANDLE THIS
            Quickly implemented to allow me to use the flowline data retrieved from the nhd via qgis
            Data format had features containing single lined multilines, shouldve been just lines but I
            am unexperienced with qgis.
        */
        ConvertStreams(streams){
            for(var i=0;i<streams.features.length;i++){
                streams.features[i].geometry.coordinates = (streams.features[i].geometry.coordinates[0])
                streams.features[i].geometry.type = "LineString";
            }

            return streams;
        }

        //Used to create a node feature to place inside of the generated nodefile
        CreateBlankNodeFeature(coordinates){

                /*{"type":"Feature","properties":
                    {"Enabled":1},"geometry":
                        {"type":"Point","coordinates":[-86.27280487599995,37.300131959000055]}}
                */
            let returnjson = {
                "type": "Feature",
                "properties":{
                    "Enabled":1
                },
                "geometry":{
                    "type":"Point"
                }
            }

            returnjson.geometry.coordinates = coordinates;
            return returnjson;

        }

        ParseNodesToStreams(){
            if(this.StreamFile === null || this.NodeFile === null ||
            this.StreamFile === undefined || this.NodeFile === undefined){
                console.log("Parsing requires StreamFile and NodeFile to be set");
                return; //returning since one or more is null
            }
            //Place algorithm
            let indexArray = this.CreateNodeIndexArray(this.NodeFile);
            for(var i=0;i<this.StreamFile.features.length;i++){
                //create new property to store the indexes
                this.StreamFile.features[i].properties.ToNodeIndexes = [];
                //retrieve the indexes of the nodes

                let nodeCollection = this.FindStreamsNodes(this.StreamFile.features[i], indexArray);
                this.StreamFile.features[i].properties.ToNodeIndexes = new Array(nodeCollection.length-1);
                //for every node, push it to the new property created above
                if(nodeCollection !== undefined){
                    for(var x=0;x<nodeCollection.length;x++){
                        //push the nodes index to the StreamFile properties
                        if(x===0){
                            this.StreamFile.features[i].properties.FromNodeIndex = nodeCollection[x];
                        }else{
                            this.StreamFile.features[i].properties.ToNodeIndexes[x-1] = nodeCollection[x];
                        }
                        
                        //push the streams index to each nodes properties
                        this.AssignStreamToNode(nodeCollection[x], i);
                    }
                }
            }
        }

        CreateNodeIndexArray(nodes){
            let newarray = new Array(nodes.features.length);
            for(var i=0;i<newarray.length;i++){
                newarray[i] = nodes.features[i].geometry.coordinates;
            }
            return newarray;
        }

        AssignStreamToNode(nodeIndex, streamIndex){
            let existingStreamIndexes = this.NodeFile.features[nodeIndex].properties.streamIndexes;
            //if property exists then check if the node contains the stream already
            if(existingStreamIndexes !== undefined){
                //if the stream is already contained then return
                if(existingStreamIndexes.indexOf(streamIndex) !== -1){
                    return;
                }
                this.NodeFile.features[nodeIndex].properties.streamIndexes.push(streamIndex);
            }
            //if property doesnt exist then create the property and send stream to it
            else{
                this.NodeFile.features[nodeIndex].properties.streamIndexes = [streamIndex];
            }
        }

        FindStreamsNodes(stream, hydroIndex){
            //FIRST ARRAY INDEX HAS TO BE THE FROMNODE
            let streamsNodesIndexes = [];
            let streamNodesandCoordIndexes = [];
            for(var x=0;x<hydroIndex.length;x++){
                for(var i=0;i<stream.geometry.coordinates.length;i++){
                    if(hydroIndex[x][0] === stream.geometry.coordinates[i][0]
                    && 
                    hydroIndex[x][1]===stream.geometry.coordinates[i][1]){
                        streamNodesandCoordIndexes.push({nodeIndex: x, coordIndex:i});
                        break;
                    }
                }
            }
            
            if(stream.properties.FlowDir === 1){
                let min = streamNodesandCoordIndexes[0];
                for(var i=1; i<streamNodesandCoordIndexes.length;i++){
                    if(streamNodesandCoordIndexes[i].coordIndex < min.coordIndex){
                        min = streamNodesandCoordIndexes[i];
                    }
                }
                streamsNodesIndexes.push(min.nodeIndex);
                for(var i=0;i<streamNodesandCoordIndexes.length;i++){
                    if(streamNodesandCoordIndexes[i] !== min){
                        streamsNodesIndexes.push(streamNodesandCoordIndexes[i].nodeIndex);
                    }
                }
            }
            //added to allow a different flow direction to be used
            else{
                let max = streamNodesandCoordIndexes[0];
                for(var i=1;i<streamNodesandCoordIndexes.length;i++){
                    if(streamNodesandCoordIndexes[i].coordIndex > max.coordIndex){
                        max = streamNodesandCoordIndexes[i];
                    }
                }
                streamsNodesIndexes.push(max.nodeIndex);
                for(var i=0;i<streamNodesandCoordIndexes.length;i++){
                    if(streamNodesandCoordIndexes[i] !== max){
                        streamsNodesIndexes.push(streamNodesandCoordIndexes[i].nodeIndex);
                    }
                }

            }
            
            return streamsNodesIndexes;
        }

        DownstreamTrace(streamFeature){
            console.log("DownstreamTrace exists")
            let DownstreamTraceCollection = [];
            DownstreamTraceCollection.push(streamFeature)
            //retrieve remaining streams for trace
            let loopFlag = true;
            if(streamFeature.properties.ToNodeIndexes === 0){ 
                loopFlag = false;
            }
            //next stream is an array to allow segments to split
            let nextStream = [streamFeature];
            while(loopFlag){
                nextStream = this.FindNextDownStreamArray(nextStream);
                let counterLimit = nextStream.length; 
                //check if all streams have only 1 node, if they all do then break the loop
                for(var i=0;i<nextStream.length;i++){
                    //added to prevent massive geojson objects
                    if(DownstreamTraceCollection.indexOf(nextStream[i]) === -1){
                        DownstreamTraceCollection.push(nextStream[i]);
                    }
                    if(nextStream[i].properties.ToNodeIndexes === 0){
                        counterLimit--;
                    }
                }
                //may be causing crash due to infinite loop
                if(counterLimit === 0){
                    loopFlag = false;
                    break;
                }else if(nextStream.length === 1 && this.RetrieveDownStreamFromNodes(nextStream[0]).length ===0){
                    loopFlag = false;
                    break;
                }
            }
            //create geoJson object
            let DownstreamGeoJson = {type: "FeatureCollection", features: DownstreamTraceCollection};
            //Draw Layer
            return DownstreamGeoJson;
        }

        UpstreamTrace(streamFeature){
            let UpstreamCollection = [];
            UpstreamCollection.push(streamFeature);
            let loopFlag = true;
            let nextStream = [streamFeature];
            while(loopFlag){
                nextStream = this.FindNextUpstreamArray(nextStream);
                if(nextStream.length === 0){
                    loopFlag = false;
                    break;
                }
                for(var i=0;i<nextStream.length;i++){
                    if(UpstreamCollection.indexOf(nextStream[i]) === -1){
                        UpstreamCollection.push(nextStream[i]);
                    }
                }
            }
            let UpstreamGeoJson = {type: "FeatureCollection", features: UpstreamCollection};
            return UpstreamGeoJson;
        }

        FindNextDownStreamArray(streamArray){
            let returnArray = [];
            for(var i=0;i<streamArray.length;i++){
                if(streamArray[i].properties.ToNodeIndexes.length === 0){
                    break;
                }else{
                    let streams = this.RetrieveDownStreamFromNodes(streamArray[i]);
                    for(var x=0;x<streams.length;x++){
                        if(returnArray.indexOf(streams[x]) === -1){
                            returnArray.push(streams[x]);
                        }
                    }
                }
            }
            return returnArray;
        }

        FindNextUpstreamArray(streamArray){
            let returnArray = [];
            for(var i=0;i<streamArray.length;i++){
                let streams = this.RetrieveUpstreamFromNodes(streamArray[i]);
                for(var x=0;x<streams.length;x++){
                    if(returnArray.indexOf(streams[x]) === -1){
                        returnArray.push(streams[x]);
                    }
                }
            }
            return returnArray;
        }

        RetrieveDownStreamFromNodes(stream){
            let returnStreams = [];
            //for every node
            for(var i=0;i<stream.properties.ToNodeIndexes.length;i++){
                let ToNodeIndex = stream.properties.ToNodeIndexes[i];
                let nodeStreams = this.NodeFile.features[ToNodeIndex].properties.streamIndexes;
                //find the streams that do not have this index as a "FromNodeIndex"
                for(var x=0;x<nodeStreams.length;x++){
                    let streamFromNodeIndex = this.StreamFile.features[nodeStreams[x]];
                    if(streamFromNodeIndex.properties.FromNodeIndex === ToNodeIndex
                    && streamFromNodeIndex !== stream){
                        returnStreams.push(streamFromNodeIndex);
                        //drop markers on the new streams nodes
                        //this.markStreamsNodes(streamFromNodeIndex);
                    }
                }
            }
            
            return returnStreams;
        }

        RetrieveUpstreamFromNodes(stream){
            let returnStreams = [];
            let FromNode = stream.properties.FromNodeIndex;
            let Streams = this.NodeFile.features[FromNode].properties.streamIndexes;
            for(var i=0;i<Streams.length;i++){
                //turn index into stream
                let stream2 = this.StreamFile.features[Streams[i]];
                if(stream2 !== stream){
                    //get ToNodeIndexes from stream2
                    StreamsToNodes = stream2.properties.ToNodeIndexes;
                    for(var x=0;x<StreamsToNodes.length;x++){
                        //since tracing upstream we want the stream whos ToNode equals the input streams FromNode
                        if(StreamsToNodes[x] === FromNode){
                            returnStreams.push(stream2);
                            break;
                        }
                    }
                }
            }
            return returnStreams;
        }

        /**
         * Requires Leaflet as well as depends on map object being named map
         */
        MarkStreamsNodes(stream){
            let FromNode = this.NodeFile.features[stream.propertoes.FromNodeIndex].geometry.coordinates;
            L.marker([FromNode[1], FromNode[0]]).bindPopup("FromNode, index "+stream.properties.FromNodeIndex);
		    for(var i=0;i<stream.properties.ToNodeIndexes.length;i++){
			    ToNode = this.NodeFile.features[stream.properties.ToNodeIndexes[i]].geometry.coordinates;
			    L.marker([ToNode[1],ToNode[0]]).bindPopup("ToNode, index "+ stream.properties.ToNodeIndexes[i]).addTo(map);
		    }
        }
}

if(typeof module !== undefined && module.exports){
    module.exports = StreamNodeHierarchy;
}else{
    this.StreamClass = StreamNodeHierarchy;
}