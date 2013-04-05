// STORY: On connecting to server, server returns an object.
// This object contains the contents of each of the config tables, in full

var socket = io.connect('http://cc.acrudge.com');
var tables

socket.on('loadAllInfo', function(data) {
	tables = data;
})

socket.on('db_return', function (data) {
    var buff = {};
    $.each(data.rows, function(k,v) { buff[v.id] = v; })
    eval(data.table+"=buff;");
    //eval('console.log('+data.table+')');
});

socket.on('reading', function (data) {
	//addText(data);
});

socket.on('running', function (data) {
  	//addText("Running: "+data.number+", End: "+data.end);
	//showStatus(data.number);
});	