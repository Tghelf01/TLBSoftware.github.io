//javascript
// set width and height of svg element
var width = 1140;
var height = 506;

// create projection for map
var projection = d3.geoAlbersUsa()
	.translate([width / 2, height / 2])
	.scale([1100]);

// create path generator; converts geojson to svg path's ("M 100 100 L 300 100 L 200 300 z")
var path = d3.geoPath().projection(projection);
	
// create an svg element to the body of the html
var svg,
	legend,
	countryMap;
//Creates svg for usa map as well as places the High median mean low legend at top
function createMapSvg(){
	var countryMap = d3.select("#screen")
						.append("div")
						.attr("class", "container")
						.attr("id", "countryMap")
	createHighLowLegend();
	addColorLegendForData();
	svg = createSvgWithSelector(countryMap.append("div").attr("class", "container").attr("id", "map"));
}
//Creates graph svg that contains g for groups of svg objects
function createGraphSvg(){
	var lineGraphMap = d3.select("#screen").append("div").attr("class", "container").attr("id", "lineGraphMap");
	svg = createSvgWithSelector(lineGraphMap);
}
//Helper function for svgCreation in previous 2 methods
function createSvgWithSelector(selector){
	return selector.append("svg")
					.attr("id", "svgScreen")
					.attr("width", width)
					.attr("height", height);
}
	
// add a tooltip that appears when hovering over states
var tooltip = d3.select("body")
	.append("div")
	.attr("class", "tooltip");
	
// create a quantize scale (function) to sort data values into buckets of color
var color = d3.scaleQuantize()
	.range(colorbrewer.YlGnBu[9])

// calculate a color based on the stream gage cost from the streamgage.csv
function calculate_color(d) {
	var value;
	//if color by region
	if(regionChecked){
		regionValueArray = [];
		for(var i=0;i<regions.length;i++){
			for(var j=0;j<streamGageData.length;j++){
				if(regions[i][1] === streamGageData[j].state)
					regionValueArray[i] = streamGageData[j][stateValueKey];
			}
		}
		color.domain([d3.min(regionValueArray, function(d){return parseFloat(d);}),
					d3.max(regionValueArray, function(d){return parseFloat(d);})
					]); 
		value = d.properties.regionValue;
	}else{
		color.domain([d3.min(streamGageData, function(d){ return parseFloat(d[stateValueKey]);}),
					d3.max(streamGageData, function(d){return parseFloat(d[stateValueKey]);})
					]);
		value = d.properties.value;
	}
	if (value) {
		return color(value);
	} else {
		return "#ccc"; // grayish
	}
}
//Region list to help with grouping states
var southeastRegion = ["Alabama", "Arkansas", "Florida", "Georgia", "Louisiana", "Mississippi", 
						"North Carolina", "Puerto Rico", "South Carolina", "Tennessee"],
	northeastRegion = ["Connecticut", "Maine", "Maryland", "Delaware", "Massachusetts", "New Hampshire", "Vermont",
						"New Jersey", "New York", "Pennsylvania", "Rhode Island", "Virginia", "West Virginia"],
	midwestRegion = ["Illinois", "Indiana", "Kentucky", "Michigan", "Ohio", "Wisconsin", "Iowa",
						"Minnesota", "Missouri", "Nebraska", "North Dakota", "South Dakota"],
	southwestRegion = ["Arizona", "Colorado", "Kansas", "New Mexico", "Oklahoma", "Texas", "Utah"],
	northwestRegion = ["Idaho", "Montana", "Oregon", "Washington", "Wyoming"],
	pacificRegion = ["California", "Hawaii", "Nevada"];
var regions = [[southeastRegion, "Southeast Region"],
				[northeastRegion, "Northeast Region"],
				[midwestRegion, "Midwest Region"],
				[southwestRegion, "Southwest Region"],
				[northwestRegion, "Northwest Region"],
				[pacificRegion, "Pacific Region"]];
var regionNames = [];
				
var currentYear,
	currency,
	stateValueKey;
var regionChecked = false;
var streamGageData, jsonMap;

