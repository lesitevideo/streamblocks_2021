	
$( document ).ready(function() {
	
	let wavesurfer;
	var is_streaming = false;
	
	var context_samplerate;
	var method = '';
	var debuginterval;
	var recorder;	
	
    var socket = io();
    socket.binaryType = 'arraybuffer';

    var device_list = [];
    var rules = {
        video:false,
        audio:true
    };

	var sampleformat = $('.sampleformat input:checked').val();
	console.log(sampleformat);
	
    var client,
        recorder,
        context, processor;

	var blocksOnStage = [];
	
	var debug = $('#debug');
	
    var origAppend = $.fn.append;

    $.fn.append = function () {
        return origAppend.apply(this, arguments).trigger("append");
    };
	
	debug.bind("append", function() { debug.scrollTop(debug[0].scrollHeight); });
	
	/*------ SOCKET -------*/

    socket.on('connect', function(){
        console.log('connected to socket');
		debug.append('connected to socket server<br>');
    });

    socket.on('blocks status', function(data){
        console.log('blocks status => ', data);
		debug.append('blocks status => ' + JSON.stringify( data ) + '<br>');
		
		$('#scene').html('');
		blocksOnStage = [];
		
        data.forEach(function(item){
            $('#scene').append( $('#block_template').html() );
            $('#scene').find( "h3" ).text( item.block_id  );
            $('#scene').find( ".socket_id" ).text( item.socket_id  );  
			blocksOnStage.push({
				block_id: item.block_id,
				socket_id: item.socket_id
			});
        });
        set_blocks_inputsources();
    });

	


	/*------ BOUTONS interface -------*/

    $('#bt_refresh').on('click',function(){
        socket.emit('get status', '');
    })

			  
			  
		  
		  
	/*------ AUDIO -------*/
		  

			  
    function close(){ // <- todo : passer en variable le recorder à arreter ( faire un array avec les recorders actifs )
        //socket.emit( 'stop stream', '' );
		console.log('close ');
		debug.append('<b>close</b><br>');
		
		$('#select_buffersize').val( 0 );
		
        is_streaming = false;
		
        if(recorder){
            recorder.disconnect();
        }

		if( context && context.state != "closed" ){
            context.close();
        }
		
		if(debuginterval){
           clearInterval(debuginterval);
        }
		
		if (wavesurfer) {
			if (wavesurfer.microphone.active) {
				wavesurfer.microphone.stop();
			}
		}
		socket.emit( 'stop stream', '' );
    }
		  
	
			
    function stream_to_block( socket_id ){

		close();
		//socket.emit('stop stream', '');
		
		var autoGainControl = $('#checkbox_autoGainControl').is(':checked');
		var echoCancellation = $('#checkbox_echoCancellation').is(':checked');
		var audioSource = $('#select0').val();  
		
		
		if (window.stream) {
          window.stream.getTracks().forEach(track => {
            track.stop();
          });
        }
		
		is_streaming = true;
		
        var constraints = {
			audio: {
				sampleSize: 16,
				channelCount: 1,
				autoGainControl: autoGainControl,
				echoCancellation: echoCancellation,
				deviceId: audioSource
			},
			video: false
		};
		debug.append( 'constraints => ' + JSON.stringify( constraints) + '<br>' );
		//console.log( constraints );
		context_samplerate = $('#select_samplerate').val();
			
        context = new AudioContext({
           sampleRate: context_samplerate
        });
		
		sampleformat = $('.sampleformat input:checked').val();
		console.log(sampleformat);
		
		var checkedmethod = $('#checkbox_ringbuffer').is(':checked');
		
		
		if( $('#checkbox_ringbuffer').is(':checked') ){
			method = "bufferRing";
		} else if( $('#checkbox_wavesurfer').is(':checked') ){
			method = "wavesurfer";
		} else {
			method = "";
		}
		/*------ WAVESURFER -------*/
		if( method == "wavesurfer" ){
		
			if( !wavesurfer ){
				// Init wavesurfer
				wavesurfer = WaveSurfer.create({
					container: '#waveform',
					waveColor: 'black',
					interact: false,
					cursorWidth: 0,
					audioContext: context, //context || null,
					audioScriptProcessor: processor || null,
					plugins: [
						WaveSurfer.microphone.create({
							bufferSize: 512,
							numberOfInputChannels: 1,
							numberOfOutputChannels: 1,
							constraints: constraints
						})
					]
				});
			}

			var microphone;
			var buffersize;

			wavesurfer.microphone.on('deviceReady', function() {
				console.info('Device ready!', wavesurfer);
				microphone = wavesurfer.microphone;
				buffersize = microphone.bufferSize;
				console.log( microphone );
			});

			wavesurfer.microphone.on('deviceError', function(code) {
				console.warn('Device error: ' + code);
			});

			wavesurfer.on('error', function(e) {
				console.warn(e);
			});

			wavesurfer.microphone.reloadBuffer = function(event) {
				if (!this.paused) {
					this.wavesurfer.empty();
					this.wavesurfer.loadDecodedBuffer(event.inputBuffer);

					const interleaved = new Float32Array( event.inputBuffer.getChannelData(0).length );
					for (let src=0, dst=0; src < event.inputBuffer.getChannelData(0).length; src++, dst+=2) {
					  interleaved[dst] =   event.inputBuffer.getChannelData(0)[src];
					}

					var inputbuffer = convertFloat32ToInt16(interleaved);

					var args = {
						socket_id: socket_id,
						sampleRate: context_samplerate,
						bufferSize: wavesurfer.microphone.buffersize,
						latency: microphone.micContext.baseLatency,
						sampleformat: sampleformat,
						stream: inputbuffer
					};
					socket.emit( 'binaryData', args );



				}
			};

			wavesurfer.microphone.start();

		/*------ BUFFERRING -------*/
		} else if( method == "bufferRing" ){
			
			context.audioWorklet.addModule('js/worklet/microphone-worklet-processor.js').then(() => {
			  navigator.mediaDevices.getUserMedia( constraints ).then(stream => {
				
				  window.stream = stream;
				  var audioTracks = stream.getAudioTracks();
				  var kernelBufferSize = parseInt($('#select_setbuffersize').val());
				  console.log( "buffersize selectionné : " + $('#select_setbuffersize').val() );
				  
                  debug.append('streaming<br>');
                  debug.append( 'Got stream with constraints: => ' + JSON.stringify( constraints) + '<br>' );
                  debug.append( 'Selected audio device => ' + audioSource + '<br>' );
                  debug.append( 'Using audio device => ' + audioTracks[0].label + '<br>' );

                  debug.append( '----------------------------------<br>' );				  

                    var audioInput = context.createMediaStreamSource(stream);
                    recorder = new AudioWorkletNode(
                      context,
                      'microphone-worklet-processor',{
                        /*
                        channelCount : 1,
                        processorOptions: {
                          bufferSize: 128, //output buffer size
                          capacity:2048 // max fifo capacity
                        },
                        */
						  channelCount : 1,
						  processorOptions: {
							  kernelBufferSize: kernelBufferSize,
							  channelCount: 1,
                          },
                      },
                    );
				  
                    var buffersize = kernelBufferSize;
                    //$('#select_buffersize').val( buffersize );
				  	console.log( "recorder : " , recorder );
				  
				  	$('#select_buffersize').val( kernelBufferSize );
				  
                    debug.append( 'context state = ' + recorder.context.state + ', base latency: ' + recorder.context.baseLatency + ', sampleRate ' + recorder.context.sampleRate + ', buffersize ' + buffersize + '</br>' );
                    var tcid = makeid(5);
                    debug.append( '<div style="display:block; width:100%;" id="'+tcid+'"></div>');

                    recorder.port.onmessage = ({ data }) => {
                        $('#'+tcid).html( '<span style="display:block; width:250px;">context time : ' + recorder.context.currentTime + '</span>' );

                        var array = convertFloat32ToInt16( data );

                        var args = {
                            socket_id: socket_id,
                            sampleRate: recorder.context.sampleRate,
                            bufferSize: array.length,
                            latency: recorder.context.baseLatency,
                            sampleformat:sampleformat,
                            stream: array 
                        };
						//if( args.stream[0] ){
						   socket.emit( 'binaryData', args );
							console.log( "envoyé " , args.stream );
						  // }
                        
                        
                    };
                    audioInput.connect(recorder);
                  });
			});		
		
		} else { /*------ NORMAL WORKLET -------*/
			
			navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
				
				window.stream = stream;
				console.log("stream");
				debug.append('streaming<br>');

				var audioTracks = stream.getAudioTracks();

				debug.append( 'Got stream with constraints: => ' + JSON.stringify( constraints) + '<br>' );
				//console.log('Got stream with constraints:', constraints);

				debug.append( 'Selected audio device => ' + audioSource + '<br>' );
				//console.log('Selected audio device: ' + audioSource);

				debug.append( 'Using audio device => ' + audioTracks[0].label + '<br>' );
				//console.log('Using audio device: ' + audioTracks[0].label);

				

				debug.append( '----------------------------------<br>' );


				
				context.audioWorklet.addModule('js/worklet.js').then(() => {

					recorder = new AudioWorkletNode(context, 'port-processor',{
						channelCount : 1,
						channelCountMode : 'explicit',
						channelInterpretation : 'discrete',
						processorOptions: {
							//socket: socket,
							context_samplerate:context_samplerate,
						}
					});
					console.log( recorder );
					console.log( "baseLatency = " + recorder.context.baseLatency + " // samplerate = " + recorder.context.sampleRate );
					console.log( "buffersize = " + recorder.context.baseLatency * recorder.context.sampleRate * 2 );
					
					var audioInput = recorder.context.createMediaStreamSource(stream);
					
					var buffersize = recorder.context.baseLatency * recorder.context.sampleRate * 2;

					//const inputDevice = recorder.parameters.get('inputDevice');
					const deviceChannel = recorder.parameters.get('deviceChannel');

					//inputDevice.setValueAtTime( 0, recorder.context.currentTime + 1 );

					// selectionner la bonne voie
					deviceChannel.setValueAtTime( 0, recorder.context.currentTime  );

					$('#select_buffersize').val( buffersize );

					debug.append( 'context state = ' + recorder.context.state + ', base latency: ' + recorder.context.baseLatency + ', sampleRate ' + recorder.context.sampleRate + ', buffersize ' + buffersize + '</br>' );
					var tcid = makeid(5);
					debug.append( '<div style="display:block; width:100%;" id="'+tcid+'"></div>');
					
					var nextStartTime = 0;
					
					recorder.port.onmessage = (event) => {
						if(is_streaming){
							
							
							$('#'+tcid).html( '<span style="display:block; width:100%;">context time : ' + recorder.context.currentTime.toFixed(3) + ' / worklet time : ' + event.data.workletTime.toFixed(3) + '<br>décalage : ' + (recorder.context.currentTime - event.data.workletTime) + '</span>' );
							/*
							let fArr = new Float32Array( event.data.bufferstream );
							let buf = context.createBuffer(1, event.data.bufferstream.byteLength, context_samplerate);
							buf.copyToChannel(fArr, 0);
							let player = context.createBufferSource();
							player.buffer = buf;
							
							console.log( buf );*/
							//event.data.bufferstream = Float32Array(128);
							
							var array = convertFloat32ToInt16( event.data.bufferstream ); // array = ArrayBuffer(256)

							var args = {
								socket_id: socket_id,
								sampleRate: context_samplerate,
								bufferSize:array.byteLength,
								latency: recorder.context.baseLatency,
								sampleformat:sampleformat,
								stream: array
							};
							socket.emit( 'binaryData', args );
							//console.log( args.stream.byteLength );
							
						}
					};
					
					
				  audioInput.connect(recorder);//.connect(context.destination);

				});
			
				
				
				
				
			}).catch(function(err) {

			});
			
		}

    }
  
	function convertBlock(incomingData) { // incoming data is a UInt8Array
		var i, l = incomingData.length;
		var outputData = new Float32Array(incomingData.length);
		for (i = 0; i < l; i++) {
			outputData[i] = (incomingData[i] - 128) / 128.0;
		}
		return outputData;
	}
	
	
	function convertFloat32ToInt16Pouet(buffer) {
	  var l = buffer.length;  //Buffer
	  var buf = new Int16Array(l);

	  while (l--) {
          s = Math.max(-1, Math.min(1, buffer[l]));
          buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          //buf[l] = buffer[l]*0xFFFF; //old   //convert to 16 bit
        
      }
	  return buf.buffer;
	}	
	
	function convertFloat32ToInt16(buffer) {
        var l = buffer.length;
        var buf = new Int16Array(l);
        while (l--) {
            buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
        }
        return buf.buffer;
    }
	
	function set_blocks_inputsources(){
        navigator.mediaDevices.getUserMedia( rules )
          .then(stream => 
              navigator.mediaDevices
              .enumerateDevices()
              .then(devices => {
                return devices
              })
              .catch(err => {throw err})
          )
          .then(devices => {
            device_list = [];

            //lister les blocks sur scene
             $('.block .select').each(function( index ) {

                 var select = document.createElement( "select" );
                 select.id = "select" + index;

                 var btplay = document.createElement( "button" );
                 var btstop = document.createElement( "button" );

                 btplay.classList.add("btn-play","btn","btn-primary");
                 btplay.id = "btplay"+index;
                 btplay.innerHTML = "Play";
                 btplay.type = "button";

                 btstop.classList.add("btn-stop","btn","btn-primary");
                 btstop.id = "btstop"+index;
                 btstop.innerHTML = "Stop";
                 btstop.type = "button";

                 devices.forEach(function(device) {
                     if( device.kind == 'audioinput'  ){
                         //console.log(device.kind + ": " + device.label + " id = " + device.deviceId);
                         var added = document.createElement('option');
                         added.value = device.deviceId;
                         added.innerHTML = device.label;
                         select.append(added);
						 
						 device_list.push( device );
                     }	
                 });
				 select.dataset.socketid = $( this ).parent().find('.socket_id').text();
                 btplay.dataset.socketid = $( this ).parent().find('.socket_id').text();
                 btstop.dataset.socketid = $( this ).parent().find('.socket_id').text();

                 var wrapper;

                 if ($(".audio_options_wrapper")[index]){
                     wrapper = $(".audio_options_wrapper")[index];
                     wrapper.classList.add("audio_options_wrapper");
                     wrapper.html('');
                 } else {
                     wrapper = document.createElement( "div" );
                 }

                 wrapper.append( select, btplay, btstop );

                 $( this ).html( wrapper );

                 // start stream
                 btplay.addEventListener('click', function(){
                     //console.log( select.value );

                     // voice stream
                     stream_to_block( btplay.dataset.socketid );

                 })

                 // stop stream
                 btstop.addEventListener('click', function(){
                     close( btstop.dataset.socketid );
                 })
            });
			device_list = [...new Set(device_list)];
			console.log( device_list );

          })
          .catch(err => console.error(err));			  
    }
	
	

    //https://github.com/cwilso/Audio-Buffer-Draw/blob/master/js/audiodisplay.js
    function drawBuffer(data) {
        var canvas = document.getElementById("canvas"),
            width = canvas.width,
            height = canvas.height,
            context = canvas.getContext('2d');

        context.clearRect (0, 0, width, height);
        var step = Math.ceil(data.length / width);
        var amp = height / 2;
        for (var i = 0; i < width; i++) {
            var min = 1.0;
            var max = -1.0;
            for (var j = 0; j < step; j++) {
                var datum = data[(i * step) + j];
                if (datum < min)
                    min = datum;
                if (datum > max)
                    max = datum;
            }
            context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    }		  

          var downsampleBuffer = function (buffer, sampleRate, outSampleRate) {
              if (outSampleRate == sampleRate) {
                  return buffer;
              }
              if (outSampleRate > sampleRate) {
                  throw "downsampling rate show be smaller than original sample rate";
              }
              var sampleRateRatio = sampleRate / outSampleRate;
              var newLength = Math.round(buffer.length / sampleRateRatio);
              var result = new Int16Array(newLength);
              var offsetResult = 0;
              var offsetBuffer = 0;
              while (offsetResult < result.length) {
                  var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
                  var accum = 0, count = 0;
                  for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                      accum += buffer[i];
                      count++;
                  }

                  result[offsetResult] = Math.min(1, accum / count) * 0x7FFF;
                  offsetResult++;
                  offsetBuffer = nextOffsetBuffer;
              }
              return result.buffer;
          }
		  
		  
		  });







function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}