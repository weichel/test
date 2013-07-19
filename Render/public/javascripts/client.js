/*
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function( callback,  element){
              window.setTimeout(callback, 1000 / 60);
            };
})();
*/

var game = {};

window.onload = function(){

	game = new game_core();
	
	game.viewport = document.getElementById('viewport');
	game.viewport.width = game.world.width;
	game.viewport.height = game.world.height;
	game.ctx = game.viewport.getContext('2d');
	game.ctx.font = '11px "Futura"';

	game.socket = io.connect('http://localhost:8888');
	
	game.socket.on('connect', function(){
		game.socket.emit('join');
	});
	game.socket.on('joined', function(data){
		game.players.self = new game_player(data.id);
		game.update(Date.now());
	});
	
	game.socket.on('serverupdate', function(data){
		game.client_serverupdate(data);
	});

}