createMapSvg();
createCountryButtons();
//Load csv file via d3.csv(file, function(data))
function addColorLegendForData(){
	colorLegend = d3.select("#countryMap")
			.append("ul")
			.attr("class", "list-inline");
}
d3.csv("data/streamGage.csv", function(data){
	streamGageData = data;
	console.log(streamGageData)
	
	
	//setting radio button and slider to current and 2016 initially
	d3.select("#current").property("checked", function(d){return true;});
	updateCurrency(false);
	if(currentYear === undefined) currentYear = 2016;
	updateYear(currentYear, false);
	updateKey();
	//setting the color ranges domain property's range
	//d3.min takes a data set and returns the value being compared
	color.domain([d3.min(streamGageData, function(d){return parseFloat(d[stateValueKey]);}),
					d3.max(streamGageData, function(d){return parseFloat(d[stateValueKey]);})
					]);
					
	//load the data file, path is relative from site using this js
	d3.json("data/us-states.json", function(error, mapData){
		
		jsonMap = mapData;
		//merge the data and jsonMap
		//Bind the data and create one path for each geoJson feature
		mergeDataAndMap();
		
		
	})
});


function retrieveRegionName(stateName){
	for(var j=0;j<regions.length;j++){
		for(var r=0;r<regions[j][0].length;r++){
			if(stateName === regions[j][0][r]){
				//Objects region property is being assigned a string of the region
				return regions[j][1];
				break;
			}
		}
	}
}
function mergeDataAndMap(){
	
	for(var i=0;i<streamGageData.length;i++){
			
			
		var streamGageState = streamGageData[i]["state"];
			
		var streamGageValue = parseFloat(streamGageData[i][stateValueKey])
			
		//find the corresponding state inside the geojson
		//BINDS DATA TO JSON MAP
		for(var j=0;j<jsonMap.features.length;j++){
				
			//get the json state name
			var jsonDataState = jsonMap.features[j].properties.name
				
			//Since 2 entries include 2 states this condition assigns both the same value
			if(streamGageState.includes("New Hampshire/Vermont") ||
			streamGageState.includes("Maryland/Delaware")){
					var array = streamGageState.split('/')
					if(array[0] === jsonDataState){
						jsonMap.features[j].properties.value = streamGageValue;
						regionName = retrieveRegionName(array[0]);
						jsonMap.features[j].properties.regionName = regionName;
						for(var x=0;x<streamGageData.length;x++){
							if(streamGageData[x]["state"] === regionName){
								jsonMap.features[j].properties.regionValue = parseFloat(
									streamGageData[x][stateValueKey]
								);
							}
						}
					}
					if(array[1] === jsonDataState){
						jsonMap.features[j].properties.value = streamGageValue;
						regionName = retrieveRegionName(array[1]);
						jsonMap.features[j].properties.regionName = regionName;
						for(var x=0;x<streamGageData.length;x++){
							if(streamGageData[x]["state"] === regionName){
								jsonMap.features[j].properties.regionValue = parseFloat(
									streamGageData[x][stateValueKey]
								);
							}
						}
					}
					
				}
				
			if(streamGageState === jsonDataState)
			{
				//copy the data value into the json
				jsonMap.features[j].properties.value = streamGageValue;
				regionName = retrieveRegionName(streamGageState);
				jsonMap.features[j].properties.regionName = regionName;
				for(var x=0;x<streamGageData.length;x++){
					if(streamGageData[x]["state"] === regionName){
						jsonMap.features[j].properties.regionValue = parseFloat(
							streamGageData[x][stateValueKey]
						);
					}
				}
				break;
			}
		}
	}

		
		//Create legend here@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
		updateHighLowLegend();
		svg.selectAll("path")
			.data(jsonMap.features)
			.enter()
			.append("path")
			.attr("d", path)
			.attr("fill", calculate_color); 
		
		svg.selectAll("path")
			.data(jsonMap.features)
			.on("mouseover", function(d){
				d3.select(this)
						.transition().duration(100)
						.attr("opacity", .5)
						.attr("stroke-width", 3)
				d3.select("#statename").text(d.properties["name"])
				d3.select("#statevalue").text(d.properties["value"])
				
				//displays tooltip beside mouse
				if(d.properties.regionName !== undefined){
					tooltip.style("visibility", "visible")
						.style("top", (d3.event.pageY + 10) + "px")
						.style("left", (d3.event.pageX + 10) + "px")
						.text(d.properties.name + ": $" + convertToDollars(d.properties.value))
						.append('p')
						.text(d.properties.regionName + " Average: $" + convertToDollars(d.properties.regionValue) )
				}else{
					tooltip.style("visibility", "visible")
						.style("top", (d3.event.pageY + 10) + "px")
						.style("left", (d3.event.pageX + 10) + "px")
						.text(d.properties.name + ": $" + convertToDollars(d.properties.value));
			
				}
				
			})
			.on("mouseout", function(d){
				d3.select(this)
						.transition().duration(100)
						.attr("fill", calculate_color) 
						.attr("stroke-width", 1)
						.attr("opacity", 1)
				return tooltip.style("visibility", "hidden")
						
				
			})
			.on("click", function(d){
				//Start the graph screen with the states name
				openStateGraphScreen(d.properties.name);
				tooltip.style("visibility", "hidden")
				
			})
			.on("mousemove", function(){
				return tooltip.style("top", (d3.event.pageY + 10) + "px").style("left", (d3.event.pageX + 10) + "px");
				
			})
			
			updateColorLegend();				
			
			startMapListeners();
}
/*@@@@@@@@@@@@@@@@@@@@@@@
Create interactive slider
@@@@@@@@@@@@@@@@@@@@@@@*/
function startMapListeners(){
	//Slider event listener
	d3.select("#nYear").on("input", function(){
		updateYear(+this.value, true);
	});
	//Radio event listener
	d3.selectAll("input[name=currencyList]").on("change", function(){
		updateCurrency(this.id, true);
	});
	//Checkbox listener
	d3.select("#regionCheckBox").on("change", function(){
		regionChecked = this.checked;
		updateMap();
	})
}


