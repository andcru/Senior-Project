// STORY: On connecting to server, server returns an object.
// This object contains the contents of each of the config tables, in full
var socket = io.connect('http://cc.acrudge.com');

var   recent_time
    , run = {}
    , timer
    , rem_time
    , active = {}
    , plot = []
    , tables = {}
    , data_converted = []
    , data_len_max = 500
    , def_samp_rate = 1000
    , no_run_text
    , max_disp_config = 0
    , nulldata = [[null],[null],[null],[null],[null],[null],[null],[null]]
    , run_inputs = ["name","rate","duration"];

socket.on('reading', function(data) {
    getData(data);
});

socket.on('state_change', function(data) {
    updateDisplayStates(data);
});

socket.on('new_csv', function(data) {
    console.log(data);
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
    loadStates();
    setConfig(active.displays);
    makeDisplayValues();
});

$(document).ready(function(){
    $(".run_control").click(doRun);
    no_run_text = $("#time_remain").html();
    $("#update_plot").click(updatePlot);
    $("#new_config").click(newConfig);
    $("#new_plot").click(newPlot);
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

function newPlot() {

}

function newConfig() {
    var name = window.prompt("Please enter the new configuration name");
    if (name != null && name != "") {
        var outs = [];
        var def = {};
        outs[0] = {operation: "insert", table: "displays"};
        outs[0].params = {name: name, definition: JSON.stringify(def) };
        console.log(outs);
        active.displays = max_disp_conf + 1;
        socket.emit('db_update',outs);
        socket.emit('active_change', active);
        window.location.reload();
    }
}

function loadStates() {
    for(var k in tables.displays)
        $("#display_scheme").append($('<option/>', {value: tables.displays[k].id, text: tables.displays[k].name}));
    max_disp_conf = tables.displays[k].id;
    $("#display_scheme").val(active.displays);
}

function updatePlot() {
    var num = $("#editplotnum").text();
    var buff = {};
    buff.signal_list = [];
    $("form").find('input').each(function(k,v) {
        buff[$(v).attr('id')] = $(v).val();
    });
    $('#signalselect').children(':selected').each(function(k,v) {
        buff.signal_list.push($(v).val());
    });
    tables.displays[active.displays].definition[num] = buff;
    updateDisplayRecord();
}

function updateDisplayRecord() {
    var outs = {operation: "update", table: "displays"};
}

function getData(data){
    var vals = data.split(",");
    var time = vals.pop();
    var actvals = [];
    recent_time = convertTime(time);
    $.each(tables.inputs, function(k,v) {
        if(v.active > 0) {
            var holder = data_converted[k];
            if( holder.length == data_len_max )
                holder.shift();   
            holder.push([time, convertData(vals[k], v.type)]);
            data_converted[k] = holder;
            actvals[k] = vals[k];
        }
    });
    updatePlots();
    updateDisplayValues(actvals);
}

function updateTimer() {
    var tr;
    if(run.run > 0) {
        if(rem_time <= 0) {
            rem_time = 0;
            clearInterval(timer);
        }
        var hr = Math.floor(rem_time/60/60);
        var mi = Math.floor(rem_time/60 - hr*60);
        var se = Math.floor(rem_time-hr*60*60-mi*60);
        tr = hr+":"+pad(mi.toString(),2)+":"+pad(se.toString(),2);
        rem_time--;
    }
    else {
        tr = no_run_text;
        clearInterval(timer);
    }
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
    $("#plot_wrapper").append("<div class='well well-small'><a class='no_hover' href='#plot_editor' num='"+num+"' data-toggle='modal'><i class='icon-cog pull-right' style='font-size: 30px; color: darkgray;'></i></a><div class='plot' id='plot"+num+"' style='height:350px;width:900px;'></div></div>");
    options = new plot_options(tables.displays[active.displays].definition[num].title,tables.displays[active.displays].definition[num].xaxislabel,tables.displays[active.displays].definition[num].yaxislabel,tables.displays[active.displays].definition[num].ymin,tables.displays[active.displays].definition[num].ymax);
    plot[num] = $.jqplot("plot"+num,nulldata,options);
}

function setConfig(num){
    active.displays = num;
    $(".well .plot").parent('.well').remove();
    $.each(tables.displays[num].definition, function(k,v){
        makePlot(k);
    });
    $("#add_plot_link").attr('num',Object.keys(tables.displays[active.displays].definition).length+1);
    $("a[href='#plot_editor']").click(function() {
        getEditPlotVals($(this).attr('num'));
    });
}

function getEditPlotVals(num) {
    var plot = tables.displays[active.displays].definition[num];
    $("#editplotnum").html(num);
    for(var k in plot)
        $("#"+k).val(plot[k]);
    $('option', $("#signalselect")).remove();
    for(var k in tables.inputs)
        if(tables.inputs[k].active > 0) {
            console.log(k+" - "+plot.signal_list+" - "+$.inArray(k, plot.signal_list));
            if($.inArray(k, plot.signal_list) >= 0)
                $("#signalselect").append($('<option/>', {value: tables.inputs[k].id, text: tables.inputs[k].name, selected: "1"}));
            else
                $("#signalselect").append($('<option/>', {value: tables.inputs[k].id, text: tables.inputs[k].name}));
        }

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
    run = {};
    rem_time = 0;
    updateTimer();
    sr = def_samp_rate;
    toggleDisabled("startNewRun",1);
    toggleDisabled("stopRun",0);
    for(var i=0; i<run_inputs.length; i++)
        toggleDisabled(run_inputs[i],1);
    $('span[id^="control_"]').html("");
}

function convertTime(timestamp){
    return timestamp/1000;
}

function convertData(data,type){
    var x = parseInt(data);
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
        $("#signal"+k+"_val").html(convertData(arr[k],v.type).toFixed(2));
    });
}

