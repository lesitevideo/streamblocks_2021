class PortProcessor extends AudioWorkletProcessor {
	
    constructor() {
      super();
      //this._lastUpdate = currentTime;
      this.port.onmessage = this.handleMessage_.bind(this);
    }
	
	process(inputs, outputs, parameters) {
		const input = inputs[0];
		const output = outputs[0];
	
		for (var channel = 0; channel < input.length; ++channel) {
			const inputChannel = input[channel];
			const outputChannel = output[channel];
		 
			for (var i = 0; i < inputChannel.length; ++i){
				outputChannel[i] = inputChannel[i];
			}
		}
		
		//console.log( inputs[0][0] );
		
		this.port.postMessage({
		  //message: '1 second passed.',
		  //contextTimestamp: currentTime,
		  data:inputs[0][0]	
		});
		//this._lastUpdate = currentTime;		

		return true
    }
	  
	handleMessage_(event) {
		// Do something with data from main thread.
		//var dataForMainThread = {};

		// Send data to the main thread.
		//this.postMessage('');
		
		//console.log('[Processor:Received] ' + event.data.message + ' (' + event.data.contextTimestamp + ')');
	}
	
}

registerProcessor('port-processor', PortProcessor);