class PortProcessor extends AudioWorkletProcessor {
	
	static get parameterDescriptors() {
      return [
		  {
			  name: 'inputDevice', // 10 entrées son max
			  defaultValue: 0,
			  minValue: 0,
			  maxValue: 9
		  },{
			  name: 'deviceChannel', // 16 voies max par entrée son
			  defaultValue: 0,
			  minValue: 0,
			  maxValue: 15
		  }
	  ];
    }
	
    constructor( options ) {
		super( options );
    }
	
	process( inputs, outputs, parameters ) {
		
		//const input = inputs[0];
		//const output = outputs[0];
		
		const inputDevice = parameters.inputDevice;
		const deviceChannel = parameters.deviceChannel;
		
		//console.log( "device #" + inputDevice + " - channel #" + deviceChannel );
		//console.log( inputs );
		/*
		for (var channel = 0; channel < input.length; ++channel) {
			const inputChannel = input[channel];
			const outputChannel = output[channel];
		 	
			for (var i = 0; i < inputChannel.length; ++i){
				outputChannel[i] = inputChannel[i];
				
			}
		}
		*/
		
        this.port.postMessage({
          bufferstream:inputs[inputDevice][deviceChannel]	 // <- ici selectionner l'input et la voie
        });
		
        return true
    }
	
}

registerProcessor('port-processor', PortProcessor);