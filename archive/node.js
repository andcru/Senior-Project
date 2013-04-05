var hello = require('/var/www/node/node_modules/ReadSPI/build/Release/ReadSPI.node');
 
var str;
setInterval(function() {
	str = eval(hello.read()); // hello world
	console.log(str);
},100);
