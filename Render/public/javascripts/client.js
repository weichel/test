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
	game.viewport.width = 1080;
	game.viewport.height = 768;
	game.ctx = game.viewport.getContext('2d');
	game.ctx.font = '11px "Futura"';

	$(game.viewport).mousemove(function(e){game.mouse.pos = {x: e.pageX - this.offsetLeft, y:e.pageY - this.offsetTop};});
	$(game.viewport).click(function(e){game.mouse.q.push("lm/"+game.mouse.pos.x+"/"+game.mouse.pos.y);});

	
	game.socket = io.connect('http://ec2-107-21-75-125.compute-1.amazonaws.com:8888');
	
	game.socket.on('connect', function(){
		game.socket.emit('join');
	});
	game.socket.on('joined', function(data){
		game.players.self = new game_player(data.id, game);
		game.update(Date.now());
	});
	
	game.socket.on('serverupdate', function(data){
		game.client_serverupdate(data);
	});

}
