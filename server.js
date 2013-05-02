// <-------------------------------------- Initialization Blob -------------------------------------->


// Setup Server
var app = require('http').createServer(handler)
  , url = require('url')
  , io  = require('socket.io').listen(app)
  , fs  = require('fs')
  , exec= require('child_process').exec
  , gpio= require('pi-gpio')
  , rp  = require('/var/www/node/node_modules/ReadSPI/build/Release/ReadSPI.node')
  , sql = require('mysql')
  , db  = sql.createConnection({
          host     : 'localhost',
          user     : 'ccnode',
          password : 'ccsp703',
          database : 'ccnode'
          });

exec("gpio unexportall");

app.listen(8100);

// Variable List
var conn   = 0
  , run    = 0
  , rend   = null
  , ctlend = null
  , buff   = []
  , ddel   = 1000
  , del    = 0
  , sd     = 20
  , k      = 0
  , et     = 0
  , tblc   = 0 // Counts tables pulled from db for a run start
  , tables = {}
  , rinfo  = {}
  , rcont  = {}; // Run control

var run_tables = ["controls","displays","conversions","inputs","outputs"];
var active     = {controls: 1, displays: 1};
var pins       = [7,11,12,13,15,16,18,22];

serverStart();

// <-------------------------------------- End of Initialization Blob -------------------------------------->

// Set Client Listeners
io.sockets.on('connection', function (socket) {
  conn++;
  socket.emit('loadAllInfo', {tables: tables, active: active});
  io.sockets.emit('running', { run: run, end: et, now: (new Date()).getTime(), del: del });
  if(run > 0)
    socket.emit("state_change", rcont);
  console.log("Total connections: "+conn);
  socket.on('run_request', function (data) {
    if(data.duration > 0)
      setRun(data);
    else
      killRun();
  });
  socket.on('active_change', function (data) {
    active.controls = data.controls;
    active.displays = data.displays;
    if(data.hasOwnProperty("refresh"))
      socket.emit('loadAllInfo', {tables: tables, active: active});
  });
  socket.on('db_request', function (data) {
    console.log(data);
    db_request(data);
  });
  socket.on('factory_reset', function (data) {
    if(data.hasOwnProperty("reset")) {
      exec("mysql -u ccnode -pccsp703 ccnode < reset.sql", function (error, stdout, stderr) {
        if (error === null && stderr == "") {
          loadTable();
        }
      });
    }
    else if(data.hasOwnProperty("delete")) {
      exec("mysql -u ccnode -pccsp703 ccnode < delete.sql", function (error, stdout, stderr) {
        if (error === null && stderr == "") {
          exec("rm runs -r");
          exec("mkdir runs");
          loadTable();
        }
      });
    }
  });
  socket.on('db_update', function (data) {
    console.log(data);
    db_update(data);
  });
  socket.on('get_runs', function (data) {
    get_runs(data);
  });
  socket.on('disconnect', function () {
    conn--;
    console.log("Total connections: "+conn);
  });
  socket.on('view_request', function(data) { view_request(data,socket); })
});

//Set Functions
function handler (req, res) {
  var file = url.parse(req.url).pathname;
  if (file == "/") { file = 'live';}
  var ext = file.split('.');
  var cext = ext.length;
  if(cext == 1){
    ext='html';
    file = file+"."+ext;
  }
  else
    ext = ext[cext-1];
  switch(ext){
    case 'js':
      var mtype = 'application/javascript';
      break;
    case 'css':
      var mtype = 'text/css';
      break;
    case 'html':
      var mtype = 'text/html';
      break;
    case 'csv':
      var mtype = 'application/octet-stream';
      break;
    default:
      var mtype = 'text/plain';
  }
  fs.readFile(__dirname + '/' + file, function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading '+file);
    }
    console.log("file served: "+file);
    res.writeHead(200, { 'Content-Type': mtype });
    res.end(data);
  });
}

