// node client.js | aplay -f S16_LE  -c1 -r 44100 -B 100000
//var Sound = require('./aplay.js');
//var child_process = require('child_process');

const macpro_ip = 'http://192.168.2.22:1664';
const BLOCK_ID = 23;
var myid;

const { networkInterfaces } = require('os');

const nets = networkInterfaces();
const results = Object.create(null); // Or just '{}', an empty object

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

//console.log(results.wlan0[0]);

var stdout = require('stdout-stream');

var socket = require('socket.io-client')( macpro_ip,{
  query: {
    block_id: results.wlan0[0]
  }
});

//var music = new Sound();
var args = [
		'-f','S16_LE',
		'-c1',
		'-r','48000',
		'-B','5333'
];

//const child = child_process.spawnSync( "aplay", args ); //, {stdio: [ process.stdin, process.stdout, process.stderr ]}

socket.binaryType = 'arraybuffer';

socket.on('connect', function(){
	myid = socket.id;
	console.log('connected with id : ' , socket.id);
	
});

socket.on('binaryData', function( data ){
	
	
	//console.log( child.stdout );
	//child.stdout.write( data.stream );
	
	//music.play( data.stream );
	process.stdout.write( data.stream );
	
});

socket.on('stop stream', function ( id ){
	
	//process.stdout.write( '' );
	
});

socket.on('disconnect', function(){
	console.log('disconnected');
});

