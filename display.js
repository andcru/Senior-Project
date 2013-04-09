// STORY: On connecting to server, server returns an object.
// This object contains the contents of each of the config tables, in full
var socket = io.connect('http://cc.acrudge.com');

var   recent_time
	, active_config
	, plot = []
	, tables = {}
	, data_converted = []
	, data_len_max = 100;

socket.on('reading', function(data) {
	getData(data);
});

socket.on('loadAllInfo', function(data) {
	console.log('Displays table received');
	tables = data.tables;
	getInputs();
});

$(document).ready(function(){
	$('#textdisplay').hide();
    $('#textdisplay_toggle').on('click', function(){
        $('#textdisplay').toggle();
    });

    $(document).ready(function(){
	  var plot1 = $.jqplot ('plot_wrapper', [[3,7,9,1,4,6,8,2,5]]);
	});
});

function getData(data){
	var vals = data.split(",");
	var ts = vals.pop();
	//console.log(ts);
	//console.log(vals);
    var time = convertTime(ts);
    $.each(tables.inputs, function(k,v) {
    	if(v.active > 0) {
	        var holder = data_converted[k];
	        if( holder.length == data_len_max )
	            holder.shift();   
	        holder.push([time, convertData(vals[k], v.type)]);
	        data_converted[k] = holder;
	        console.log(data_converted[k]);
    	}
    });
    //console.log(data_converted.toString());
    //updatePlots();
    //updateTextDisplay();
}

function plot_options(title,xlabel,ylabel,ymin,ymax) {
    this.title = {
        text: title,
        show: true
    };
    this.axes = {
        xaxis: {
            renderer: $.jqplot.DateAxisRenderer,
            numberTicks: 4,
            tickOptions: {
                formatString: "%I:%M:%S.%N"
            },
            label: xlabel,
            labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
            labelOptions: {
                show: true
            }
        },
        yaxis: {
            label: ylabel,
            labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
            labelOptions: {
                show: true
            },
            tickOptions:{
                formatString: "%1.1f"
            },
            min: parseInt(ymin),
            max: parseInt(ymax)
        }
    };
    this.seriesDefaults = {
        showMarker: false
    };
}

function makePlot(num) {
	$("#plot_wrapper").append("<div class='well well-small'><div class='plot' id='plot"+num+"' style='height:300px;width:600px;'></div></div>");
	options = new plot_options(displays[active_config].plots[num].title,displays[active_config].plots[num].xaxislabel,displays[active_config].plots[num].yaxislabel,displays[active_config].plots[num].ymin,displays[active_config].plots[num].ymax);
	plot[num] = $.jqplot("plot"+num,nulldata,options);
}

function setConfig(num){
    active_config = num;
    $(".well .plot").parent('.well').remove();
    $.each(displays[num].plots, function(k,v){
        makePlot(k);
    });
}

function convertTime(timestamp){
    return timestamp*1000;
}

function convertData(data,type){
    var x = data;
    //return eval(conversions[type].equation);
    return parseInt(x);
}

function updatePlots(){
    //need to make it so that if signals are removed from signal_list, they are removed from series data
    $.each(displays[active_config].plots, function(k,v){
        $.each(v["signal_list"], function(i,l){
            if(typeof data_converted[l] != "undefined"){
                plot[k].series[i].data = data_converted[l];
            }
        });
        plot[k].axes.xaxis.min = (recent_time - v["timespan"])*1000;            
        plot[k].axes.xaxis.max = recent_time*1000;
        plot[k].destroy();
        plot[k].replot();
    })
}

function updatePlot(){
    var plot_num = $("#plotlistingcontainer").find(".active").html();
    var title = $("#title").val();
    var xaxislabel = $("#xaxislabel").val();
    var yaxislabel = $("#yaxislabel").val();
    var timespan = $("#timespan").val();
    var ymin = $("#ymin").val();
    var ymax = $("#ymax").val();
    var signal_list = [];
    $("#signallisting").find(".active").each(function(){
        signal_list.push($(this).html());
    })
    if( plot_num == "+" ){
        plot_num = countObject(config[active_config].plots)+1;
        config[active_config].plots[plot_num] = {};

    }
    config[active_config].plots[plot_num].title = title;
    config[active_config].plots[plot_num].xaxislabel = xaxislabel;
    config[active_config].plots[plot_num].yaxislabel = yaxislabel;
    config[active_config].plots[plot_num].timespan = timespan;
    config[active_config].plots[plot_num].ymin = ymin;
    config[active_config].plots[plot_num].ymax = ymax;
    config[active_config].plots[plot_num].signal_list = signal_list;
    updateConfig(active_config);
    $("#plot_wrapper").empty();
    setConfig(active_config);
    onHideEditPlots();
    onShowEditPlots();
}

// ------------------------------------------------- Getting Configs ----------------------------------------------------- //

function getInputs(notdatasetup) {
    console.log("start: getInputs");
    $.each(tables.inputs,function(k,v){
        if(!notdatasetup)
            data_converted[k] = [];
    });
    console.log("finish: getInputs");
}
