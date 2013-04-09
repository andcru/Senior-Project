    var recent_time = 0;
    var data_converted = [];
    var config = {};
    var signals = {};
    var conversions = {};
    var plot = [];
    var nulldata = [[null],[null],[null],[null],[null],[null],[null],[null]];

    function plot_options(title,xlabel,ylabel,ymin,ymax){
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
                numberTicks: 3,
                label: ylabel,
                labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
                labelOptions: {
                    show: true
                },
                min: ymin,
                max: ymax
            }
        };
        this.seriesDefaults = {
            showMarker: false
        };
    }

    var options_old ={
        title: {
            text: "New Plot",
            show: true
        },
        axes:{
            xaxis: {
                renderer: $.jqplot.DateAxisRenderer,
                numberTicks: 4,
                tickOptions: {
                    formatString: "%I:%M:%S.%N"
                },
                label: "xlabel",
                labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
                labelOptions: {
                    show: true
                }
            },
            yaxis: {
                numberTicks: 3,
                label: "ylabel",
                labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
                labelOptions: {
                    show: true
                }
            }
        },
        seriesDefaults: {
            showMarker: false
        }
    }

    function doStuff(){
        getInputs();
        getConversions();
        getConfigs();
    }

    function getConversions(){
        //conversions are indexed by signal type
        console.log("start: getConversions");
        $.ajax({
            url: '/data/conversions.php',
            dataType: 'json',
            success: function(vals){
                $.each(vals,function(k,v){
                    conversions[k] = {name: v["name"], equation: v["equation"]};
                })  
                console.log("finish: getConversions");
            }
        })
    }

        //$.getJSON('/data/conversions.php',function(vals){
        //    $.each(vals,function(k,v){
        //        conversions[k] = {name: v["name"], equation: v["equation"]};
        //    })
        //})

    function getInputs(){
        console.log("start: getInputs");
        $.ajax({
            url: '/data/measurements.php',
            dataType: 'json',
            success: function(vals) {
                signals = {};
                $.each(vals,function(k,v){
                    signals[k] = {name: v["name"], type: v["type"]};
                    data_converted[k] = [];
                })
                console.log("finish: getInputs");

            }
        })
    }

    function getConfigs(){
        console.log("start: getConfigs");
        $.ajax({
            url: '/data/configs.php',
            dataType: 'json',
            success: function(vals){
                $.each(vals,function(k,v){
                    config[k] = {name: v["name"], plots: v["vars"]};
                })
                console.log("finish: getConfigs");
            }
        })
    }

    function setConfig(num){
        active_config = num;
        $(".plot").remove();
        $.each(config[num].plots, function(k,v){
            makePlot(k);
        });
    }

    function updateConfig(num){
        $.ajax({
            type: "POST",
            url: "data/config-u.php",
            data:   {
                id: num,
                name: config[num].name,
                vars: config[num].plots
            }
        }).fail(function(msg){
            alert("There was an issue processing your request");
        })
    }

    function createConfig(name){
        $.ajax({
            type: "POST",
            url: "data/config-u.php",
            data: {
                name: name,
                vars: ""
            }
        }).done(function(){
            getConfigs();
        })
    }

    function getData(){
        console.log("start: getData");
        $.getJSON('/data/reading.php',function(vals) {
            if(vals["timestamp"] != recent_time){
                recent_time = vals["timestamp"];
                var time = convertTime(vals["timestamp"]);
                $.each(signals, function(k,v){
                    var holder = data_converted[k];
                    holder.push([time, convertData(vals["r"+k], signals[k].type)]);
                    data_converted[k] = holder;
                })
                updatePlots();
            }
            console.log("finish: getData");
        })
    }

    function convertTime(timestamp){
        return timestamp*1000;
    }

    function convertData(data,type){
        var x = data;
        return eval(conversions[type].equation);
    }

    function makePlot(num){
        $("body").append("<div class='plot' id='plot"+num+"' style='height:300px;width:600px;'></div>");
        options = new plot_options(config[active_config].plots[num].title,config[active_config].plots[num].xaxislabel,config[active_config].plots[num].yaxislabel,config[active_config].plots[num].ymin,config[active_config].plots[num].ymax);
        console.log(options);
        plot[num] = $.jqplot("plot"+num,nulldata,options);
    }

    function updatePlots(){
        //need to make it so that if signals are removed from signal_list, they are removed from series data
        $.each(config[active_config].plots, function(k,v){
            $.each(v["signal_list"], function(i,l){
                plot[k].series[i].data = data_converted[l];
            });
            plot[k].axes.xaxis.min = (recent_time - v["timespan"])*1000;            
            plot[k].axes.xaxis.max = recent_time*1000;
            plot[k].replot();
        })
    }


    $(document).ready(function(){
        $.ajaxSetup({
            async: false
        })

        getInputs();
        getConversions();
        getConfigs();
        setConfig(1);
        getData();

        $.ajaxSetup({
            async: true
        })
        
        fetch_data = setInterval('getData()',1000);
    })