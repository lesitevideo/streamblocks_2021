// node client.js | aplay -f S16_LE  -c1 -r 44100 -B 100000

const macpro_ip = 'http://192.168.2.22:1664';
const BLOCK_ID = 23;

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

var is_spawned = false;

var socket = require('socket.io-client')( macpro_ip,{
  query: {
    block_id: results.wlan0[0]
  }
});

socket.binaryType = 'arraybuffer';


var args = [
		'-f','S16_LE',
		'-c1',
		'-r','48000',
		'-B','5333'
];

var child;


socket.on('connect', function(){
	console.log('connected with id : ' , socket.id);
});

socket.on('disconnect', function(){
	console.log('disconnected');
});

socket.on('set args', function( args ){
	console.log('args envoyés : ', args);
});

socket.on('binaryData', function( data ){
	//console.log( data );
	if( is_spawned ){
		child.stdin.write( data.stream );
		
	} else {
		args= [
			'-f',data.sampleformat,
			'-c1',
			'-r', data.sampleRate,
			'-B', parseInt( data.latency * 1000000 ) //<- seconds to microsecondes
		];
		span_childprocess();
	}
	//process.stdout.write( data.stream );
});

socket.on('stop stream', function ( id ){
	if( is_spawned ){
		child.kill('SIGTERM');
		is_spawned = false;
	}	
});


function span_childprocess(){
	child = child_process.spawn( "aplay", args );
	child.stderr.on('data',function(data) {
		process.stdout.write('Debug => '+ String( data) + '\n');
	});
	process.stdout.write('aplay args => '+ args + '\n');
	is_spawned = true;
}

