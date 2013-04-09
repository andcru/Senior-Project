$(document).ready(function() {
	// Listeners
	$("input:radio").change(resetPlot);

	// Variables
	var interval = 100; //ms
	var datalen = 50;
	var steps = 1;
	var newtemp;
	var container = $("#graph");
	var temps = [];
	var data = [];
	var plot;

    var options = {
        series: { shadowSize: 0}, // drawing is faster without shadows
        yaxis: { min: -15, max: 45 },
        xaxis: { min: 0, max: datalen-1, show: false }
    };

    resetPlot();

	// Define Update Script
	setInterval(updateGraph,interval);

	// Set up plot
	function resetPlot() {
		temps = [];
		data = [];
		getTemp();
		temps.push(newtemp);
		data.push([0,temps[0]]);
		plot = $.plot(container, [data], options);
		console.log(data+"");

		var xaxisLabel = $("<div class='axisLabel xaxisLabel'></div>")
			.text("Time")
			.appendTo(container);

		var yaxisLabel = $("<div class='axisLabel yaxisLabel'></div>")
			.text("Temperature (C)")
			.appendTo(container);
		yaxisLabel.css('margin-top',yaxisLabel.width()/2);
	}

	function updateGraph() {
		var temp = [];
		getTemp();
		if(data.length == datalen) {
			for(i=0;i<datalen-1;i++) {
				temps[i] = temps[i+1];
				data[i] = [i,temps[i]];
			}
			temps[datalen-1] = newtemp;
			data[datalen-1] = ([datalen-1,newtemp]);
		}
		else {
			temps.push(newtemp);
			data.push([data.length,newtemp]);
		}
		plot.setData([data]);
		plot.draw();
		steps++;
	}

	function getTemp() {
		var signal = $("#measurement:checked").val();
		$.getJSON('/data/reading.php', function(val) {
  			reading = val["r"+signal];
  			console.log(val);
			newtemp = (1.591E-07*(Math.pow(reading,3)) - 0.000224311*(Math.pow(reading,2)) + 0.18834*reading - 45.87).toFixed(1);
		});
	}

});
