
var getApp = function (config) {

		var flash = require('connect-flash')
	  , util = require("util")
	  , io = require("socket.io")  
	  , express = require('express')
	  , engine = require('ejs-locals')
	  , form  = require('express-form')
	  , http = require('http')
	  , field = form.field 
	  , fs = require('fs')
	  , http = require('http');

	var app = module.exports = express();
	app.server = http.createServer(app);
	//middleware
	function local_env (req, res, next){
		res.locals('real_time_server', config.server.production.real_time_server)
		next();
	}

	app.configure(function(){

	app.use(express.static(__dirname + '/public'));
	app.use(express.static(__dirname + '/ejs'));
	app.use(local_env);
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({ secret: 'super-duper-secret-secret'}));
    app.use(flash());
    app.engine('ejs', engine);// use ejs-locals for all ejs templates
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
    app.use(app.router);
	
	
	var oneYear = 31557600000;
		//app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
	});

	app.configure('development', function(){
		app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	});

	app.configure('production', function (){
		app.use(express.errorHandler());
	});

	//routes
	require('./routes/index').configure(app);

	return app;
};

exports.getApp = getApp;






/*
var app = express();
app.configure(function(){
    app.set('port', process.env.PORT || 8888);
	app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({ secret: 'super-duper-secret-secret'}));
    app.use(flash());
    app.engine('ejs', engine);// use ejs-locals for all ejs templates
    app.set('views',__dirname + '/views');//set views directory
    app.set('view engine', 'ejs'); // so you can render('index')
    app.engine('html', require('ejs').renderFile);
    app.use(app.router);
});


app.get('/',function(req,res){

res.render('index', {data:"none"});

});

http.createServer(app).listen(app.get('port'), function(){
    console.log("Server listening on port " + app.get('port'));
});

*/



