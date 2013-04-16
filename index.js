// STORY: On connecting to server, server returns an object.
// This object contains the contents of each of the config tables, in full
var socket = io.connect('/');
var tables, active, active_outputs = [], active_inputs = [];

$(document).ready(function(){
	$("#loadingscreen").modal({backdrop: true, keyboard: false, show: false});

	$("button[id^='savechanges']").on('click', function(){
		var sc = $(this).attr('id').split('_');
		loadWrap('saving '+sc[1], 1, updateTable, sc[1]);
	});
	$("button[id$='delete']").on('click', function(){
		var sc = $(this).attr('id').split('_');
		console.log('hi');
		$('#row_'+sc[0]+'_'+sc[1]).remove();
	})
});

socket.on('loadAllInfo', function(data) {
	console.log('Tables Received');
	tables = data.tables;
	active = data.active;
	loadWrap('Loading Info...', fillAllInfo);
})

socket.on('db_return', function (data) {
    var buff = {};
    $.each(data.rows, function(k,v) { buff[v.id] = v; })
    eval(data.table+"=buff;");
    //eval('console.log('+data.table+')');
});

function loadWrap(loadtext, wait, fun, a){
	if(typeof loadtext != "string" && typeof loadtext != "number"){
		fun = loadtext;
		a = wait;
		loadtext = 'Loading...';
		wait = 0;
	}
	if(typeof wait != "number"){
		a = fun;
		fun = wait;
		wait = 0;
	}
	console.log([loadtext, wait, fun, a]);
	$("#loadtext").html(loadtext);
	$("#loadingscreen").modal('show');
	fun(a);
	if(!wait)
		$("#loadingscreen").modal('hide');
}

function fillAllInfo(){
	$('#list-controls').empty();
	$('#list-conversions').empty();
	$('select[id$="type"]').empty();
	active_inputs = [];
	active_outputs = [];

	console.log('Filling Converions');
	var convs = [];
	$.each(tables.conversions, function(k,v){
		convs.push($('<option />').val(v.id).text(v.name));
		addConversionRow(v);
	});
	$('select[id$="type"]').append(convs);

	console.log('Filling Inputs');
	$.each(tables.inputs, function(k,v){
		$('#input_'+v.id+'_name').val(v.name);
		$('#input_'+v.id+'_active').bootstrapSwitch('setState',v.active);
		$('#input_'+v.id+'_type').val(v.type);
		active_inputs.push(v.active);
	});

	console.log('Filling Outputs');
	$.each(tables.outputs, function(k,v){
		$('#output_'+v.id+'_name').val(v.name);
		$('#output_'+v.id+'_active').bootstrapSwitch('setState',v.active);
		active_outputs.push(v.active);
		//controls box stuff
	})   

	console.log('Filling Controls');
	var configs = [];
	$.each(tables.controls, function(k,v){
		configs.push($('<option />').attr('title',v.id).text(v.title));
	})
$('#control_config_select').append(configs);
	$.each(tables.controls[active.controls].definition, function(k,v){
		addControlRow(k, v, active_outputs, active_inputs);
	})
	$('.tooltipped').tooltip();
}

