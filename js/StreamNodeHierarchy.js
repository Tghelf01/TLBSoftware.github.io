//function implementation of stream tracing, consult StreamNodeClass for newest features
function StreamNodeHierarchy(){
	//Allows Context to be reference in anonymouse functions
	const Context = this;
	this.ShapeFile;
	this.HydroNetData;
	
	this.LoadData = function(streams, nodes){
		this.ShapeFile = streams;
		this.HydroNetData = nodes;
	}
	//Loads Stream ShapeFile and Hydro Net Data into object as well as starts the parsing
	this.AddData = function(stream, hydro){
		this.ShapeFile = stream;
		this.HydroNetData = hydro;
		if(stream !== null && hydro !== null){
			console.time("ParseNodeToStreams");
			this.ParseNodesToStreams();
			console.timeEnd("ParseNodeToStreams");
			//HydroIndex accessed 13,632,773 times
			/*
			console.log("Old algorithm: 13,632,773 HydroIndexes accessed")
			//this.ParseStreamsToNodes();
			console.log("HydroIndex accessed " + this.HydroIndexCounter + " times");
			console.log("StreamCoord index accessed " + this.StreamCoordCounter + " times");
			*/
		}
	}
	//Parses the shapefile and hydro net file to find correlations, stores the index of the node in "nodeIndexes" on the shapefile object itself
	this.ParseNodesToStreams = function(){
		let indexArray = this.CreateHydroIndex(this.HydroNetData);
		for(var i=0;i<this.ShapeFile.features.length;i++){
			//create new property to store the indexes
			this.ShapeFile.features[i].properties.ToNodeIndexes = [];
			//retrieve the indexes of the nodes

			let nodeCollection = this.FindStreamsNodes(this.ShapeFile.features[i], indexArray);
			this.ShapeFile.features[i].properties.ToNodeIndexes = new Array(nodeCollection.length-1);
			//for every node, push it to the new property created above
			if(nodeCollection !== undefined){
				for(var x=0;x<nodeCollection.length;x++){
					//push the nodes index to the shapefile properties
					if(x===0){
						this.ShapeFile.features[i].properties.FromNodeIndex = nodeCollection[x];
					}else{
						this.ShapeFile.features[i].properties.ToNodeIndexes[x-1] = nodeCollection[x];
					}
					
					//push the streams index to each nodes properties
					this.AssignStreamToNode(nodeCollection[x], i);
				}
			}
		}
	}
	this.CreateHydroIndex = function(hydro){
		let newArray = new Array(hydro.features.length);
		for(var i=0;i<newArray.length;i++){
			newArray[i] = hydro.features[i].geometry.coordinates;
		}
		return newArray;
	}
	this.AssignStreamToNode = function(nodeIndex, streamIndex){
		let existingStreamIndexes = this.HydroNetData.features[nodeIndex].properties.streamIndexes;
		//if property exists then check if the node contains the stream already
		if(existingStreamIndexes !== undefined){
			//if the stream is already contained then return
			if(existingStreamIndexes.indexOf(streamIndex) !== -1){
				return;
			}
			this.HydroNetData.features[nodeIndex].properties.streamIndexes.push(streamIndex);
		}
		//if property doesnt exist then create the property and send stream to it
		else{
			this.HydroNetData.features[nodeIndex].properties.streamIndexes = [streamIndex];
		}
	}
	//returns from and to nodes indexes for "stream" segment only
	//TODO optimimize the search through the array
	//Went from 185ms to 175ms for ParseStreamsToNodes by passing an indexed array instead of full hydro
	this.FindStreamsNodes = function(stream, hydro){
		//FIRST ARRAY INDEX HAS TO BE THE FROMNODE
		let streamsNodesIndexes = [];
		let streamNodesandCoordIndexes = [];
		
		
		for(var x=0;x<hydro.length;x++){
			for(var i=0;i<stream.geometry.coordinates.length;i++){
				if(hydro[x][0] === stream.geometry.coordinates[i][0]
				&& 
				hydro[x][1]===stream.geometry.coordinates[i][1]){
					streamNodesandCoordIndexes.push({nodeIndex: x, coordIndex:i});
					break;
				}
			}
		}
		

		//search the whole hydro file for each stream coordinate, if theres a match then push the coordinate to the collection
		/* WORKING ALGORITHM
		for(var x=0;x<hydro.length;x++){
			for(var i=0;i<stream.geometry.coordinates.length;i++){
				if(hydro[x].geometry.coordinates[0] === stream.geometry.coordinates[i][0]
				&& 
				hydro[x].geometry.coordinates[1]===stream.geometry.coordinates[i][1]){
					streamNodesandCoordIndexes.push({nodeIndex: x, coordIndex:i});
					break;
				}
			}
		}*/
		//for normal flow direction, 1 meaning that the order of the coordinates form 0-n is the streams flow
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
	};	
	//returns GeoJson object to draw layer with
	this.DownstreamTrace = function(streamFeature){
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
	//return array of all possible downstreams
	this.FindNextDownStreamArray = function(streamArray){
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
	this.RetrieveDownStreamFromNodes = function(stream){
		let returnStreams = [];
		//for every node
		for(var i=0;i<stream.properties.ToNodeIndexes.length;i++){
			let ToNodeIndex = stream.properties.ToNodeIndexes[i];
			let nodeStreams = this.HydroNetData.features[ToNodeIndex].properties.streamIndexes;
			//find the streams that do not have this index as a "FromNodeIndex"
			for(var x=0;x<nodeStreams.length;x++){
				let streamFromNodeIndex = this.ShapeFile.features[nodeStreams[x]];
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
	
	this.RetrieveUpstreamFromNodes = function(stream){
		
		let returnStreams = [];
		let FromNode = stream.properties.FromNodeIndex;
		let Streams = this.HydroNetData.features[FromNode].properties.streamIndexes;
		for(var i=0;i<Streams.length;i++){
			//turn index into stream
			let stream2 = this.ShapeFile.features[Streams[i]];
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
	this.UpstreamTrace = function(streamFeature){
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
	this.FindNextUpstreamArray = function(streamArray){
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
	//drops markers on the streams nodes, used for testing
	this.markStreamsNodes = function(stream){
		let FromNode = this.HydroNetData.features[stream.properties.FromNodeIndex].geometry.coordinates;
		L.marker([FromNode[1], FromNode[0]]).bindPopup("FromNode, index "+stream.properties.FromNodeIndex);
		for(var i=0;i<stream.properties.ToNodeIndexes.length;i++){
			ToNode = this.HydroNetData.features[stream.properties.ToNodeIndexes[i]].geometry.coordinates;
			L.marker([ToNode[1],ToNode[0]]).bindPopup("ToNode, index "+ stream.properties.ToNodeIndexes[i]).addTo(map);
		}
	}
	
}

//module.exports.NewObj = StreamNodeHierarchy;