function updateMapColors(){
	
	svg.selectAll("path").attr("fill", calculate_color);
}
function updateColorLegend(){
	colorLegend.selectAll("li.key").remove();
	var keys = colorLegend
							.selectAll("li.key")
							.data(color.range())
							.enter()
							.append("li")
							.attr("class", "key")
							.style("border-top-color", String)
							.text(function(d){
								console.log("inside text fn", d);
								var r = color.invertExtent(d)
								console.log("r", r)
								var format = d3.format("$,.2f")
								return format(+r[0]) + " - " + format(+r[1]);
							})
	
}
function updateYear(nYear, bool){
	//adjust the text on the range slider
	d3.select("#nYear-value").text(nYear);
	d3.select("#nYear").property("value", nYear);
	
	//update the currentYear and refresh map
	currentYear = nYear;
	if(bool){
		updateMap();
		updateColorLegend();
	}
}
function updateMap(){
	var lengthOfMap = jsonMap.features.length;
	for(var j=0; j< lengthOfMap; j++){
		jsonMap.features[j].properties.value = undefined;
	}
	updateKey()
	mergeDataAndMap();
	updateColorLegend();
	updateMapColors();
}

function updateCurrency(val, bool){
	switch(val){
		case "2015dollars":
			currency = "n2";
			break;
		case "1992dollars":
			currency = "n3";
			break;
		default:
			currency = "n1";
	}
	if(bool){
		updateMap();
	}
}

function updateKey(){
	stateValueKey = currency + "_" + currentYear;
}

function convertToDollars(amount){
	if(amount >= 0){
		return amount.toFixed(2).replace(/./g, function(c, i, a) {
		return i && c !== "." && ((a.length - i) % 3 === 0) ? ',' + c : c;})
	}else{return convertToDollars(0)}
};

