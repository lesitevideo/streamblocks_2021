//requires
const express = require('express');
const fs = require('fs');
const app = express();

/*
// Certificat
const privateKey = fs.readFileSync('ssl/localhost.key', 'utf8');
const certificate = fs.readFileSync('ssl/localhost.crt', 'utf8');
//const ca = fs.readFileSync('ssl/kinoki.cer', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	//ca: ca
};
*/


var http = require('http').Server( app );
var io = require('socket.io')(http, { wsEngine: 'ws' });

var connected_blocks = [];

// express routing
app.use(express.static('public'));


// signaling
io.on('connection', function (socket) {

	
	var block_id = null;
	
	if( socket.handshake.query.block_id ){
		block_id =  socket.handshake.query.block_id;
		
		
		socket.block_id = block_id;
		
		if( !connected_blocks.includes( block_id ) ){
			
			console.log('a block connected ',socket.id);
			
			connected_blocks.push( {
				block_id:block_id,
				socket_id:socket.id
			} );
			socket.broadcast.emit('blocks status', connected_blocks);
		}
	} else {
		console.log('thomas connected',socket.id);
		socket.emit('blocks status', connected_blocks);
	}
	
	
	
	socket.on('disconnect', function (event) {
		// loop sur les clients connectés et mettre a jour la liste des connectés
		console.log( "deconnexion" );
		
		var still_connected = [];
		
		socket.adapter.rooms.forEach(function(map, val, key){
			//console.log( val );
			still_connected.push( val );
		}) ;
		/*var still_connected = Object.keys(io.engine.clients);*/
		var new_connected_blocks = [];
		connected_blocks.forEach(function(item){
			if( still_connected.includes( item.socket_id ) ){
				new_connected_blocks.push( item );
			}
		});
		connected_blocks = new_connected_blocks;
		//console.log( connected_blocks );
		
		socket.broadcast.emit('blocks status', connected_blocks);
	});
	

	socket.on('get status', function (){
		socket.emit('blocks status', connected_blocks);
    });
	
	/*
	socket.on('set args', function ( data ){
		io.to( data.socket_id ).emit( 'data', data );
    });
	*/
	
	socket.on('binaryData', function ( binaryData ){
		//console.log( 'send binaryData ');
		io.to( binaryData.socket_id ).emit( 'binaryData', binaryData );
		//socket.broadcast.emit('binaryData', binaryData);
    });
	
	socket.on('wrtcchannelName', function ( wrtcchannelName ){
		//console.log( 'send binaryData ');
		socket.broadcast.emit('wrtcchannelName', wrtcchannelName);
    });
	
	socket.on('stop stream', function ( id ){
		socket.broadcast.emit('stop stream', id);
    });

});






// listener
http.listen(1664, function () {
    console.log('listening on *:1664');
});