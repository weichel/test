var game_server = module.exports = {clients: {},sessions: [], count:0, game_core: {}},
	UUID 		 = require('node-uuid');
	
	global.window = global.document = global;
	
	require('../public/javascripts/game.core.js');
	
	game_server.local_time = 0;
	game_server._dt = Date.now();
	game_server._dte = Date.now();
	
	setInterval(function(){
        game_server._dt = Date.now() - game_server._dte;
        game_server._dte = Date.now();
        game_server.local_time += game_server._dt/1000.0;
    }, 4);
	
	
	
	game_server.game_core = new game_core(game_server);
	
	game_server.game_core.update(Date.now());
	
	game_server.newPlayer = function(client){
		this.game_core.players[client.id] = new game_player(client.id);
	};
	
	game_server.onInput = function(client, parts){
		var input_commands = parts[1].split('-');
        var input_time = parts[2].replace('-','.');
        var input_seq = parts[3];
		
		if ( this.game_core.players[client.id].id == client.id )this.game_core.server_handle_inputs(client, input_commands, input_time, input_seq);
		
	};