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
  , abv    = 0 // Shows whether previous reading was above or below the setpoint
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
  socket.emit('loadAllInfo', tables);
  io.sockets.emit('running', { run: run, end: et });
  console.log("Total connections: "+conn);
  socket.on('run_request', function (data) {
    if(data.duration > 0)
      setRun(data);
    else
      killRun();
  });
  socket.on('db_request', function (data) {
    console.log(data);
    db_request(data);
  });
  socket.on('db_update', function (data) {
    socket.emit('db_update', db_update(data));
  })
  socket.on('disconnect', function () {
    conn--;
    console.log("Total connections: "+conn);
  });
});

//Set Functions
function handler (req, res) {
  var file = url.parse(req.url).pathname;
  if (file == "/") { file = 'index.html';}
  fs.readFile(__dirname + '/' + file, function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading '+file);
    }
    var ext = file.split('.');
    ext = ext[ext.length-1];
    console.log("file_ext: "+ext);
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
      default:
        var mtype = 'text/plain';
    }
    console.log("file served: "+file);
    res.writeHead(200, { 'Content-Type': mtype });
    res.end(data);
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
  db.query('UPDATE ' + sql.escapeId(data.table) + ' SET ' + sql.escape(data.pairs) + ' WHERE ' + sql.escape(data.match), function (err, rows, fields) {
    if(err) throw err;
    else return "1";
  });
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
  for (var i = 0 ; i < run_tables.length ; i++)
    db_pullTable(i);
  openGPIO();
  sampler();
}

// Retrieves run info from the various tables as defined in "run_tables"
function db_pullTable(count) {
  db.query('SELECT * FROM ' + sql.escapeId(run_tables[count]), function (err, rows, fields) {
    if(err) throw err;
    if(active.hasOwnProperty(run_tables[count]))
      for(var row in rows)
        rows[row].definition = JSON.parse(rows[row].definition);
    eval('tables.'+run_tables[count]+' = rows;');
    console.log('tabled');
  });
}

// Called when you start a new run
function setRun(data) {
  if(run <= 0) {
    var rinfo_s = {};
    tables.title = data.name;
    del  = 1000/data.rate;
    tables.starttime = new Date();
    et = tables.starttime.getTime() + data.duration*60*1000;
    tables.endtime = new Date(et);
    rinfo = JSON.parse(JSON.stringify(tables));
    for(var prop in active)
        eval("rinfo."+prop+" = tables."+prop+"["+(active[prop]-1)+"];");
    for(var prop in rinfo)
      if(prop.search("time") == -1)
        eval("rinfo_s."+prop+" = JSON.stringify(rinfo."+prop+");");
      else
        eval("rinfo_s."+prop+" = rinfo."+prop+";");
    db.query("INSERT INTO runs SET ?",rinfo_s, function (err, result) {
      if(err) throw err;
      run = result.insertId;
      rcont = {state: 0, begin: tables.starttime.getTime()};
      newState(1);
      console.log("Starting run "+run);
      rend = setTimeout(function() {
        run = 0;
        et = 0; 
        io.sockets.emit('running', { run: 0 });
      }, data.duration*60*1000);
      io.sockets.emit('running', { run: run, end: et });
    });
  }
  else
    io.sockets.emit('running', { run: run, end: et });
}

function killRun() {
  run = 0;
  et = 0;
  clearTimeout(rend);
  clearTimeout(ctlend);
  io.sockets.emit('running', { run: 0 });
}

// Sampler
function sampler() {
  var delay;
  if( conn || run ) {
    buff = rp.read();
    console.log(buff);
    io.sockets.emit('reading', buff);
    if( run ) {
      var query = "INSERT INTO readings (run,r1,r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,timestamp) VALUES ("+run+","+buff+")";
      db.query(query);
      delay = del;
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
  if(td >= st.min) {
    if(st.read_pin > 0 && st.read_value != "" && st.operator != "") {
      var rdg = reading.split(',');
      if(eval("st.read_pin "+st.operator+"= "+st.read_value))
        next = 1;
    }
  }
  console.log("Next: "+next);
  if(next > 0)
    newState(0);
  else
    console.log("Time in state: "+td);
}

function newState(start) {
  if(run > 0) {
    var ns = (Object.keys(rinfo.controls.definition).length >= rcont.state + 1) ? rcont.state + 1 : 1;
    var st = rinfo.controls.definition[ns];
    var nt = (new Date()).getTime();
    clearTimeout(ctlend);
    ctlend = setTimeout(newState,st.max);
    rcont = {state: ns, begin: nt};
    setOutput(st.values);
    io.sockets.emit("state_change", ns);
    db.query("INSERT INTO state_history (run,state,timestamp) VALUES ("+run+","+ns+","+nt+")", function (err,result) {
      if(err) throw err;
    });
  }
}

function setOutput(arr) {
  for(var i=0; i < pins.length; i++)
    gpio.write(pins[i],arr[i]);
}

function openGPIO() {
  for(var i=0;i<pins.length;i++) {
    console.log("Pin "+pins[i]);
    gpio.open(pins[i]);
  }
}