function get_runs(data) {
  db.query('SELECT id,title,starttime FROM runs', function (err, rows, fields) {
    if(err) throw err;
    var ret={}; ret = rows;
    io.sockets.emit('return_runs', ret);
  });
}

function db_request(data) {
  db.query('SELECT * FROM ' + sql.escapeId(data.table), function (err, rows, fields) {
    if(err) throw err;
    var ret={}; ret.rows = rows; ret.table = data.table;
    io.sockets.emit('db_return', ret);
  });
}

function db_update(data) {
  var count = 0;
  for(var op in data) {
    var qry = "";
    switch (data[op].operation) { 
      case "update":
        qry = "UPDATE " + sql.escapeId(data[op].table) + " SET " + sql.escape(data[op].params) + " WHERE id = " + sql.escape(data[op].index);
        break;
      case "insert":
        qry = "INSERT INTO " + sql.escapeId(data[op].table) + " SET " + sql.escape(data[op].params);
        break;
      case "delete":
        qry = "DELETE FROM " + sql.escapeId(data[op].table) + " WHERE id = " + sql.escape(data[op].index);
        break;
    }
    console.log("Query: "+qry);
    db.query(qry, function (err, result) {
      if(err) throw err;
      count++;
      if(count === data.length) {
        loadTable();
      }
    });
  }
}

function db_insert(data) {
  if (data.hasOwnProperty('pairs'))
    db.query('INSERT INTO ' + sql.escapeId(data.table) + ' SET ' + sql.escape(data.pairs), function (err, rows, fields) {
      if(err) throw err;
      else return rows.length;
    });
  else 
    db.query('INSERT INTO ' + sql.escapeId(data.table) + ' (' + sql.escapeId(data.keys) + ') VALUES (' + sql.escape(data.values) + ')', function (err, rows, fields) {
      if(err) throw err;
      else return rows.length;
    });
}

// <--------------------- Andy's Section ----------------------->

function serverStart() {
  openGPIO();
  loadTable();
  sampler();
}

function loadTable() {
  tables = {};
  console.log('Load Table');
  for (var i = 0 ; i < run_tables.length ; i++)
    db_pullTable(i);
}

// Retrieves run info from the various tables as defined in "run_tables"
function db_pullTable(count) {
  db.query('SELECT * FROM ' + sql.escapeId(run_tables[count]), function (err, rows, fields) {
    if(err) throw err;
    var buff = {};
    if(active.hasOwnProperty(run_tables[count]))
      for(var row in rows)
        rows[row].definition = JSON.parse(rows[row].definition);
    for(var row in rows)
      buff[rows[row].id] = rows[row];
    eval('tables.'+run_tables[count]+' = buff;');
    console.log('Table "'+run_tables[count]+'" loaded!');
    // If done loading whole table
    if(Object.keys(tables).length == run_tables.length) {
      io.sockets.emit('loadAllInfo', {tables: tables, active: active});
      if(run <= 0)
      	setOutput();
    }
  });
}

// Called when you start a new run
function setRun(data) {
  if(run <= 0) {
    var rinfo_s = {};
    del  = 1000/data.rate;
    rinfo = JSON.parse(JSON.stringify(tables));
    rinfo.starttime = new Date();
    et = rinfo.starttime.getTime() + data.duration*60*1000;
    rinfo.endtime = new Date(et);
    for(var prop in active) {
        eval("rinfo."+prop+" = tables."+prop+"["+active[prop]+"];");
        console.log("rinfo."+prop+" = tables."+prop+"["+active[prop]+"];");
      }
    for(var prop in rinfo)
      if(prop.search("time") == -1)
        eval("rinfo_s."+prop+" = JSON.stringify(rinfo."+prop+");");
      else
        eval("rinfo_s."+prop+" = rinfo."+prop+";");
    rinfo_s.title = data.name;
    console.log(rinfo_s);
    db.query("INSERT INTO runs SET ?",rinfo_s, function (err, result) {
      if(err) throw err;
      run = result.insertId;
      rcont = {state: 0, begin: rinfo.starttime.getTime()};
      if(Object.keys(rinfo.controls.definition).length > 0)
        newState();
      console.log("Starting run "+run);
      rend = setTimeout(function() {
        killRun();
      }, data.duration*60*1000);
      io.sockets.emit('running', { run: run, end: et, now: rinfo.starttime.getTime(), del: del });
    });
  }
  else
    io.sockets.emit('running', { run: run, end: et, now: (new Date()).getTime(), del: del });
}

