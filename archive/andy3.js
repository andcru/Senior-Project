var app = require('http').createServer(handler)
  , io  = require('socket.io').listen(app)
  , fs  = require('fs')
var gpio = require("pi-gpio");

var reading;
var misopin  = 16;
var mosipin  = 22;
var clockpin = 12;
var cspin    = 24;

var outss = "";

gpio.close(misopin);
gpio.close(mosipin);
gpio.close(clockpin);
gpio.close(cspin);

gpio.open(misopin,"input");
gpio.open(mosipin,"output");
gpio.open(clockpin,"output");
gpio.open(cspin,"output");

app.listen(8125);

io.sockets.on('connection', function (socket) {
  setInterval(function() {
    reading = readadc(1,clockpin,mosipin,misopin,cspin);
    socket.emit('resp',reading);
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


function readadc(adcnum, clockpin, mosipin, misopin, cspin){
  // Ensure that we're only reading one of the 8 input pins

  if ((adcnum > 7) || (adcnum < 0)){
        return -1;
  }
  
  gpio.write(cspin,1);                 // Bring chip select high
  gpio.write(clockpin,0);                 // Bring chip select high
  gpio.write(cspin,0);                 // Bring chip select high

  commandout = adcnum;
  commandout |= 0x18; // Start bit + single-ended bit
  commandout <<= 3;   // We only need to send 5 bits here
    
  for(var i=1; i<=5; i++){

    if (commandout & 0x80){
      gpio.write(mosipin,1);
    }
    else{
      gpio.write(mosipin,0);
    }

    commandout <<=1;

    gpio.write(clockpin,1);
    gpio.write(clockpin,0);  
  }
  // Read in one empty bit, one null bit and 10 ADC bits
  for(var i=0; i<12; i++){

    gpio.write(clockpin,1);
    gpio.write(clockpin,0);
    var val;
    gpio.read(misopin, function(err, v){
      outss += v;
    });
  }
  gpio.write(cspin,1);               // Bring chip select high
  
  console.log(outss);
  var outs = outss;
  outss = "";
  return Math.floor(parseInt(outs,2)/2);
}
