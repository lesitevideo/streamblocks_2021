// node client.js | aplay -f S16_LE  -c1 -r 44100 -B 100000
//node client.js | aplay -f S16_LE -c1 -r 48000 -B 100000  --buffer-size=1024

const macpro_ip = 'http://192.168.2.22:1664';
const BLOCK_ID = 23;
var myid;

var stdout = require('stdout-stream');

var socket = require('socket.io-client')( macpro_ip,{
  query: {
    block_id: BLOCK_ID
  }
});

socket.binaryType = 'arraybuffer';

socket.on('connect', function(){
	myid = socket.id;
	console.log('connected with id : ' , socket.id);
});

socket.on('binaryData', function( data ){
	process.stdout.write( data.stream );
});

socket.on('stop stream', function ( id ){

});

socket.on('disconnect', function(){
	console.log('disconnected');
});
