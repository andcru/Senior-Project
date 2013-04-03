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
  , runn = 0
  , buff = []
  , ddel = 1000
  , del  = 0
  , st   = 20
  , i    = 0; 
  //sr   = srr > 0 ? srr : srd

sampler();
// Set Client Listeners
io.sockets.on('connection', function (socket) {
  conn++;
  io.sockets.emit('running', runn);
  console.log("Total connections: "+conn);
  socket.on('run_request', function (data) {
    setRun(data);
  });
  socket.on('db_request', function (data) {
    socket.emit('db_return', db_request(data));
  });
  socket.on('db_update', function (data) {
    socket.emit('db_update', db_update(data));
  })
  socket.on('test_event', function (data) {
    console.log(data);
    socket.broadcast.emit('resp','Someone else pushed the button.');
    socket.emit('resp','I pushed the button.');
  });
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
    var recent_run;
    db.query("SELECT MAX(run) AS mrun from readings", function (err, rows, fields) {
      if(err) throw err;
      recent_run = rows[0].mrun;
    });
    runn = data.extend ? recent_run : recent_run + 1;
    del  = 1000/data.rate;
    rend = setTimeout(function() {
      run = 0;
      io.sockets.emit('running', '0');
    }, Math.floor(data.duration*60*1000));
    run = 1;
    io.sockets.emit('running', runn);
  }
  else
    io.sockets.emit('running', runn);
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
      var query = "INSERT INTO readings (r1,r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,timestamp) VALUES ("+buff+")";
      db.query(query);
      delay = del;
      console.log(i);
    }
  }
  delay = delay ? delay : ddel;
  i++;
  console.log('Sampled');
  setTimeout(sampler,delay-st);
}