// STORY: On connecting to server, server returns an object.
// This object contains the contents of each of the config run, in full
var socket = io.connect('/');

socket.on('return_runs', function(data) {
    console.log(data);
    for(var k in data) {
        console.log(data[k]);
        $("#select_run").append($('<option/>', {value: data[k].id, text: data[k].title+" ("+data[k].starttime.replace("T"," ").replace(".000Z","")+")"}));
    }
});

$(document).ready(function(){
    socket.emit('get_runs','1');
    $("#select_run").on('change', changeButtons);
    $("#download_data").on('click', downloadData);
    $("#view_data").on('click', viewData);
});

function downloadData() {
    if(!$(this).hasClass('disabled'))
        window.location.replace('/runs/'+$("#select_run").val()+".csv");
}
function viewData() {
    socket.emit('view_request', {num: $("#select_run").val()});
}

function changeButtons() {
    if($(this).val() > 0)
        $(".data_see").removeClass('disabled');
    else
        $(".data_see").addClass('disabled');
}








var   run = {}
    , plot = []
    , data_converted = []
    , pcolors = [ "#000000", "#827800", "#CC9966", "#33FF33", "#FF3333", "#990066", "#666666", "#FFFF33", "#993300", "#009900", "#FF6600"];

//[ "#4bb2c5", "#c5b47f", "#EAA228", "#579575", "#839557", "#958c12", "#953579", "#4b5de4", "#d8b83f", "#ff5800", "#0085cc"];

socket.on('view_data', function(data){
    console.log(data);
    run = data.runinfo[0];
    //data = {runinfo: from run table, readings: duhh...};
    $.each(run, function(k,v){
        try{
            run[k] = JSON.parse(v);
        } 
        catch(e) {
            console.log('hi');
        }

    });
    run.active_inputs = [];
    $.each(run.inputs, function(k,v){
        if(v.active)
            run.active_inputs.push(v.id);
    })
    getData(data.readings);
})

function getData(data){
    console.log(data)
    $.each(run.active_inputs, function(j,k){
        data_converted[k] = [];
    });
    $.each(data, function(i,v){
        $.each(run.active_inputs, function(j,k){
            data_converted[k].push([v.timestamp, convertData(v['r'+k], run.inputs[k].type)]);
        });
    });
    setConfig();
}

function convertTime(data) {
    return (data+'')/1000;
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
    this.cursor = { 
        show: true,
        zoom:true, 
        showTooltip:false
      } 
}

function makePlot(num,labels,colors) {
    var databuff = [];
    $("#plot_wrapper").append("<div class='well well-small'><div class='plot' id='plot"+num+"' style='height:350px;width:900px;'></div></div>");
    options = new plot_options(run.displays.definition[num].title,run.displays.definition[num].xaxislabel,run.displays.definition[num].yaxislabel,run.displays.definition[num].ymin,run.displays.definition[num].ymax,labels,colors);
    $.each(run.displays.definition[num].signal_list, function(i,l){
        if(typeof data_converted[l] != "undefined"){
            databuff.push(data_converted[l]);
        }
    });
    plot[num] = $.jqplot("plot"+num,databuff,options);
}

function setConfig() {
    $(".well .plot").parent('.well').remove();
    $.each(run.displays.definition, function(k,v){
        var labels = [];
        var colors = [];
        for(var i=0; i < v.signal_list.length; i++) {
            labels.push(run.inputs[v.signal_list[i]].name);
            colors.push(pcolors[v.signal_list[i]-1]);
        }
        makePlot(k,labels,colors);
    });
}

function convertData(data,type){
    var x = parseInt(data);
    return eval("with (Math) { "+run.conversions[type].equation+"; }");
}

function updatePlots() {
    //need to make it so that if signals are removed from signal_list, they are removed from series data
    $.each(run.displays.definition, function(k,v){
        $.each(v["signal_list"], function(i,l){
            if(typeof data_converted[l] != "undefined"){
                plot[k].series[i].data = data_converted[l];
            }
        });
        plot[k].destroy();
        plot[k].replot();
    });
}