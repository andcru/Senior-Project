var csv = require('ya-csv')
  , sql = require('mysql')
  , db  = sql.createConnection({
          host     : 'localhost',
          user     : 'ccnode',
          password : 'ccsp703',
          database : 'ccnode'
          });

var 	runvars = {}
	,	rundata = {}
	,	history = {}
	,	csvdata = []
	,	min_id
	,	min_time
	,	used_inputs = []
	,	headings = ["Reading ID"]
	,	writer
	,	written;

var run_tables = ["controls","displays","conversions","inputs","outputs"];
var active     = {controls: 1, displays: 1};

var run = process.argv[2];
loadRun();

function loadRun() {
  	db.query('SELECT * FROM runs WHERE id = ' + sql.escape(run), function (err, rows, fields) {
	    if(err) throw err;
	    runvars = rows[0];
	    if(runvars.id == run) {
		    writer = new csv.createCsvFileWriter('runs/'+runvars.id+'.csv');
		    parseData();
		}
		else
			process.exit(1);
	});
}

function parseData() {
	var elems = ["conversions","inputs"];
	for(var i=0; i<elems.length; i++)
		eval("runvars."+elems[i]+" = JSON.parse(runvars."+elems[i]+");");
	loadData();
}

function loadData() {
	for(var k in runvars.inputs)
		if(runvars.inputs[k].active > 0) {
			used_inputs.push("r"+k); 
			headings.push(runvars.inputs[k].name+" ("+runvars.conversions[runvars.inputs[k].type].units+")");
		}
	headings.push("Time (s)");
	db.query('SELECT id,'+ used_inputs +',timestamp FROM readings WHERE run = ' + sql.escape(run), function (err, rows, fields) {
	    if(err) throw err;
	    rundata = rows;
	    db.query('SELECT MIN(id) AS mr, MIN(timestamp) AS mt FROM readings WHERE run = ' + sql.escape(run), function (err,rows,fields) {
	    	if(err) throw err;
	    	min_id = rows[0].mr;
	    	min_time = rows[0].mt;
	    	db.query('SELECT * FROM state_history WHERE run = ' + sql.escape(run), function (err,rows,fields) {
		    	if(err) throw err;
		    	history = rows;
		    	console.log(history);		    	
		    	convertData();
		    });
	    });
	});
}

function convertData() {
	for(var k in rundata) {
		var row = rundata[k];
		var rdg = [row.id-min_id+1];
		for(var i = 1; i <= used_inputs.length; i++) {
			rdg.push(convert(row["r"+i],runvars.inputs[i].type));
		}
		//var date = new Date(row.timestamp);
		//var excel_format = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+" "+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds()+"."+date.getMilliseconds();
		var run_time = (row.timestamp - min_time)/1000;
		rdg.push(run_time);
		csvdata.push(rdg);
	}
	makeCSV();
}

function convert(data,type) {
	var x = parseInt(data);
    return eval("with (Math) { "+runvars.conversions[type].equation+"; }");
}

function makeCSV() {
	writer.writeRecord(headings);
	for(var i=0; i<csvdata.length; i++) {
		writer.writeRecord(csvdata[i]);
	}
	//writer.writeStream.end();
	writer.writeStream.on('close', function() {
		console.log("1");
		process.exit();
	});
}