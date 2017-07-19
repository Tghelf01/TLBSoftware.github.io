//read arguments
const fs = require('fs');
const streamClass = require('../js/StreamNodeClass.js');
const StreamObj = new streamClass();
const StreamName = process.argv[2];
const NodeName = process.argv[3];
//const StreamName = "data/NHDFlowtest.json";
//const NodeName = "data/HydroFlowtest.json";
console.time('ReadParsedWriten');
console.log('hi');
fs.readFile(StreamName, (error, stream) => {
    fs.readFile(NodeName, (err, node) => {
        const parsestream = JSON.parse(stream);
        const parsenode = JSON.parse(node);
        StreamObj.AddData(parsestream, parsenode);
        fs.writeFileSync('parsedstreamjson.json', JSON.stringify(StreamObj.ShapeFile));
        fs.writeFileSync('parsenodejson.json', JSON.stringify(StreamObj.HydroNetData));
        console.log('bye');
        console.timeEnd('ReadParsedWriten');
    })
})