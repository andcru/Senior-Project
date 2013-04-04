var socket = io.connect('http://cc.acrudge.com');
var inputs, outputs, conversions, displays, controls;

//socket.emit('db_request', { 'table': 'inputs' });
//socket.emit('db_request', { 'table': 'outputs' });
socket.emit('db_request', { table: 'conversions' });
//socket.emit('db_request', { 'table': 'displays' });
//socket.emit('db_request', { 'table': 'controls' });

socket.on('db_return', function (data) {
	console.log(data);
    //var buff = {};
    //$.each(data.rows, function(k,v) {
    //    buff[v.id] = v;
    //})
    //eval(data.table+"=buff;");
    //eval('console.log('+data.table+')');
});

socket.on('reading', function (data) {
	//addText(data);
});

socket.on('running', function (data) {
  	//addText("Running: "+data.number+", End: "+data.end);
	//showStatus(data.number);
});	