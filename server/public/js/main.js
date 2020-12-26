$( document ).ready(function() {
		
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
        context;

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
		  

			  
    function close(){ // <- todo : passer en variable le recorder à arreter ( et donc avant faire un array dynamique avec les recorders actifs )
        console.log('close');
		debug.append('<b>close</b><br>');
		
        if(recorder){
            recorder.disconnect();
        }
		if(context){
            context.close();
        }
		if(debuginterval){
           clearInterval(debuginterval);
        }
		
		$('#select_buffersize').val( 0 );
        socket.emit( 'stop stream', '' );
    }
		  
	
			
    function stream_to_block( socket_id ){

		socket.emit('stop stream', '');
		
		var autoGainControl = $('#checkbox_autoGainControl').is(':checked');
		var echoCancellation = $('#checkbox_echoCancellation').is(':checked');
		var audioSource = $('#select0').val();  
		
		
		if (window.stream) {
          window.stream.getTracks().forEach(track => {
            track.stop();
          });
        }
		
		
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
		if(checkedmethod){
			method = "bufferRing";
		} else {
			method = "";
		}
		
		if( method == "bufferRing" ){
		
			context.audioWorklet.addModule('js/worklet/microphone-worklet-processor.js').then(() => {
			  navigator.mediaDevices.getUserMedia( constraints ).then(stream => {
				  
				window.stream = stream;

				console.log("stream");
				
				debug.append('streaming<br>');
				//console.log( "streaming" )

				var audioTracks = stream.getAudioTracks();

				debug.append( 'Got stream with constraints: => ' + JSON.stringify( constraints) + '<br>' );
				//console.log('Got stream with constraints:', constraints);

				debug.append( 'Selected audio device => ' + audioSource + '<br>' );
				//console.log('Selected audio device: ' + audioSource);

				debug.append( 'Using audio device => ' + audioTracks[0].label + '<br>' );
				//console.log('Using audio device: ' + audioTracks[0].label);

				

				debug.append( '----------------------------------<br>' );				  
				  

				  const audioInput = context.createMediaStreamSource(stream);
				  const recorder = new AudioWorkletNode(
					context,
					'microphone-worklet-processor',
					{
					  channelCount : 1,
					  processorOptions: { //Passing the arguments to processor
						bufferSize: 128, //output buffer size
						capacity:2048 // max fifo capacity
					  },
					},
				  );
				  console.log( recorder );
				  recorder.port.onmessage = ({ data }) => {
					  //console.log('Your own buffer >> ', data); //Receiving data from worklet thread
					  var buffersize = recorder.context.baseLatency * recorder.context.sampleRate * 2;
					  
					  // data => Uint8Array(128) et il faudrait un ArrayBuffer(256)
					  
					  
					  var array = convertFloat32ToInt16( Float32Array.from(data) ); //Float32Array(128)
					  
					  var args = {
						  socket_id: socket_id,
						  sampleRate: recorder.context.sampleRate,
						  bufferSize:buffersize,
						  latency: recorder.context.baseLatency,
						  sampleformat:sampleformat,
						  stream: array 
					  };
					  socket.emit( 'binaryData', args );
					  //console.log( args );
				  };
				  audioInput.connect(recorder).connect(context.destination);
				});
			});		
		
		} else {
			
			navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
				
				window.stream = stream;

				console.log("stream");
				
				debug.append('streaming<br>');
				//console.log( "streaming" )

				var audioTracks = stream.getAudioTracks();

				debug.append( 'Got stream with constraints: => ' + JSON.stringify( constraints) + '<br>' );
				//console.log('Got stream with constraints:', constraints);

				debug.append( 'Selected audio device => ' + audioSource + '<br>' );
				//console.log('Selected audio device: ' + audioSource);

				debug.append( 'Using audio device => ' + audioTracks[0].label + '<br>' );
				//console.log('Using audio device: ' + audioTracks[0].label);

				

				debug.append( '----------------------------------<br>' );


				var audioInput = context.createMediaStreamSource(stream);
				context.audioWorklet.addModule('js/worklet.js').then(() => {

					let recorder = new AudioWorkletNode(context, 'port-processor');

					console.log( device_list );

					var buffersize = recorder.context.baseLatency * recorder.context.sampleRate * 2;

					//const inputDevice = recorder.parameters.get('inputDevice');
					const deviceChannel = recorder.parameters.get('deviceChannel');

					//inputDevice.setValueAtTime( 0, recorder.context.currentTime + 1 );

					// selectionner la bonne voie
					deviceChannel.setValueAtTime( 0, recorder.context.currentTime  );

					$('#select_buffersize').val( buffersize );

					//debug.append( 'context state = ' + recorder.context.state + ', base latency: ' + recorder.context.baseLatency + ', sampleRate ' + recorder.context.sampleRate + ', buffersize ' + buffersize + '</br>' );
					
					var tcid = makeid(5);

					debug.append( '<div style="display:block; width:100%;" id="'+tcid+'"></div>');
				
					recorder.port.onmessage = (event) => {
						
						$('#'+tcid).html( '<span style="display:block; width:250px;">context time : ' + recorder.context.currentTime + '</span>' );
						
						//event.data.bufferstream = Float32Array(128);
						
                        var array = convertFloat32ToInt16( event.data.bufferstream ); // array = ArrayBuffer(256)

                        var args = {
                            socket_id: socket_id,
                            sampleRate: context_samplerate,
                            bufferSize:buffersize,
                            latency: recorder.context.baseLatency,
							sampleformat:sampleformat,
                            stream: array
                        };
                        socket.emit( 'binaryData', args );
                       // console.log( args );

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