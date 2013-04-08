// STORY: On connecting to server, server returns an object.
// This object contains the contents of each of the config tables, in full

$(document).ready(function(){
   //$('.selectpicker').selectpicker('render');

})

var socket = io.connect('http://cc.acrudge.com');
var tables, active, active_outputs = [], active_inputs = [];

socket.on('loadAllInfo', function(data) {
	console.log('Tables Received');
	tables = data.tables;
	active = data.active;
	console.log('Filling Converions');
	$.each(tables.conversions, function(k,v){
		$('[id$="conversion"]').append($('<option />').val(v.id).text(v.name));
		$.each(tables.conversions, function(k,v){
			addConversionRow();
		})
	});
	console.log('Filling Inputs');
	$.each(tables.inputs, function(k,v){
		$('#input_'+v.id+'_name').val(v.name);
		$('#input_'+v.id+'_active').parent('div').bootstrapSwitch('setState',v.active);
		$('#input_'+v.id+'_conversion').val(v.type);
		active_inputs.push(v.active);
	});
	console.log('Filling Outputs');
	$.each(tables.outputs, function(k,v){
		$('#output_'+v.id+'_name').val(v.name);
		$('#output_'+v.id+'_active').parent('div').bootstrapSwitch('setState',v.active)
		active_outputs.push(v.active);
		//controls box stuff
	})   
	console.log('Filling Controls');
	$.each(tables.controls, function(k,v){
		$('#control_config_select').append($('<option />').val(v.id).text(v.title));
	})
	$.each(tables.controls[active.controls-1].definition, function(k,v){
		addControlRow(k, v, active_outputs, active_inputs);
	})
	$('.selectpicker').selectpicker('render');
	$('.tooltipped').tooltip();

})

socket.on('db_return', function (data) {
    var buff = {};
    $.each(data.rows, function(k,v) { buff[v.id] = v; })
    eval(data.table+"=buff;");
    //eval('console.log('+data.table+')');
});

socket.on('reading', function (data) {
	//console.log(data);
});

socket.on('running', function (data) {
  	//addText("Running: "+data.number+", End: "+data.end);
	//showStatus(data.number);
});	

$(document).ready(function(){
   $('.selectpicker').selectpicker('render');

})

function addControlRow(id, def, activeout, activein){
	// id, definition[id], active outputs
	// definition[id] -> {name, min, max, values, read_pin, read_value, operator}
	id = id || 1;
	activein = activein instanceof Array ? activein : [0,0,0,0,0,0,0,0];
	activeout = activeout instanceof Array ? activeout : [0,0,0,0,0,0,0,0];
	def = {
			name:       typeof(def.name)       === "undefined" ? '' : def.name,
			min:        typeof(def.min)        === "undefined" ? 0  : def.min,
			max:        typeof(def.max)        === "undefined" ? 0  : def.max,
			values:     typeof(def.values)     === "undefined" ? [0,0,0,0,0,0,0,0] : def.values, 
			read_pin:   typeof(def.read_pin)   === "undefined" || activein[def.read_pin-1] != 1 ? 0  : def.read_pin,
			read_value: typeof(def.read_value) === "undefined" ? 0  : def.read_value,
			operator:   typeof(def.operator)   === "undefined" ? '<': '>'
		};
	// if script should check to make sure that control pins are active (assumes control configuration linked to output configuration);
	//for(var i = 0; i<def.values.length;i++)
	//	def.values[i] = activeout[i] ? def.values[i] : 0;
	var s = $.sprintf('<div class="row-fluid"><div class="span1 text-center">%s</div><div class="span3"><input type="text" value="%s"></div><div class="span3 row-fluid">', id, def.name);
	for(var i = 1; i<=8; i++)
		s += $.sprintf('<div class="span_8_1 tooltipped" data-toggle="tooltip" data-original-title="%s"><button class="btn btn-switch %s" data-toggle="button" %s>%s</button></div>',tables.outputs[i-1].name, def.values[i-1] && activeout[i-1] ? 'active' : '', activeout[i-1] ? '' : 'disabled', i)
	s += $.sprintf('</div><div class="span3"><select class="selectpicker span5" id="control_%s_read_pin">',id);
	s += $.sprintf('<option value="0" %s>None</option>', def.read_pin == 0 ? 'selected' : '');
	for(var i = 1; i<=16; i++)
		s += $.sprintf('<option %s value="%s" %s>input %s</option>', activein[i-1] ? '' : 'disabled', i, i==def.read_pin ? 'selected' : '',i);
	s += $.sprintf('</select class="selectpicker"><select %s class="selectpicker span3" id="control_%s_operator"><option %s value="<"><</option><option %s value=">">></option></select> <input %s class="span4" type="text" id="control_%s_read_value" value="%s"></div><div class="span1"><input type="text" id="control_%s_min">%s</div><div class="span1"><input type="text" id="control_%s_max">%s</div></div>', def.read_pin ? '' : 'disabled', id, def.operator == '<' ? 'selected' : '', def.operator == '>' ? 'selected' : '', def.read_pin ? '' : 'disabled', id, def.read_value, def.min, def.max);
	$('#controls-list').append(s);
}

function addConversionRow(conv){
	//conv ={id,name,equation,units}
}