function createCountryButtons(){
	d3.select("#countryMap").append("br")
	//Create year slider
	var paragraphForSlider = d3.select("#countryMap")
		.append("div").attr("class", "row")
		.append("div").attr("class", "col-md-12 text-center")
		.append("p");
		
	paragraphForSlider
		.append("label")
		.attr("for", "nYear")
		.attr("style", "display: inline-block; width: 240px; text-align: right")
		.text("Year: ")
		.append("span")
		.attr("id", "nYear-value")
		.text("...");
	paragraphForSlider
		.append("input")	
		.attr("type", "range")
		.attr("min", "1987")
		.attr("max", "2016")
		.attr("id", "nYear");
	//Create radio buttons for currency
	var paragraphForRadio = d3.select("#countryMap")
		.append("div").attr("class", "col-md-12 text-center")
		.append("p");
	paragraphForRadio.append("span").text("Currency: ")
	paragraphForRadio
		.append("input")
		.attr("type", "radio")
		.attr("name", "currencyList")
		.attr("id", "current")
	paragraphForRadio.append("span").text("Current ")
	paragraphForRadio
		.append("input")
		.attr("type", "radio")
		.attr("name", "currencyList")
		.attr("id", "2015dollars")
	paragraphForRadio.append("span").text("2015 $'s ")
	paragraphForRadio
		.append("input")
		.attr("type", "radio")
		.attr("name", "currencyList")
		.attr("id", "1992dollars")
	paragraphForRadio.append("span").text("1992 $'s")
	
	//Create checkbox for region view
	divForRegion = d3.select("#countryMap")
					.append("div")
					.attr("class", "row")
					.append("div")
					.attr("class", "col-md-12 text-center")
	divForRegion.text("Color map by Regions ")
	divForRegion.append("input")
				.attr("type", "checkbox")
				.attr("id", "regionCheckBox")
}

function createHighLowLegend(){
	legend = d3.select("#countryMap")
				.append("div")
				.attr("id", "highLowLegend")
				.attr("class", "col-md-12 text-center")
				.text("HIGH: LOW: MEAN: MEDIAN")
}

function updateHighLowLegend(){
	var high, low, mean = 0, median = 0;
	//programatically generate high, low, mean, median
	var arrayOfStateValues = [];
	var counter = 0;
	for(var i=0;i<streamGageData.length;i++){
		if(streamGageData[i][stateValueKey] > 0){
			arrayOfStateValues[counter++] = parseFloat(streamGageData[i][stateValueKey])
		}
	}
	high = d3.max(arrayOfStateValues, function(d){return d;})
	low = d3.min(arrayOfStateValues, function(d){return d;})
	for(var i=0;i<arrayOfStateValues.length;i++)
		mean += arrayOfStateValues[i];
	mean /= arrayOfStateValues.length;
	arrayOfStateValues.sort();
	if(arrayOfStateValues.length % 2 === 0){
		median = (arrayOfStateValues[(arrayOfStateValues.length / 2) - 1] + 
					arrayOfStateValues[(arrayOfStateValues.length / 2)])/2;
	}else{
		median = arrayOfStateValues[Math.floor(arrayOfStateValues.length / 2)];
	}
	
	legend.text("High: $" + convertToDollars(high) +
				" " + " Low: $" + convertToDollars(low) +
				" " + " Mean: $" + convertToDollars(mean) +
				" " + " Median: $" + convertToDollars(median))
}

/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
CODE FOR SECOND SCREEN
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*/
var graphMargins = {top: 20, right: 85, left: 85, bottom: 20},
	graphWidth = width - graphMargins.left - graphMargins.right - 66,
	graphHeight = height - graphMargins.top - graphMargins.bottom - 32;

var parseTime = d3.timeParse("%Y");
var stateNames = [];
	
