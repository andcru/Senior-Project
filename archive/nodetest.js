var app = require('http').createServer(handler)
  , io  = require('socket.io').listen(app)
  , fs  = require('fs')
var readpins = require('/var/www/node/node_modules/ReadSPI/build/Release/ReadSPI.node');

app.listen(8125);

io.sockets.on('connection', function (socket) {
  socket.on('getdata', function (data) {
    console.log("Data requested: "+data);
    if(data > 0) {
      setInterval(function() {
        var str = readpins.read();
        socket.emit('resp',str);
        socket.broadcast.emit('resp',str);
      },1000);
    }
  });
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