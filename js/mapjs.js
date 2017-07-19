//Latitude Longitude
function initMap(){
    mymap = L.map('map').setView([38.2527, -85.7585], 13);
    var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
	var osm = new L.TileLayer(osmUrl, {minZoom: 8, attribution: osmAttrib}).addTo(mymap);

    $.getJSON("../data/parsedstreamfile.json", (streams) =>{
            layer = L.geoJSON(streams, {
            onEachFeature: (f, l) =>{
                l.on('click', FeatureOnClick);
            },
            style: ColorStreamsStyle
        }).addTo(mymap);
        console.log(streams);
        
        $.getJSON("../data/parsednodefile.json", (nodes) =>{
          Streamer = new StreamNodeHierarchy();
            Streamer.LoadData(streams, nodes);  
        })
    });
}

function ColorStreamsStyle(f){
    switch(f.properties.FCode){
        case 42001: return {color: "#ff0000"};
        case 42002: return {color: "#ff0000"};
        case 46006: return {color: "#00ff00"};
        case 46003: return {color: "#00ff00"};
        case 55800: return {color: "#0000ff"};
    }
    return {color: "#ff0000"};

}

function FeatureOnClick(e){
    console.log(e);
    mymap.removeLayer(layer)
    var returnedgeojson = Streamer.DownstreamTrace(e.target.feature);
    L.geoJSON(returnedgeojson, 
        {
            style: ColorStreamsStyle, 
            onEachFeature: (f, l) => {console.log(f, "feature"); console.log(l, "layer");}
        }
    ).addTo(mymap);
}