function openStateGraphScreen(stateData){
	//First remove previous objects
	d3.select("#countryMap").remove();
	d3.select("#lineGraphMap").remove();
	createGraphSvg();
	//Grab all state values
	var stateValues;
	var dataToGraph = [];
	
	stateName = stateData;
	if(stateName === "all_states"){
		//Add each state to dataToGraph
		for(var i=0;i<stateNames.length;i++){
			dataToGraph[i] = [];
		}
		for(var i=0; i<streamGageData.length;i++){
			if(!arrayContains(regionNames, streamGageData[i].state)){
				var stateName = streamGageData[i].state;
				var stateVals = streamGageData[i];
				for(var year=1987;year<2017;year++){
					var key = "n1_" + year;
					if(stateVals[key] > 0){
						item = {};
						item["year"] = parseTime(year);
						item["value"] = +stateVals[key];
						dataToGraph[stateNames.indexOf(stateName)].push(item);
					}
				}
			}
		}
		d3.select("h1").text("All States")
	}else{
		dataToGraph = [curCurrent = [], cur2015 = [], cur1992 = []];
		for(var i=0;i<streamGageData.length;i++)
		{
			//first condition is for the 2 states that are combined
			var tempArray = streamGageData[i].state.split('/')
			if(tempArray.length > 1){
				if(tempArray[0] === stateName || tempArray[1] === stateName){
					stateValues = streamGageData[i];
					stateName = streamGageData[i].state;
				}
			}
			if(streamGageData[i]["state"] === stateName) 
				stateValues = streamGageData[i];
		}
		//n1=current, n2=2015 currency, n3=1992 currency
		var currencyTags = ["n1_", "n2_", "n3_"]
		counter = 0;
		for(var year=1987;year<=2016;year++){
			//assign values and years to 3 json objects above
			for(var i=0;i<dataToGraph.length;i++){
				if(stateValues[currencyTags[i]+year] > 0){
					item = {};
					item["year"] = parseTime(year);
					item["value"] = +stateValues[currencyTags[i]+year];
					dataToGraph[i].push(item);
				}
			}
			counter++
		}
		d3.select("h1").text(stateName + " Stream Gage Costs")
	}
	if(stateName === "all_states") stateName = "All States";

	var lineGraph = new LineGraph(svg, graphWidth, graphHeight, graphMargins);
	lineGraph.loadData(dataToGraph);
	lineGraph.draw();
	//Create a back button that returns you to the country map
	createBackButton();
	createGraphButtons();
	setDropList(stateName);
	
}

function createGraphButtons(){
	var lineGraphMap = d3.select("#lineGraphMap");
	var buttonRow = lineGraphMap.append("div").attr("class", "row");
	var col1 = buttonRow.append("div").attr("class", "col-md-3");
	var mySelect = col1.append("select").attr("id", "stateSelect");
	
	if(regionNames.length === 0){
		for(var i=0;i<regions.length;i++){
			regionNames.push(regions[i][1])
		}
	}
	
	if(stateNames.length === 0){
		for(var i=0;i<streamGageData.length;i++){
			if(!arrayContains(regionNames, streamGageData[i]["state"])){
				stateNames.push(streamGageData[i]["state"]);
			}
		}
	}
	stateNames.sort();
	for(var i=-1;i<stateNames.length;i++){
		if(i===-1){
			mySelect.append("option").attr("value", "all_states").text("All States");
		}else{
			var name = stateNames[i];
			if(name === ""){
				continue
			}
			mySelect.append("option").attr("value", name).text(name)
		}
	}
	mySelect.on("change", dropListChange);

}

function setDropList(state){
	d3.select("#stateSelect").property("value", state);
}

function dropListChange(){
	var selectedState = d3.select("#stateSelect").property("value");
	openStateGraphScreen(selectedState);
}

function arrayContains(array, string){
	for(var i=0;i<array.length;i++){
		if(array[i] === string){return true}
	}
	return false;
}

function createBackButton(){
	var svgScreen = d3.select("#svgScreen");
	//button background
	svgScreen.append("rect")
		.attr("x", "10")
		.attr("y", "10")
		.attr("width", "16")
		.attr("height", "26")
		.attr("fill", "#00441b")
	svgScreen.append("polygon")
		.attr("points", "15,23 21,16 21,30")
		.attr("fill", "yellow")
		.attr("stroke", "yellow")
		.attr("stroke-width", "3")
		
	svgScreen.append("rect")
		.attr("x", "7")
		.attr("y", "7")
		.attr("width", "22")
		.attr("height", "32")
		.attr("opacity", "0.1")
		.attr("fill", "#00441b")
		.attr("id", "backButton");
	d3.select("#backButton").on("click", function(){
		goBackToMap();
	});
}

function goBackToMap(){
	d3.select("#lineGraphMap").remove();
	createMapSvg();
	createCountryButtons();
	d3.select("#current").property("checked", function(d){return true;});
	updateYear(currentYear, true);
	d3.select("h1").text("USGS Stream Gage Costs")
}