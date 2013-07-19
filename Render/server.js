var config = require ('./config').values

var app = require ('./app').getApp(config)

var port = parseInt(process.argv[2], 10) || 8888
app.server.listen(port);

var game_server = require('./lib/game.server.js');
var network = require ('./lib/network.js');
network.createNetwork(app.server, game_server);



console.log("Express server listening on port 8888");

process.on('SIGINT', function () {
	app.close();
	console.log();
	console.log('Shutting down server..');
	process.exit(0);
});