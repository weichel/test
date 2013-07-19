var config = require("../config").values;
var util = require("./util");

function createNetwork(server, game_server){
	var io = require('socket.io').listen(server);
	var socket = io.sockets;
	var ss = require('socket.io-stream');
	var path = require('path');
	var fs = require('fs');
	var UUID = require('node-uuid');


	io.configure(function(){
		io.set('log level', 0);
		
        io.set('authorization', function (handshakeData, callback) {
          callback(null, true);
        });


	});
	
	
	socket.on('connection', function (client) {

		client.on('join', function(){
			util.add(game_server.sessions, client.id);
			game_server.clients[client.id] = client;
			game_server.newPlayer(client);
			
			client.emit('joined',{id: client.id});
			setInterval(function(){if (game_server.game_core.players[client.id])console.log(game_server.game_core.players[client.id].pos);}, 1000);
		});

		client.on('message', function(message){
			var message_parts = message.split('.');
			var message_type = message_parts[0];
			
			switch(message_type){
				case 'i':game_server.onInput(client,message_parts);break;
			}
			
		});
		client.on('disconnect', function() {
			console.log('\t socket.io:: client disconnected ' + client.id );
			game_server.sessions.splice(game_server.sessions.indexOf(client.id),1);
			delete game_server.game_core.players[client.id];
			 delete game_server.clients[client.id];
			
		});

	
	});
}
exports.createNetwork = createNetwork;
