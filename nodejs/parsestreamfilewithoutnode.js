const fs = require('fs');
const arguments = process.argv.slice(2);
const firstfilename = arguments[0];
//const firstfilename = "../data/TotalFlowLinesFromNHD.json";
const Streamer = require('../js/StreamNodeClass.js');
console.log(firstfilename)
console.time("readparsewrite");
fs.readFile(firstfilename, 'utf8', function(error, stream){
        const streamjson = JSON.parse(stream);
        const streamobj = new Streamer();
        streamobj.AddData(streamjson);
        fs.writeFile("parsedstreamfile.json", JSON.stringify(streamobj.StreamFile), () => {console.log("Stream data written")});
        fs.writeFile("parsednodefile.json", JSON.stringify(streamobj.NodeFile), () => {console.log("Stream data written")});
        //console.log(JSON.parse(arguments[0]).name);
        console.timeEnd("readparsewrite");
})
