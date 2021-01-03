const macpro_ip = 'http://192.168.2.22:1664';
const BLOCK_ID = 23;

var is_spawned = false;
var child;
var args = [];
/* 
		'-f','S16_LE',
		'-c1',
		'-r','48000',
		'-B','5333'
*/

var child_process = require('child_process');
const { networkInterfaces } = require('os');

const nets = networkInterfaces();
const results = Object.create(null); // {}


for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
            if (!results[name]) {
                results[name] = [];
            }
            results[name].push(net.address);
        }
    }
}

var socket = require('socket.io-client')( macpro_ip,{
  query: {
    block_id: results.wlan0[0] // ID = IP du rpi
  }
});

socket.binaryType = 'arraybuffer';


socket.on('binaryData', function( data ){
	
	if( is_spawned ){
		
		child.stdin.write( data.stream );
		
		//process.stdout.write('received '+ data.stream.byteLength + ' bytes\n');
		
	} else {
		args= [
			'-f',data.sampleformat,
			'-c1',
			'-r', data.sampleRate,
			'-B', parseInt( (data.latency - ((1/3)*0.1) ) * 1000000 ) //<- seconds to microsecondes
		];
		
		child = child_process.spawn( "aplay", args );
		child.stderr.on('data',function(data) {
			process.stdout.write('Debug => '+ String( data) + '\n');
			return;
		});
		process.stdout.write('aplay args => '+ args + '\n');
		is_spawned = true;
	}
	
	//process.stdout.write( data.stream );
});

socket.on('stop stream', function ( id ){
	if( is_spawned ){
		is_spawned = false;
		child.kill('SIGTERM');
	}	
});

socket.on('connect', function(){
	console.log('connected with id : ' , socket.id);
});

socket.on('disconnect', function(){
	console.log('disconnected');
});

socket.on('set args', function( args ){
	console.log('args envoyés : ', args);
});
