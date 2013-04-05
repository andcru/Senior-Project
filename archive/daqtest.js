var Led = require('/usr/local/lib/node_modules/pi-led/build/Release/PiLed.node').PiLed;

var led = new Led();

led.Cookies("Hi", function(err, result) {

});