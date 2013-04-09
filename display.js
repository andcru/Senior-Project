// STORY: On connecting to server, server returns an object.
// This object contains the contents of each of the config tables, in full
var socket = io.connect('http://cc.acrudge.com');

var   recent_time
    , run = {}
    , timer
    , rem_time
	, active
	, plot = []
	, tables = {}
	, data_converted = []
	, data_len_max = 100
    , nulldata = [[null],[null],[null],[null],[null],[null],[null],[null]]
    , run_inputs = ["name","rate","duration"];

socket.on('reading', function(data) {
	getData(data);
});

socket.on('state_change', function(data) {
    updateDisplayStates(data);
});

socket.on('running', function(data) {
    run = data;
    if(run.run > 0)
        onRunStart();
    else
        onRunEnd();
});

socket.on('loadAllInfo', function(data) {
	console.log('Displays table received');
	tables = data.tables;
    active = data.active;
	getInputs();
    setConfig(active.displays);
    makeDisplayValues();
});

$(document).ready(function(){
    $('#textdisplay_toggle').on('click', function(){
        $('#textdisplay').toggle();
    });
    $(".run_control").click(doRun);
});

function doRun() {
    var outs = {};
    if(!$(this).hasClass("disabled")) {
        if($(this).attr('id') == 'startNewRun') {
            for(var i=0; i<run_inputs.length; i++)
                if($("#"+run_inputs[i]).val())
                    outs[run_inputs[i]] = $("#"+run_inputs[i]).val();
                else
                    return false;
        }
        else
            outs.duration = 0;
        socket.emit('run_request',outs);
    }
}

function getData(data){
	var vals = data.split(",");
    var time = vals.pop();
	recent_time = convertTime(time);
    $.each(tables.inputs, function(k,v) {
    	if(v.active > 0) {
	        var holder = data_converted[k];
	        if( holder.length == data_len_max )
	            holder.shift();   
	        holder.push([time, convertData(vals[k], v.type)]);
	        data_converted[k] = holder;
    	}
    });
    updatePlots();
    updateDisplayValues(vals);
}

function updateTimer() {
    if(rem_time <= 0) {
        rem_time = 0;
        clearInterval(timer);
    }
    var hr = Math.floor(rem_time/60/60);
    var mi = Math.floor(rem_time/60 - hr*60);
    var se = Math.floor(rem_time-hr*60*60-mi*60);
    var tr = hr+":"+pad(mi.toString(),2)+":"+pad(se.toString(),2);
    rem_time--;
    $("#time_remain").html(tr);
}
function pad (str, max) {
    return str.length < max ? pad("0" + str, max) : str;
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
                formatString: "%I:%M:%S"
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
	$("#plot_wrapper").append("<div class='well well-small'><div class='plot' id='plot"+num+"' style='height:350px;width:900px;'></div></div>");
	options = new plot_options(tables.displays[active.displays].definition[num].title,tables.displays[active.displays].definition[num].xaxislabel,tables.displays[active.displays].definition[num].yaxislabel,tables.displays[active.displays].definition[num].ymin,tables.displays[active.displays].definition[num].ymax);
	plot[num] = $.jqplot("plot"+num,nulldata,options);
}

function setConfig(num){
    active.displays = num;
    $(".well .plot").parent('.well').remove();
    $.each(tables.displays[num].definition, function(k,v){
        makePlot(k);
    });
}

function onRunStart() {
    rem_time = Math.ceil(run.end - run.now)/1000;
    timer = setInterval(updateTimer,1000);
    toggleDisabled("startNewRun",0);
    toggleDisabled("stopRun",1);
    for(var i=0; i<run_inputs.length; i++)
        toggleDisabled(run_inputs[i],0);
}

function onRunEnd() {
    clearInterval(timer);
    rem_time = 0;
    updateTimer();
    toggleDisabled("startNewRun",1);
    toggleDisabled("stopRun",0);
    for(var i=0; i<run_inputs.length; i++)
        toggleDisabled(run_inputs[i],1);
}

function convertTime(timestamp){
    return timestamp/1000;
}

function convertData(data,type){
    var x = data;
    return eval(tables.conversions[type].equation);
}

function updatePlots() {
    //need to make it so that if signals are removed from signal_list, they are removed from series data
    $.each(tables.displays[active.displays].definition, function(k,v){
        $.each(v["signal_list"], function(i,l){
            if(typeof data_converted[l] != "undefined"){
                plot[k].series[i].data = data_converted[l];
            }
        });
        plot[k].axes.xaxis.min = (recent_time - v["timespan"])*1000;            
        plot[k].axes.xaxis.max = recent_time*1000;
        plot[k].destroy();
        plot[k].replot();
    });
}

function makeDisplayValues(){
    $("#textdisplay_values").html("");
    $.each(tables.inputs, function(k,v) {
        if(tables.inputs[k].active > 0) {
            var str = "<div class='row-fluid force-fluid' style='font-size:1.2em'><div class='span7 force-fluid'>"+tables.inputs[k].name+"</div><div id='signal"+k+"_val' class='span4 text-right force-fluid' style='font-weight:bold'></div><div class='span1 force-fluid'>"+tables.conversions[tables.inputs[k].type].units+"</div></div>";
            $("#textdisplay_values").append(str);
        }
    })
}

function updateDisplayValues(arr) {
    $.each(tables.inputs, function(k,v){
        $("#signal"+k+"_val").html(parseFloat(arr[k]).toFixed(2));
    });
}

function updateDisplayStates(data) {
    $.each(data, function(k,v) {
        $("#control_"+k).html(tables.controls[v].title);
        console.log(k+" "+v);
    });
}

function updatePlot(){
    var plot_num = $("#plotlistingcontainer").find(".active").html();
    var attributes = ["title","xaxislabel","yaxislabel","timespan","ymin","ymax"];
    var signal_list = [];
    $("#signallisting").find(".active").each(function(){
        signal_list.push($(this).html());
    })
    if( plot_num == "+" ){
        plot_num = countObject(config[active.displays].definition)+1;
        config[active.displays].definition[plot_num] = {};

    }
    for(var i=0; i < attributes.length; i++)
        config[active.displays].definition[plot_num][attributes[i]] = $("#"+attributes[i]).val();
    updateConfig(active.displays);
    $("#plot_wrapper").empty();
    setConfig(active.displays);
    onHideEditPlots();
    onShowEditPlots();
}

function toggleDisabled(elem_id,force) {
    if($("#"+elem_id).hasClass("disabled")){
        if(typeof force === 'undefined' || force == true ){ 
            $("#"+elem_id).removeClass("disabled");
        }
    }
    else{
        if(typeof force === 'undefined' || force == false ){
            $("#"+elem_id).addClass("disabled");
        }
    }
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
