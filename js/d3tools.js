//Javascript file for abstraction of d3 features

//Only draws Linegraph, does not remove elements from previous screen
function LineGraph(selectorArg, width, height, margins){
	var context = this;
	var colorsForLines = ["red", "blue", "green"];
	this.margins = margins;
	this.svg = selectorArg.append("g")
							.attr("transform",
							 "translate("+this.margins.left+","+this.margins.top+")");
	this.graphWidth = width != null ? width : svg.attr("width");
	this.graphHeight = height != null ? height : svg.attr("height");
	this.focus = this.svg.append("g").style("display", "none").attr("class","focus");
	this.lineSvg = this.svg
			.append("g");
	//Sets the scales of the graph
	this.xScale = d3.scaleTime().range([0, this.graphWidth]);
	this.yScale = d3.scaleLinear().range([this.graphHeight, 0]);
	this.formatDate = d3.timeFormat("%Y");
	//The line equation that data will be passed into to generate a polyline
	this.lineFunc = d3.line()
		.x(function(d){return context.xScale(d.year);})
		.y(function(d){return context.yScale(d.value);});
	this.loadData = function(data){
		this.data = data;
		console.log(data);
		var rangeOfTime = [], rangeOfValues = [];
		for(var i=0;i<this.data.length;i++){
			rangeOfTime.push(d3.min(data[i], function(d){return d.year;}));
			rangeOfTime.push(d3.max(data[i], function(d){return d.year;}));
			rangeOfValues.push(d3.min(data[i], function(d){return d.value;}));
			rangeOfValues.push(d3.max(data[i], function(d){return d.value;}));
		}
		this.xScale.domain(d3.extent(rangeOfTime, function(d){return d;}));
		this.yScale.domain(d3.extent(rangeOfValues, function(d){return d;}));
	};	
	this.draw = function(){
		
		if(this.data.length <= 3){
			for(var i=0;i<this.data.length;i++){
				var lineClass = "line" + i;
				this.lineSvg
					.append("path")
					.data([this.data[i]])
					.attr("class", lineClass)
					.attr("d", this.lineFunc)
					.attr("stroke", colorsForLines[i])
			}
		}else{
			for(var i=0;i<this.data.length;i++){
				var lineClass = "line" + i;
				this.lineSvg
					.append("path")
					.data([this.data[i]])
					.attr("class", lineClass)
					.attr("d", this.lineFunc)
					.attr("stroke", "black")
					
			}
		}
		this.lineSvg
			.append("g")
			.attr("transform", "translate(0," + this.graphHeight + ")")
			.call(d3.axisBottom(this.xScale));
		this.lineSvg
			.append("g")
			.call(d3.axisLeft(this.yScale));

		if(this.data.length <= 3){
		this.svg.append("rect")
	        .attr("width", this.graphWidth)
	        .attr("height", this.graphHeight)
	        .attr("class", "mouseover-rectangle")
	        .style("stroke", "none")
	        .style("fill", "none")
	        .style("pointer-events", "all")
	        .on("mouseover", function() { context.focus.style("display", null); })
	        .on("mouseout", function() {context.focus.style("display", "none"); })
	        .on("mousemove", mousemove);
    	}
	};
	//function to analyze mouse position against data

	this.bisectDate = d3.bisector(function(d) { return d.year; }).left;

	//append circle for tooltip
	this.focus.append("circle")
			.attr("class", "y")
			.style("fill", "none")
			.style("stroke", "blue")
			.attr("r", 4);
	this.focus.append("text")
        .attr("class", "y1")
        .style("stroke", "white")
        .style("stroke-width", "3.5px")
        .style("opacity", 0.8)
        .attr("dx", 8)
        .attr("dy", "-.3em");
    this.focus.append("text")
        .attr("class", "y2")
        .attr("dx", 8)
        .attr("dy", "-.3em");
    this.focus.append("text")
        .attr("class", "y3")
        .style("stroke", "white")
        .style("stroke-width", "3.5px")
        .style("opacity", 0.8)
        .attr("dx", 8)
        .attr("dy", "1em");
    this.focus.append("text")
        .attr("class", "y4")
        .attr("dx", 8)
        .attr("dy", "1em");

	//event to track mouse position and move circle on line
	function mousemove(){
    	toolData = context.data[0]
		var x0 = context.xScale.invert(d3.mouse(this)[0]),
	      i = context.bisectDate(toolData, x0, 1),
	      d0 = toolData[i - 1],
	      d1 = toolData[i],
	      d =x0 - d0.year > d1.year - x0 ? d1 : d0;

	    context.focus.select("circle.y")
	    		.attr("transform",  
	            "translate(" + (context.xScale(d.year)) + "," +  
	                           (context.yScale(d.value)) + ")");
	    context.focus.select("text.y1")
	    		.attr("transform",  
	            "translate(" + (context.xScale(d.year)) + "," +  
	                           (context.yScale(d.value)) + ")")
	    		.text("$"+d.value);

	    context.focus.select("text.y2")
	    		.attr("transform",  
	            "translate(" + (context.xScale(d.year)) + "," +  
	                           (context.yScale(d.value)) + ")")
	    		.text("$"+d.value);
	    context.focus.select("text.y3")
      			.attr("transform",
            	"translate(" + context.xScale(d.year) + "," +
                           context.yScale(d.value) + ")")
      			.text(context.formatDate(d.year));

		context.focus.select("text.y4")
		      	.attr("transform",
		            "translate(" + context.xScale(d.year) + "," +
		                           context.yScale(d.value) + ")")
		      	.text(context.formatDate(d.year));
	}

	//appends rect for mousemove event tracking
	
};
