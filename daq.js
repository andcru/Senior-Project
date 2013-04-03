function readadc(adcnum, clockpin, mosipin, misopin, cspin){
    // Ensure that we're only reading one of the 8 input pins
    if ((adcnum > 7) || (adcnum < 0)){
        return -1;
	}

	var gpio = require("pi-gpio");
	
    gpio.open(cspin, "output", function(err){
		gpio.write(cspin,1,function(){
			gpio.close(cspin);
		});
	});      						// Bring chip select high
    gpio.open(clockpin, "output", function(err){
		gpio.write(clockspin,0,function(){
			gpio.close(clockspin);
		});
	});      						// Bring chip select high
	    gpio.open(cspin, "output", function(err){
		gpio.write(cspin,0,function(){
			gpio.close(cspin);
		});
	});      						// Bring chip select high

    commandout = adcnum;
    commandout = commandout | 0x18; // Start bit + single-ended bit
    commandout = commandout << 3;   // We only need to send 5 bits here
    
	for(var i=1; i<=5; i++){
        if (commandout & 0x80){
			gpio.open(mosipin, "output", function(err){
				gpio.write(mosipin,1,function(){
					gpio.close(mosipin);
				});
			});
		};
		else{
 			gpio.open(mosipin, "output", function(err){
				gpio.write(mosipin,1,function(){
					gpio.close(mosipin);
				});
			});
		};
        commandout = commandout << 1;
        GPIO.output(clockpin, True)
        GPIO.output(clockpin, False)
	}
	
    adcout = 0;
    // Read in one empty bit, one null bit and 10 ADC bits
    for(var i=1; i<=12, i++){
		gpio.open(clockpin, "output", function(err){
			gpio.write(clockpin,1,function(){
				gpio.close(clockpin);
			});
		});
		gpio.open(clockpin, "output", function(err){
			gpio.write(clockpin,0,function(){
				gpio.close(clockpin);
			});
		});
		adcout <<= 1
		gpio.open(misopin, "input", function(err){
			gpio.read(misopin, function(err2, value){
				var reading = value;
				gpio.close(misopin);
			});
		});
        if (value){
            adcout = adcout | 0x1;
		}
	}

    gpio.open(cspin, "output", function(err){
		gpio.write(cspin,1,function(){
			gpio.close(cspin);
		});
	});      					// Bring chip select high
	
    adcout = adcout >> 1;      	//first bit is 'null' so drop it
    return adcout;
}