function addControlRow(id, def){
	// id, definition[id], active outputs
	// definition[id] -> {name, min, max, values, read_pin, read_value, operator}
	id = id || 1;
	def = {
			name:       typeof(def.name)       === "undefined" ? '' : def.name,
			min:        typeof(def.min)        === "undefined" ? 0  : def.min,
			max:        typeof(def.max)        === "undefined" ? 0  : def.max,
			values:     typeof(def.values)     === "undefined" ? [0,0,0,0,0,0,0,0] : def.values, 
			read_pin:   typeof(def.read_pin)   === "undefined" || active_inputs[def.read_pin-1] != 1 ? 0  : def.read_pin,
			read_value: typeof(def.read_value) === "undefined" ? 0  : def.read_value,
			operator:   typeof(def.operator)   === "undefined" ? '<': '>'
		};
	// if script should check to make sure that control pins are active (assumes control configuration linked to output configuration);
	var s = $.sprintf('<div class="row-fluid" id="row_control_%s"><div class="span1 text-center">%s</div><div class="span2"><input type="text" value="%s"></div><div class="span3 row-fluid">', id, id, def.name);
	for(var i = 1; i<=8; i++)
		s += $.sprintf('<div class="span_8_1 tooltipped" data-toggle="tooltip" data-original-title="%s"><button class="btn btn-switch %s" data-toggle="button" %s>%s</button></div>',tables.outputs[i].name, def.values[i] && active_outputs[i-1] ? 'active' : '', active_outputs[i-1] ? '' : 'disabled', i)
	s += $.sprintf('</div><div class="span3"><select class="selectpicker show-tick dropup span5" id="control_%s_read_pin">',id);
	s += $.sprintf('<option value="0" %s>None</option>', def.read_pin == 0 ? 'selected' : '');
	for(var i = 1; i<=16; i++)
		s += $.sprintf('<option %s value="%s" %s>(%s) %s</option>', active_inputs[i-1] ? '' : 'disabled', i, i==def.read_pin ? 'selected' : '', i, tables.inputs[i].name)	;
	s += $.sprintf('</select><select %s class="selectpicker show-tick dropup span3" id="control_%s_operator"><option %s value="<"><</option><option %s value=">">></option></select> <input %s class="span4" type="text" id="control_%s_read_value" value="%s"></div><div class="span1"><input type="number" id="control_%s_min" value="%s"></div><div class="span1"><input type="number" id="control_%s_max" value="%s"></div>', def.read_pin ? '' : 'disabled', id, def.operator == '<' ? 'selected' : '', def.operator == '>' ? 'selected' : '', def.read_pin ? '' : 'disabled', id, def.read_value, id, def.min, id, def.max);
	s += $.sprintf('<button class="btn span1 btn-danger" id="control_%s_delete">delete</button></div>',id);
	$('#list-controls').append(s);
}

function addConversionRow(conv){
	//conv ={id,name,equation,units}
	var s = $.sprintf('<div class="row-fluid text-center" id="row_conversion_%s"><div class="span2"><input id="conversion_%s_name" type="text" value="%s"></div><div class="span8"><input id="conversion_%s_equation" type="text" value="%s"></div><div class="span1"><input id="conversion_%s_units" type="text" value="%s"></div><div class="span1"><button class="btn btn-block btn-danger" id="conversion_%s_delete">delete</button></div></div>',conv.id,conv.id,conv.name,conv.id,conv.equation,conv.id,conv.units,conv.id);
	$('#list-conversions').append(s);
}

function updateTable(table){
	var temp_table = {};
	$.each($('[id^='+table.substring(0,table.length-1)+']'), function(k,v){
		var iande = $(this).attr('id').split('_');
		if(typeof temp_table[iande[1]] === 'undefined')
			temp_table[iande[1]] = {};
		temp_table[iande[1]].id = parseInt(iande[1]);
		switch(iande[2]){
			case 'delete':
				break;
			case 'active':
				temp_table[iande[1]][iande[2]] = $(this).parent('div').bootstrapSwitch('status') ? 1 : 0;
				break;
			case 'output':
				if(typeof temp_table[iande[1]][iande[2]] === 'undefined')
					temp_table[iande[1]][iande[2]] = [];
				temp_table[iande[1]][iande[2]][iande[4]] = $(this).hasClass('active') ? 1 : 0;
				break;
			case 'type':
			case 'operator':
			case 'read_pin': //need to fix _ issue here...
				temp_table[iande[1]][iande[2]] = temp_table[iande[1]][iande[2]] ? temp_table[iande[1]][iande[2]] : parseInt($(this).val());
				break;
			default:
				temp_table[iande[1]][iande[2]] = $(this).val();
		}
	})
	if(table != 'controls') {
		console.log({loc: temp_table, ref: tables[table], res: tableCompare(temp_table, tables[table], table)});
		if (tableCompare(temp_table, tables[table], table).length){
			socket.emit('db_update', tableCompare(temp_table, tables[table], table));	
			console.log('update me!!!');
		}
		else
			$('#loadingscreen').modal('hide');
	}
	else
		console.log(tableCompare(temp_table, tables.controls[$('#controls_config_select').val()].definition, table));
}

function tableCompare(loc, ref, table_name){
	var result = [];
	for(var p in loc){
		if(typeof(ref[p]) === 'undefined'){
			result.push({operation: 'insert', table: table_name, index: parseInt(loc[p].id), params: loc[p]});
			continue;
		}
		else if(JSON.stringify(loc[p]) != JSON.stringify(ref[p]))
			result.push({operation: 'update', table: table_name, index: parseInt(loc[p].id), params: loc[p]});
	}
	for (var p in ref){
		if(typeof(loc[p]) === 'undefined')
			result.push({operation: 'delete', table: table_name, index: parseInt(ref[p].id)});
	}
	return result;
}