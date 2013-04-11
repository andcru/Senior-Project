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
    , pause = 0
    , run_inputs = ["name","rate","duration"]
    , disp_vals = ["title","xaxislabel","yaxislabel","ymin","ymax","timespan"]
    , pcolors = [ "#000000", "#827800", "#CC9966", "#33FF33", "#FF3333", "#990066", "#666666", "#FFFF33", "#993300", "#009900", "#FF6600"];

//[ "#4bb2c5", "#c5b47f", "#EAA228", "#579575", "#839557", "#958c12", "#953579", "#4b5de4", "#d8b83f", "#ff5800", "#0085cc"];

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
    $('#plot_editor').modal('hide');
    setTimeout(function() {
        $("#update_plot").button('reset');
    },1000);
    pause = 0;
});

$(document).ready(function(){
    $(".run_control").click(doRun);
    no_run_text = $("#time_remain").html();
    $("#update_plot").click(updatePlot);
    $("#delete_plot").click(deletePlot);
    $("#new_config").click(newConfig);
    $("#delete_config").click(deleteConfig);
    $("#new_plot").click(newPlot);
    $("#display_scheme").change(switchScheme);
    $("#loadingscreen").modal('hide');
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

function deleteConfig() {
    if(Object.keys(tables.displays).length <= 1)
        alert('You cannot delete your only configuration!');
    else if(confirm("Are you sure you want to delete this configuration?")) {
        var id = $("#display_scheme").val();
        res = [{operation: "delete", table: "displays", index: id}];
        active.displays = 1;
        socket.emit('active_change', active);
        socket.emit('db_update', res);
        pause = 1;
    }
}

function switchScheme() {
    active.displays = parseInt($(this).val());
    var outs = JSON.parse(JSON.stringify(active));
    outs.refresh = "1";
    socket.emit('active_change', outs);
}

function newPlot() {
    $("form").find('input').each(function(k,v) {
        $(v).val("");
    });
}

function newConfig() {
    var name = window.prompt("Please enter the new configuration name");
    if (name != null && name != "") {
        var outs = [];
        active.displays = max_disp_conf + 1;
        outs[0] = {operation: "insert", table: "displays"};
        outs[0].params = {name: name, id: active.displays, definition: "{}" };
        pause = 1;
        socket.emit('active_change',active);
        socket.emit('db_update',outs);
    }
}

function loadStates() {
    $('option', $("#display_scheme")).remove();
    for(var k in tables.displays)
        $("#display_scheme").append($('<option/>', {value: tables.displays[k].id, text: tables.displays[k].name}));
    max_disp_conf = tables.displays[k].id;
    $("#display_scheme").val(active.displays);
}

function updatePlot() {
    var num = $("#editplotnum").text();
    $(this).button('loading');
    var buff = {};
    buff.signal_list = [];
    $("form").find('input').each(function(k,v) {
        buff[$(v).attr('id')] = $(v).val();
    });
    $('#signalselect').children(':selected').each(function(k,v) {
        buff.signal_list.push($(v).val());
    });
    tables.displays[active.displays].definition[num] = buff;
    updateTable("displays","update");
}

function deletePlot() {
    if(!$(this).hasClass('disabled')) {
        var num = $("#editplotnum").text();
        delete tables.displays[active.displays].definition[num];
        updateTable("displays","delete");
    }
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
    if(pause == 0) {
        updatePlots();
        updateDisplayValues(actvals);
    }
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

function plot_options(title,xlabel,ylabel,ymin,ymax,labels,colors) {
    this.title = {
        text: title,
        show: true
    };
    this.seriesColors = colors;
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
    this.legend = {
        renderer: $.jqplot.EnhancedLegendRenderer,
        show: true,
        placement: 'outsideGrid',
        labels: labels,
        rendererOptions: {
            numberColumns: 1
        }
    };
    this.seriesDefaults = {
        showMarker: false
    };
}

function makePlot(num,labels,colors) {
    var nd = []; nd.push(null);
    var nulldata = [];
    for(var i=0;i<labels.length;i++)
        nulldata.push(nd);
    $("#plot_wrapper").append("<div class='well well-small'><a class='no_hover' href='#plot_editor' num='"+num+"' data-toggle='modal'><i class='icon-cog pull-right' style='font-size: 30px; color: darkgray;'></i></a><div class='plot' id='plot"+num+"' style='height:350px;width:900px;'></div></div>");
    options = new plot_options(tables.displays[active.displays].definition[num].title,tables.displays[active.displays].definition[num].xaxislabel,tables.displays[active.displays].definition[num].yaxislabel,tables.displays[active.displays].definition[num].ymin,tables.displays[active.displays].definition[num].ymax,labels,colors);
//    if(arr.length > 8) 
//        options.legend.rendererOptions.numberColumns = 2;
    plot[num] = $.jqplot("plot"+num,nulldata,options);
}

function setConfig(num) {
    active.displays = num;
    $(".well .plot").parent('.well').remove();
    $.each(tables.displays[num].definition, function(k,v){
        var labels = [];
        var colors = [];
        for(var i=0; i < v.signal_list.length; i++) {
            labels.push(tables.inputs[v.signal_list[i]].name);
            colors.push(pcolors[v.signal_list[i]-1]);
        }
        makePlot(k,labels,colors);
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
            if(typeof(plot) !== 'undefined') {
                $("#delete_plot").removeClass('disabled');
                if($.inArray(k, plot.signal_list) >= 0)
                    $("#signalselect").append($('<option/>', {value: tables.inputs[k].id, text: tables.inputs[k].name, selected: "1"}));
                else
                    $("#signalselect").append($('<option/>', {value: tables.inputs[k].id, text: tables.inputs[k].name}));
            }
            else {
                $("#signalselect").append($('<option/>', {value: tables.inputs[k].id, text: tables.inputs[k].name}));
                $("#delete_plot").addClass('disabled');
            }
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
    return eval("with (Math) { "+tables.conversions[type].equation+"; }");
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
        if(v.active > 0 && typeof(data_converted[k]) == "undefined")
            data_converted[k] = [];
    });
    console.log("finish: getInputs");
}

function updateTable(table,action){
    if(action == "delete") {
        var j=1, temp_table = {};
        for(var k in tables.displays[active.displays].definition)
            if(tables.displays[active.displays].definition.hasOwnProperty(k))
                temp_table[j++] = tables.displays[active.displays].definition[k];
        tables.displays[active.displays].definition = temp_table;
    }
    res = [{operation: "update", table: table, index: active.displays, params: {definition: JSON.stringify(tables.displays[active.displays].definition)}}];
    socket.emit('db_update', res);
    pause = 1;
}