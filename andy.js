var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

app.listen(8124);

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'cc_user',
  password : 'ccsp703',
  database : 'cc'
});

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

connection.connect();

io.sockets.on('connection', function (socket) {
  setInterval(function() {
    connection.query('SELECT * FROM readings ORDER BY id DESC LIMIT 1', function(err, rows, fields) {
      if (err) throw err;
      socket.emit('resp',rows[0]);
    });
  },1000);
  socket.on('test_event', function (data) {
    console.log(data);
    socket.broadcast.emit('resp','Someone else pushed the button.');
    socket.emit('resp','I pushed the button.');
  });
});

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}