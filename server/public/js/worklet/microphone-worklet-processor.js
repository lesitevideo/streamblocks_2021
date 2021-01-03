

//import WasmRingBuffer from './wasm-ring-buffer/index.js';
//import { LOG_TABLE } from './constants.js';

import Module from './variable-buffer-kernel.wasmmodule.js';
import { HeapAudioBuffer, RingBuffer } from './lib/wasm-audio-helper.js';


class MicrophoneWorkletProcessor extends AudioWorkletProcessor {
	
	
  constructor(options) {
    super();

    this._kernelBufferSize = options.processorOptions.kernelBufferSize;
    this._channelCount = options.processorOptions.channelCount;

    // RingBuffers for input and output.
    this._inputRingBuffer = new RingBuffer(this._kernelBufferSize, this._channelCount);
    this._outputRingBuffer = new RingBuffer(this._kernelBufferSize, this._channelCount);

    // For WASM memory, also for input and output.
    this._heapInputBuffer = new HeapAudioBuffer(Module, this._kernelBufferSize, this._channelCount);
    this._heapOutputBuffer = new HeapAudioBuffer(Module, this._kernelBufferSize, this._channelCount);

    // WASM audio processing kernel.
    this._kernel = new Module.VariableBufferKernel(this._kernelBufferSize);
  }

	
  /**
   * System-invoked process callback function.
   * @param  {Array} inputs Incoming audio stream.
   * @param  {Array} outputs Outgoing audio stream.
   * @param  {Object} parameters AudioParam data.
   * @return {Boolean} Active source flag.
   */
  process(inputs, outputs, parameters) {
    // Use the 1st input and output only to make the example simpler. |input| and |output| here have the similar structure with the AudioBuffer interface. (i.e. An array of Float32Array)
    let input = inputs[0];
    let output = outputs[0];

    // AudioWorkletProcessor always gets 128 frames in and 128 frames out. Here we push 128 frames into the ring buffer.
    this._inputRingBuffer.push(input);

    // Process only if we have enough frames for the kernel.
    if (this._inputRingBuffer.framesAvailable >= this._kernelBufferSize) {
        // Get the queued data from the input ring buffer.
        this._inputRingBuffer.pull(this._heapInputBuffer.getChannelData());

        // This WASM process function can be replaced with ScriptProcessor's
        // |onaudioprocess| callback funciton. However, if the event handler
        // touches DOM in the main scope, it needs to be translated with the
        // async messaging via MessagePort.

        this._kernel.process(this._heapInputBuffer.getHeapAddress(), this._heapOutputBuffer.getHeapAddress(), this._channelCount);

        // Fill the output ring buffer with the processed data.
        this._outputRingBuffer.push(this._heapOutputBuffer.getChannelData());
		
		
    }

    // Always pull 128 frames out. If the ring buffer does not have enough frames, the output will be silent.
    this._outputRingBuffer.pull(output);
	 // console.log(this._outputRingBuffer._channelData[0]);
	 // console.log(output[0]);
	  
	//this.port.postMessage( output[0] );
	this.port.postMessage( this._outputRingBuffer._channelData );
	  
    return true;
  }	
	
/*  constructor(options) {
    super();
    this._bufferSize = options.processorOptions.bufferSize;
    this._capacity = options.processorOptions.capacity;
    this._ringBuffer = new WasmRingBuffer(this._capacity, this._bufferSize);
    this._ready = true;
    this.port.onmessage = this.onmessage.bind(this);
  }

  onmessage({ data }){
    this._ready = data.ready;

    if(!this._ready){
      this._ringBuffer.clear();
    }
  }

  float32ToInt16(float32array) {
    let l = float32array.length;
    const buffer = new Int16Array(l);
    while (l--) {
      buffer[l] = Math.min(1, float32array[l]) * 0x7fff;
    }
    return buffer;
  }

  alawEncode(sample) {
    let compandedValue;
    sample = sample === -32768 ? -32767 : sample;
    const sign = (~sample >> 8) & 0x80;
    if (!sign) {
      sample *= -1;
    }
    if (sample > 32635) {
      sample = 32635;
    }
    if (sample >= 256) {
      const exponent = LOG_TABLE[(sample >> 8) & 0x7f];
      const mantissa = (sample >> (exponent + 3)) & 0x0f;
      compandedValue = (exponent << 4) | mantissa;
    } else {
      compandedValue = sample >> 4;
    }
    return compandedValue ^ (sign ^ 0x55);
  }

  linearToAlaw(int16array) {
    const aLawSamples = new Uint8Array(int16array.length);
    for (let i = 0; i < int16array.length; i++) {
      aLawSamples[i] = this.alawEncode(int16array[i]);
    }
    return aLawSamples;
  }

  process(inputs) {
    if(this._ready){
      const input = inputs[0];
      const output = new Float32Array(this._bufferSize);
      this._ringBuffer.enqueue(input[0]);
  
      while (this._ringBuffer.size() >= this._bufferSize) {
        this._ringBuffer.dequeue(output);
        const int16array = this.float32ToInt16(output);
		  
        const payload = this.linearToAlaw(int16array);
        const sharedPayload = new Uint8Array(new SharedArrayBuffer(payload.length));
        sharedPayload.set(payload, 0);
        this.port.postMessage(sharedPayload);
		  
		//this.port.postMessage(output);
      }
    }
   
    return true;
  }*/
}

registerProcessor(`microphone-worklet-processor`, MicrophoneWorkletProcessor);
