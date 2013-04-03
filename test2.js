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
  , st   = 20;
  //sr   = srr > 0 ? srr : srd

sampler();
// Set Client Listeners
io.sockets.on('connection', function (socket) {
  conn++;
  io.sockets.emit('running', run);
  console.log("Total connections: "+conn);
  socket.on('run_request', function (data) {
    if(data.duration > 0)
      setRun(data);
    else
      killRun();
  });
  socket.on('db_request', function (data) {
    socket.emit('db_return', db_request(data));
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
    console.log(file);
    res.writeHead(200);
    res.end(data);
  });
}

function setRun (data) {
  // data contains (float) rate, (float) duration, (bool) extend
  if(!run) {
    var recent_run = 0;
    db.query("SELECT MAX(run) AS mrun from readings", function (err, rows, fields) {
      if(err) throw err;
      recent_run = rows[0].mrun;
      run = data.extend ? recent_run : recent_run + 1;
      console.log("Starting run "+run);
      del  = 1000/data.rate;
      rend = setTimeout(function() {
        run = 0;
        io.sockets.emit('running', '0');
      }, Math.floor(data.duration*60*1000));
      io.sockets.emit('running', run);
    });
  }
  else
    io.sockets.emit('running', run);
}

function killRun() {
  run = 0;
  clearTimeout(rend);
  io.sockets.emit('running', '0');
}

function db_request(data) {
  db.query("SELECT * FROM ?", [data.table], function (err, rows, fields) {
    if(err) throw err;
    var ret={}; ret.rows = rows; ret.table = data.table;
    return ret;
  });
}

function db_update(data) {
  db.query("UPDATE ? SET ? WHERE ?", [data.table, data.pairs, data.match], function (err, rows, fields) {
    if(err) throw err;
    else return "1";
  });
}

function db_insert(data) {
  if (data.hasOwnProperty('pairs'))
    db.query("INSERT into ? SET ?", [data.table, data.pairs], function (err, rows, fields) {
      if(err) throw err;
      else return rows.length;
    });
  else 
    db.query("INSERT into ? (?) VALUES (?)", [data.table, data.keys, data.values], function (err, rows, fields) {
      if(err) throw err;
      else return rows.length;
    });
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
    }
  }
  delay = delay ? delay : ddel;
  console.log('Sampled');
  setTimeout(sampler,delay-st);
}