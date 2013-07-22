

var game = {};

window.onload = function(){

	game = new game_core();
	
	game.viewport = document.getElementById('viewport');
	game.viewport.width = 1024;
	game.viewport.height = 768;
	game.ctx = game.viewport.getContext('2d');
	game.ctx.font = '11px "Futura"';

	$(game.viewport).mousemove(function(e){game.mouse.pos = {x: e.pageX - this.offsetLeft, y:e.pageY - this.offsetTop};});
	$(game.viewport).click(function(e){game.mouse.q.push("lm/"+parseInt(game.mouse.pos.x + game.camera.xView)+"/"+parseInt(game.mouse.pos.y+game.camera.yView));});

	
	game.socket = io.connect('http://localhost:8888');
	
	game.socket.on('connect', function(){
		game.socket.emit('join');
	});
	game.socket.on('joined', function(data){
		game.players.self = new game_player(data.id, game);
		game.update(Date.now());
		game.camera.follow(game.players.self, game.viewport.width/2,game.viewport.height/2);
		
	});
	
	game.socket.on('serverupdate', function(data){
		game.client_serverupdate(data);
	});

}