function updateDisplayStates(data) {
    $.each(data, function(k,v) {
        if(v > 0 && k != 'begin')
            $("#control_"+k).html(tables.controls[active.controls].definition[v].name);
    });
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

function getInputs() {
    console.log("start: getInputs");
    $.each(tables.inputs,function(k,v){
        if(!run.run && v.active > 0)
            data_converted[k] = [];
    });
    console.log("finish: getInputs");
}

function tableCompare(loc, ref, table_name){
    var result = [];
    for(var p in loc){
        if(!loc.hasOwnProperty(p))
            continue;
        if(typeof(ref[p]) === 'undefined'){
            result.push({operation: 'insert', table: table_name, index: parseInt(loc[p].id), params: loc[p]});
            continue;
        }
        else if(!objectCompare(loc[p], ref[p]))
            result.push({operation: 'update', table: table_name, index: parseInt(loc[p].id), params: loc[p]});
    }
    for (var p in ref){
        if(!ref.hasOwnProperty(p))
            continue;
        if(typeof(loc[p]) === 'undefined')
            result.push({operation: 'delete', table: table_name, index: parseInt(ref[p].id)});
    }
    return result;
}

function objectCompare(loc,ref){
    var p;
    loc = JSON.parse(JSON.stringify(loc));
    ref = JSON.parse(JSON.stringify(ref));
    p = null;

    for (p in loc) {
        if (typeof ref[p] === 'undefined') {
            return 'false';
        }
    }

    for (p in loc) {
        if (loc[p]) {
            switch (typeof loc[p]) {
                case 'object':
                    if (!objectCompare(loc[p], ref[p])) 
                        return false;
                    break;
                case 'function':
                    if (typeof ref[p] === 'undefined' || (p !== 'equals' && loc[p].toString() !== ref[p].toString())) 
                        return false;
                    break;
                default:
                    if (loc[p] !== ref[p]) 
                        return false;
            }
        } 
        else {
            if (ref[p]) 
                return false;
        }
    }

    for (p in ref) {
        if (typeof loc[p] === 'undefined')
            return false;
    }

    return true;
}