// STORY: On connecting to server, server returns an object.
// This object contains the contents of each of the config tables, in full
var socket = io.connect('http://cc.acrudge.com');
var tables, active, active_outputs = [], active_inputs = [];

$(document).ready(function(){
	$("#loadingscreen").modal({"backdrop": "static", "keyboard": false, "show": false});

	$("button[id^='savechanges']").on('click', function(){
		var sc = $(this).attr('id').split('_');
		loadWrap('saving '+sc[1], 1, updateTable, sc[1]);
	});
	$('#cs_select').on('change', function(){
		if(parseInt($(this).val()) == active.controls)
			$('#cs_activate').attr('disabled',true);
		else
			$('#cs_activate').attr('disabled',false);
	})
	$('#cs_activate').on('click', function(){
		loadWrap('setting active configuration', 1, activateCS);
	});
	$('#cs_delete').on('click', function(){
		if(confirm('Are you sure you want to delete this control scheme?'))
			loadWrap('deleting configuration', 1, deleteCS, parseInt($('#cs_select').val()));	
	});
	$('#cs_create').on('click', function(){
		var csname = prompt('Name the control scheme:', 'Test Name');
		if(csname != null)
			loadWrap('creating configuration', 1, createCS, csname);
	});
	$('#cs_rename').on('click', function(){
		var newname = prompt('Name', tables.controls[$('#cs_select').val()].title);
		if(newname != null && newname != tables.controls[$('#cs_select').val()].title)
			loadWrap('renaming configuration', 1, renameCS, newname);
	});
	$("#conversions-container").on('click', "button[id$='delete']", function(){
		var sc = $(this).attr('id').split('_')[1];
		if($(this).hasClass('btn-success')){
			$('#row_conversion_'+sc).removeClass('restorable-row').find(".restorable").removeClass('restorable').attr('disabled',false);
			$(this).removeClass('btn-success').addClass('btn-danger').text('delete');
		}
		else{
			$('#row_conversion_'+sc).addClass('restorable-row').find("input").attr('disabled',true).addClass('restorable');
			$(this).removeClass('btn-danger').addClass('btn-success').text('restore');
		}
	});
	$("#controls-container").on('click', "button[id$='delete']", function(){
		var sc = $(this).attr('id').split('_')[1];
		if($(this).hasClass('btn-success')){
			$('#row_control_'+sc).removeClass('restorable-row').find('.restorable').attr('disabled',false).removeClass('restorable');
			$(this).removeClass('btn-success').addClass('btn-danger').text('delete');
		}
		else{
			$('#row_control_'+sc).addClass('restorable-row').find("input:not(:disabled), select:not(:disabled), button:not([id$='delete']):not(:disabled)").addClass('restorable').attr('disabled','disabled');
			$(this).removeClass('btn-danger').addClass('btn-success').text('restore');
		}		
	})
	$("#new_conversion").on('click', function(){
		addConversionRow();
	});
	$("#new_controlstate").on('click', function(){
		addControlRow();
	});
	$("#controls-container").on('change','[id$="read_pin"]', function(){
		if($(this).val() == '0')
			$(this).siblings().attr('disabled', true);
		else
			$(this).siblings().attr('disabled', false);
	});
	$("#controlscheme_select").on('change', function(){
		fillControls(parseInt($(this).val()));
	});

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
	//console.log([loadtext, wait, fun, a]);
	$("#loadtext").html(loadtext);
	$("#loadingscreen").modal('show');
	fun(a);
	if(!wait)
		$("#loadingscreen").modal('hide');
}

function fillAllInfo(){
	console.log('Filling Converions');
	$('#list-conversions').empty();
	$('select[id$="type"]').empty();
	var convs = [];
	$.each(tables.conversions, function(k,v){
		convs.push($('<option />').val(v.id).text(v.name));
		addConversionRow(v);
	});
	$('select[id$="type"]').append(convs);

	console.log('Filling Inputs');
	active_inputs = [];
	$.each(tables.inputs, function(k,v){
		$('#input_'+v.id+'_name').val(v.name);
		$('#input_'+v.id+'_active').bootstrapSwitch('setState',v.active);
		$('#input_'+v.id+'_type').val(v.type);
		active_inputs.push(v.active);
	});

	console.log('Filling Outputs');
	active_outputs = [];
	$.each(tables.outputs, function(k,v){
		$('#output_'+v.id+'_name').val(v.name);
		$('#output_'+v.id+'_active').bootstrapSwitch('setState',v.active);
		active_outputs.push(v.active);
		//controls box stuff
	})   

	fillControls();

	$('.tooltipped').tooltip();
}

function fillControls(num){
	$('#list-controls').empty();
	$('#controlscheme_select').empty();
	$('#cs_select').empty();
	console.log('Filling Controls');
	var configs = [];
	$.each(tables.controls, function(k,v){
		configs.push($('<option />').val(v.id).text(v.title));
	})
	$('#controlscheme_select, #cs_select').append(configs);
	$('#cs_select').val(active.controls);
	if(typeof num != "undefined"){
		$.each(tables.controls[num].definition, function(k,v){
			addControlRow(k, v, active_outputs, active_inputs);
		});
		$('#controlscheme_select').val(num);
	}
	else{
		$.each(tables.controls[active.controls].definition, function(k,v){
			addControlRow(k, v, active_outputs, active_inputs);
		});
		$('#controlscheme_select').val(active.controls);
	}
}

function addControlRow(id, def){
	// id, definition[id], active outputs
	// definition[id] -> {name, min, max, values, read_pin, read_value, operator}
	id = id || nextControlRow();
	if(typeof(def)!="object"){def = {};}
	def = {
			name:       typeof(def.name)       === "undefined" 										 ? ''                 : def.name,
			min:        typeof(def.min)        === "undefined" 										 ? 0                  : def.min,
			max:        typeof(def.max)        === "undefined" 										 ? 1                  : def.max,
			values:     typeof(def.values)     === "undefined" 										 ? [0,0,0,0,0,0,0,0] : def.values, 
			read_pin:   typeof(def.read_pin)   === "undefined" || active_inputs[def.read_pin-1] != 1 ? 0                  : def.read_pin,
			read_value: typeof(def.read_value) === "undefined" 										 ? 0                  : def.read_value,
			operator:   typeof(def.operator)   === "undefined" 										 ? '<'                : def.operator
		};
	// if script should check to make sure that control pins are active (assumes control configuration linked to output configuration);
	var s = $.sprintf('<div class="row-fluid" id="row_control_%s"><div class="span2"><input id="control_%s_name" class="span12" type="text" value="%s" id="control_%s_name"></div><div class="span3 row-fluid">',	 id, id, def.name, id);
	for(var i = 1; i<=8; i++)
		s += $.sprintf('<div class="span_8_1 tooltipped" data-toggle="tooltip" data-original-title="%s"><button id="control_%s_pin_%s" class="btn btn-switch %s" data-toggle="button" %s>%s</button></div>',tables.outputs[i].name, id, i, def.values[i-1] && active_outputs[i-1] ? 'active' : '', active_outputs[i-1] ? '' : 'disabled="disabled"', i)
	s += $.sprintf('</div><div class="span4"><select class="show-tick dropup span7" id="control_%s_read_pin">',id);
	s += $.sprintf('<option value="0" %s>None</option>', def.read_pin == 0 ? 'selected' : '');
	for(var i = 1; i<=16; i++)
		s += $.sprintf('<option %s value="%s" %s>(%s) %s</option>', active_inputs[i-1] ? '' : 'disabled', i, i==def.read_pin ? 'selected' : '', i, tables.inputs[i].name)	;
	s += $.sprintf('</select><select %s class="show-tick dropup span2" id="control_%s_operator"><option %s value="<"><</option><option %s value=">">></option></select> <input %s class="span3" type="number" min="0" max="1023" id="control_%s_read_value" value="%s"></div><div class="span1"><input class="span12" type="number" min="0" step="any" id="control_%s_min" value="%s"></div><div class="span1"><input class="span12" type="number" min="0" step="any" id="control_%s_max" value="%s"></div>', def.read_pin ? '' : 'disabled="disabled"', id, def.operator == '<' ? 'selected' : '', def.operator == '>' ? 'selected' : '', def.read_pin ? '' : 'disabled="disabled"', id, def.read_value, id, def.min, id, def.max);
	s += $.sprintf('<button class="btn span1 btn-danger" id="control_%s_delete">delete</button></div>',id);
	$('#list-controls').append(s);
}

function nextControlRow(){
	var max = 0;
	$('[id^="row_control"]').each(function(){
		max = Math.max(max, parseInt($(this).attr('id').split('_')[2]));
	})
	return max+1;
}

function addConversionRow(conv){
	//conv ={id,name,equation,units}
	if(typeof(conv)!="object"){conv = {};}
	conv = {
		id:       typeof(conv.id)       === "undefined" ? nextConvid() : conv.id,
		name:     typeof(conv.name)	    === "undefined" ? ''           : conv.name,
		equation: typeof(conv.equation) === "undefined" ? ''           : conv.equation,
		units:    typeof(conv.units)    === "undefined" ? ''           : conv.units
	}
	var s = $.sprintf('<div class="row-fluid text-center" id="row_conversion_%s"><div class="span2"><input class="span12" id="conversion_%s_name" type="text" value="%s"></div><div class="span8"><input class="span12" id="conversion_%s_equation" type="text" value="%s"></div><div class="span1"><input class="span12" id="conversion_%s_units" type="text" value="%s"></div><div class="span1"><button class="btn btn-block btn-danger" id="conversion_%s_delete">delete</button></div></div>',conv.id,conv.id,conv.name,conv.id,conv.equation,conv.id,conv.units,conv.id);
	$('#list-conversions').append(s);
}

function nextConvid(){
	var max = 0;
	$('[id^="row_conversion"]').each(function(){
		max = Math.max(max, parseInt($(this).attr('id').split('_')[2]));
	})
	return max+1;
}

function activateCS(){
	console.log({displays:active.displays, controls: parseInt($('#cs_select').val()), refresh: 'refresh'}); 
	socket.emit('active_change',{displays:active.displays, controls: parseInt($('#cs_select').val()), refresh: 'refresh'});
}

function createCS(csname){
	var id = 0;
	$('#cs_select').find('option').each(function(){
		id = Math.max(id, $(this).val());
	});
	id++;
	var res = [{operation: 'insert', table: 'controls', index: id, params: {id: id, title: csname, definition: "{}"}}];
	console.log(res);
	socket.emit('active_change', {displays:active.displays, controls: id});
	socket.emit('db_update',res);
}

function renameCS(csname){
	var id = parseInt($('#cs_select').val());
	var res = [{operation: 'update', table: 'controls', index: id, params: {title: csname}}];
	console.log(res);
	socket.emit('db_update',res);
}

function deleteCS(id){
	var res = [{operation: 'delete', table: 'controls', index: id}];
	console.log(res);
	socket.emit('db_update',res);
}

function updateTable(table){
	var temp_table = {};
	$.each($('[id^="'+table.substring(0,table.length-1)+'_"]'), function(k,v){
		var iande = $(this).attr('id').split('_');
		if(typeof temp_table[iande[1]] === 'undefined')
			temp_table[iande[1]] = {};
		if(table != 'controls')
			temp_table[iande[1]].id = parseInt(iande[1]);
		var type = '';
		switch(iande[2]){
			case 'delete':
				break;
			case 'active':
				temp_table[iande[1]][iande[2]] = $(this).parent('div').bootstrapSwitch('status') ? 1 : 0;
				break;
			case 'pin':
				if(typeof temp_table[iande[1]].values === 'undefined')
					temp_table[iande[1]].values = [];
				temp_table[iande[1]].values[iande[3]-1] = $(this).hasClass('active') ? 1 : 0;
				break;
			case 'read':
				temp_table[iande[1]][iande[2]+'_'+[iande[3]]] = parseInt($(this).val());
				break;
			case 'max':
			case 'min':
			case 'type':
				temp_table[iande[1]][iande[2]] = parseFloat($(this).val());
				break;
			default:
				temp_table[iande[1]][iande[2]] = $(this).val();
		}
	});
	console.log(temp_table);
	$('[id^="row_'+table.substring(0,table.length-1)+'_"]').filter(".restorable-row").each(function(){
		delete temp_table[parseInt($(this).attr('id').split('_')[2])];
	});
	console.log(temp_table);
	if(table != 'controls'){
		var res = tableCompare(temp_table, tables[table], table);
		if(res.length){
			socket.emit('db_update', res);	
			console.log(res);
		}
		else
			$('#loadingscreen').modal('hide');
	}
	else{
		// If you changed number of rows
		var klist = Object.keys(temp_table).sort(function(a,b){ return (a-b); });
		if(klist.toString() != Object.keys(tables.controls[$('#controlscheme_select').val()].definition).sort(function(a,b){ return (a-b); }).toString()) {
			var temp_table2 = {};
			for(var k = 0; k<klist.length; k++){
				console.log(klist[k]);
				console.log(temp_table[klist[k]]);
				temp_table2[k] = temp_table[klist[k]];
			}
			temp_table = temp_table2;
		}
		console.log(temp_table);
		if(tables.controls.hasOwnProperty($('#controlscheme_select').val())){
			var res = tableCompare(temp_table, tables.controls[$('#controlscheme_select').val()].definition, table);
			//console.log({loc: temp_table, ref: tables.controls[$('#controlscheme_select').val()].definition, r: res});
			if(res.length){
				res = [{operation: 'update', table: 'controls', index: parseInt($('#controlscheme_select').val()), params: {definition: JSON.stringify(temp_table)}}];
				socket.emit('db_update', res);	
				console.log(res);
			}
			else
				$('#loadingscreen').modal('hide');
		}
	}
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