function killRun() {
  var old_run = run;
  run = 0;
  et = 0;
  clearTimeout(rend);
  clearTimeout(ctlend);
  setOutput();
  io.sockets.emit('running', { run: 0 });
  makeCSV(old_run);
}

function makeCSV(old_run) {
  exec("node makecsv.js "+old_run, function (error, stdout, stderr) {
    if (error === null && stderr == "") {
      io.sockets.emit("new_csv",{ id: old_run });
    }
  });
}

function view_request(data,socket){
  var buff = {};
  db.query('SELECT * FROM readings WHERE run = ' + sql.escape(data.num), function (err, rows, fields) {
    if(err) throw err;
    buff.readings = rows;
    db.query('SELECT * FROM runs WHERE id = ' + sql.escape(data.num), function (err, rows, fields) {
      buff.runinfo = rows;
      socket.emit('view_data', buff);
    });
  });
}


// Sampler
function sampler() {
  var delay;
  if( conn || run ) {
    buff = rp.read();
    io.sockets.emit('reading', buff);
    if( run ) {
      var query = "INSERT INTO readings (run,r1,r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,timestamp) VALUES ("+run+","+buff+")";
      db.query(query);
      delay = del;
      if(rcont.state > 0)
        control(buff);
      console.log('Sampled & Stored');
    }
    else
      console.log('Sampled');
  }
  else
    console.log('Not sampled');
  delay = delay ? delay : ddel;
  setTimeout(sampler,delay-sd);
}

// Control function
function control(reading) {
  var next = 0;
  var st = rinfo.controls.definition[rcont.state];
  var td = (new Date()).getTime() - rcont.begin;
  if(td >= st.min*1000) {
    if(st.read_pin > 0 && st.read_value != "" && st.operator != "") {
      var rdg = reading.split(',');
      if(eval("rdg["+(st.read_pin-1)+"] "+st.operator+"= "+st.read_value))
        next = 1;
    }
  }
  if(next > 0)
    newState();
  else
    console.log("Time in states: "+td);
}

function newState() {
  if(run > 0) {
    var ns = (Object.keys(rinfo.controls.definition).length >= rcont.state + 1) ? rcont.state + 1 : 1;
    var st = rinfo.controls.definition[ns];
    var nt = (new Date()).getTime();
    clearTimeout(ctlend);
    var prev_state = rcont.state;
    var next_state = (Object.keys(rinfo.controls.definition).length >= ns + 1) ? ns + 1 : 1;
    if(st.max > 0)
      ctlend = setTimeout(newState,st.max*1000);
    rcont = {state: ns, begin: nt, prev: prev_state, next: next_state};
    setOutput(st.values);
    io.sockets.emit("state_change", rcont);
    db.query("INSERT INTO state_history (run,state,timestamp) VALUES ("+run+","+ns+","+nt+")", function (err,result) {
      if(err) throw err;
    });
  }
}

function setOutput(arr) {
  if(typeof(arr) !== "undefined")
    for(var i=0; i < pins.length; i++)
      gpio.write(pins[i],arr[i]);
  else
    for(var i=0; i < pins.length; i++)
      gpio.write(pins[i],tables.outputs[i+1]["default"]);
  console.log("Outputs set.");
}

function openGPIO() {
  for(var i=0;i<pins.length;i++) {
    console.log("Pin "+pins[i]+" enabled as output!");
    gpio.open(pins[i]);
  }
}
