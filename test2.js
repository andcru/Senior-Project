// Setup Server
var app = require('http').createServer(handler)
  , url = require('url')
  , io  = require('socket.io').listen(app)
  , fs  = require('fs')
  , rp  = require('/var/www/node/node_modules/ReadSPI/build/Release/ReadSPI.node')
  , sql = require('mysql')
  , db  = sql.createConnection({
          host     : 'localhost',
          user     : 'ccnode',
          password : 'ccsp703',
          database : 'ccnode'
          });

app.listen(8100);

// Variable List
var conn = 0
  , run  = 0
  , rend = null
  , buff = []
  , ddel = 1000
  , del  = 0
  , st   = 20
  , et   = 0
  , tblc = 0 // Counts tables pulled from for a run start
  , rinfo= {};

var run_tables = new Array("controls","conversions","displays","inputs","outputs");

sampler();
// Set Client Listeners
io.sockets.on('connection', function (socket) {
  conn++;
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

// This is called when you want to start a new run. It chooses the run # for this run
function setRun (data) {
  // data contains (float) rate, (float) duration, (string) name
  if(!run) { // This is just in case the browser isn't yet aware that there's a run currently going
    db.query("SELECT MAX(run) AS mrun FROM readings", function (err, rows, fields) {
      if(err) throw err;
      run = rows[0].mrun + 1;
      rinfo.id = run;
      rinfo.title = data.name;
      for (var i = 0 ; i < run_tables.length ; i++)
        db_pullTable(i,data);
    });
  }
  else
    io.sockets.emit('running', { run: run, end: et });
}

// Retrieves run info from the various tables as defined in "run_tables"
function db_pullTable(count,data) {
  db.query('SELECT * FROM ' + sql.escapeId(run_tables[count]), function (err, rows, fields) {
    if(err) throw err;
    eval('rinfo.'+run_tables[count]+' = rows;');
    tblc++;
    if(tblc >= run_tables.length)
      setupRun(data);
  });
}

// Inserts the config info into the "runs" table (TBD) and initializes the run
function setupRun(data) {
  tblc = 0;
  console.log("Starting run "+run);
  del  = 1000/data.rate;
  rinfo.starttime = new Date();
  et = rinfo.starttime.getTime() + data.duration*60*1000;
  rinfo.endtime = new Date(et);
  db.query("INSERT INTO runs SET ?",[rinfo], function (err, rows, fields) {
    if(err) throw err;
    rend = setTimeout(function() {
      run = 0;
      et = 0;
      io.sockets.emit('running', { run: 0 });
    }, data.duration*60*1000);
    io.sockets.emit('running', { run: run, end: et });
  });
}

function killRun() {
  run = 0;
  clearTimeout(rend);
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
    }
  }
  delay = delay ? delay : ddel;
  console.log('Sampled');
  setTimeout(sampler,delay-st);
}

// Control function
function control(reading) {

}