$( document ).ready(function() {
		
	var context_samplerate;
	
	var recorder;	
	
    var socket = io();
    socket.binaryType = 'arraybuffer';

    var device_list = [];
    var rules = {
        video:false,
        audio:true
    };
    //console.log( new AudioContext({sampleRate: 48000}) );

    var client,
        recorder,
        context,
        bStream;
        /*contextSampleRate = (new AudioContext({sampleRate: 48000})).sampleRate;
        resampleRate = contextSampleRate,
        worker = new Worker('js/worker/resampler-worker.js');

        worker.postMessage({cmd:"init",from:contextSampleRate,to:resampleRate});

        worker.addEventListener('message', function (e) {
            if (bStream && bStream.writable)
                bStream.write(convertFloat32ToInt16(e.data.buffer));
        }, false);
        */


	/*------ SOCKET -------*/

    socket.on('connect', function(){
        console.log('connected to socket');
        //socket.emit('get status', '');
    });

    socket.on('blocks status', function(data){
        console.log('blocks status => ', data);

       $('#scene').html('');

        data.forEach(function(item){
            $('#scene').append( $('#block_template').html() );
            $('#scene').find( "h3" ).text( 'Block ' + item.block_id  );
            $('#scene').find( ".socket_id" ).text( item.socket_id  );  

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
        if(recorder){
            recorder.disconnect();
        }
        socket.emit( 'stop stream', '' );
    }
		  
	
			
    function stream_to_block( socket_id ){

        var constraints = {
			audio: {
				sampleSize: 16,
				channelCount: 1,
				autoGainControl:false,
				//echoCancellation: true,
				//latency: 0.10
			},
			video: false
		};

        close();
		
        navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
			
			console.log( "streaming" )
			
			/*
			context = new AudioContext({
				latencyHint: 'interactive',
				sampleRate: 44100
			});
			var audioInput = context.createMediaStreamSource(stream);
			context.audioWorklet.addModule('js/worklet.js').then(() => {
				
			  	let recorder = new AudioWorkletNode(context, 'port-processor');
				
				recorder.port.onmessage = (event) => {
					// Handling data from the processor.
					console.log( event.data.data );
				};

			  recorder.port.postMessage('Hello!');
			  audioInput.connect(recorder).connect(context.destination)	
			});
			*/
			context_samplerate = $('#select_samplerate').val();
			console.log( context_samplerate  );

           context = new AudioContext({
               sampleRate: context_samplerate,
               //latencyHint: 'interactive'
           });

			console.log(context);

            var audioInput = context.createMediaStreamSource(stream);
            var bufferSize = 0;

            recorder = context.createScriptProcessor(bufferSize, 1, 1); // <-- createScriptProcessor obsolete cf. https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createScriptProcessor

            recorder.onaudioprocess = function(e){
                var left = e.inputBuffer.getChannelData(0);

                var array = convertFloat32ToInt16( left );
                var data = {
                    socket_id: socket_id,
                    sampleRate: context_samplerate,
                    bufferSize:bufferSize,
                    stream: array
                };
				
                socket.emit( 'binaryData', data );
            };

            audioInput.connect(recorder);
            recorder.connect(context.destination);


        }).catch(function(err) {

        });
        


    }
	
		  
    function onAudio(e) {
        var left = e.inputBuffer.getChannelData(0);

        worker.postMessage({cmd: "resample", buffer: left});

       //drawBuffer(left);
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
            device_list = devices;

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
                         added.value = device.label;
                         added.innerHTML = device.label;
                         select.append(added);
                     }	
                 });

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

