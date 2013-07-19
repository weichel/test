var frame_time = 60/1000;
if('undefined' != typeof(global)) frame_time = 45;

( function () {

    var lastTime = 0;
    var vendors = [ 'ms', 'moz', 'webkit', 'o' ];

    for ( var x = 0; x < vendors.length && !window.requestAnimationFrame; ++ x ) {
        window.requestAnimationFrame = window[ vendors[ x ] + 'RequestAnimationFrame' ];
        window.cancelAnimationFrame = window[ vendors[ x ] + 'CancelAnimationFrame' ] || window[ vendors[ x ] + 'CancelRequestAnimationFrame' ];
    }

    if ( !window.requestAnimationFrame ) {
        window.requestAnimationFrame = function ( callback, element ) {
            var currTime = Date.now(), timeToCall = Math.max( 0, frame_time - ( currTime - lastTime ) );
            var id = window.setTimeout( function() { callback( currTime + timeToCall ); }, timeToCall );
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if ( !window.cancelAnimationFrame ) {
        window.cancelAnimationFrame = function ( id ) { clearTimeout( id ); };
    }

}() );



var game_core = function(gs){

	this.server_instance = gs;

	this.world = {
		width:1080,
		height: 768,
	};
	
	this.players = {};		
	
	this._pdt = 0.0001;
	this._pdte = Date.now();
	this.local_time = 0.016;
	this._dt = Date.now();
	this._dte = Date.now();
	
	this.create_physics_simulation();
	this.create_timer();
	
	if('undefined' != typeof(global)){//server
		this.server = true;
		this.server_time = 0;
	}
	else {//client
		this.client_config();
		this.players.others = [];
	}
};

var game_player = function(id){
	this.id = id;
	this.pos = {x:100, y:100};
	this.size = {x:16, y:16, hx:8, hy:8};
	this.color = '#FFFFFF';
	this.inputs = [];
	this.speed = 120;
	this.old_state = {pos:{x:100, y:100}};
    this.cur_state = {pos:{x:100, y:100}};
    this.state_time = Date.now();
};

if( 'undefined' != typeof global ) {
    module.exports = global.game_core = game_core;
	module.exports = global.game_player = game_player;
}

Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)); };
game_core.prototype.pos = function(a) { return {x:a.x,y:a.y}; };
game_core.prototype.v_add = function(a,b) { return { x:(a.x+b.x).fixed(), y:(a.y+b.y).fixed() }; };


game_player.prototype.draw = function(){
        game.ctx.fillStyle = this.color;
        game.ctx.fillRect(this.pos.x - this.size.hx, this.pos.y - this.size.hy, this.size.x, this.size.y);
};



game_core.prototype.client_config = function(){
	this.input_seq = 0;
	this.server = false;
	this.dt = 0.016;
	this.net_offset = 100; //100 ms latency between server and client interpolation for other clients
    this.buffer_size = 2; //The size of the server history to keep for rewinding/interpolating.
    this.target_time = 0.01; //the time where we want to be in the server timeline
    this.oldest_tick = 0.01; //the last time tick we have available in the buffer

    this.client_time = 0.01; //Our local 'clock' based on server time - client interpolation(net_offset).
    this.server_time = 0.01; 
	this.input = [];
	this.keyboard = {a:0, s:0, d:0, w:0};
	var g = this;
	var combos = [{	keys: "w",  on_keydown: function() {  g.keyboard.w = 1; },on_keyup: function() {  g.keyboard.w = 0;}},
						  { keys: "a",	on_keydown: function() {  g.keyboard.a = 1;	},on_keyup: function() {  g.keyboard.a = 0;}},
						  { keys: "s",	on_keydown: function() {  g.keyboard.s = 1;	},on_keyup: function() {  g.keyboard.s = 0;}},
						  { keys: "d",	on_keydown: function() {  g.keyboard.d = 1;	},on_keyup: function() {  g.keyboard.d = 0;}}];
			
	keypress.register_many(combos);
}


game_core.prototype.create_timer = function(){
    setInterval(function(){
        this._dt = Date.now() - this._dte;
        this._dte = Date.now();
        this.local_time += this._dt/1000.0;
    }.bind(this), 4);
}


//Update
game_core.prototype.update = function(t) {
	this.dt = this.lastframetime ? ( (t - this.lastframetime)/1000.0).fixed() : 0.016;

    this.lastframetime = t;

    if(!this.server) {
        this.client_update();
    } else {
        this.server_update();
    }
	 this.updateid = window.requestAnimationFrame( this.update.bind(this), this.viewport );


};

game_core.prototype.client_update = function() {

    this.ctx.clearRect(0,0,1080,768);

	//Capture inputs from the player
	this.client_handle_inputs();
        
        //Now they should have updated, we can draw the entity
    for (var i = j = 0; i < this.players.others.length; i++){
		j = this.players.others[i].p;
		
		game.ctx.fillStyle = '#cc00FF';
		game.ctx.fillRect(j.x - 8, j.y - 8, 16, 16);
	}
        //When we are doing client side prediction, we smooth out our position
        //across frames using local input states we have stored.
    this.client_update_local_position();

    if (this.players.self)this.players.self.draw();


}; 

game_core.prototype.server_update = function() {
	this.server_time = this.local_time;
		
	var a = [];
	for(var i = j = 0; i < this.server_instance.sessions.length;i++){
		j = this.server_instance.sessions[i];
		a.push({p:this.players[j].pos, id: this.players[j].id});
	}

	this.laststate = {
		u: {},
		ps: a,
		t : this.server_time
	}; 
	for(var i= j = 0; i < this.server_instance.sessions.length;i++){
		j = this.server_instance.sessions[i];
		this.laststate.u = {p:this.players[j].pos, is: this.players[j].last_input_seq, di:i};
		//this.laststate.ps.splice(this.laststate.ps.indexOf({p:this.players[j].pos, id:this.players[j].id}),1);
		this.server_instance.clients[this.players[j].id].emit('serverupdate',this.laststate);
	}
	
};

game_core.prototype.client_serverupdate = function(data){
	this.server_time = data.t;
	this.client_time = this.server_time - (this.net_offset/1000);
	
	this.players.self.pos = this.pos(data.u.p);
	
	data.ps.splice(data.u.di,1);
	this.players.others = data.ps;
	
};


//Input
game_core.prototype.process_inputs = function(player){

    var x_dir = 0;
    var y_dir = 0;
	var ic = player.inputs.length;
	if(ic) {
        for(var j = 0; j < ic; ++j) {

            if(player.inputs[j].seq <= player.last_input_seq) continue;

            var input = player.inputs[j].inputs;
            var c = input.length;
            for(var i = 0; i < c; ++i) {
                var key = input[i];
                if(key == 'l') {
                    x_dir -= 1;
                }
                if(key == 'r') {
                    x_dir += 1;
                }
                if(key == 'd') {
                    y_dir += 1;
                }
                if(key == 'u') {
                    y_dir -= 1;
                }
            }
        }
    }
	
	var res = this.physics_movement_vector(player,x_dir, y_dir);
	if(player.inputs.length) {
        player.last_input_time = player.inputs[ic-1].time;
        player.last_input_seq = player.inputs[ic-1].seq;
    }
	return res;
};

game_core.prototype.client_handle_inputs = function(){
	var input = [];
	if (this.keyboard.w)input.push('u');
	if (this.keyboard.a)input.push('l');
	if (this.keyboard.s)input.push('d');
	if (this.keyboard.d)input.push('r');
	
	if (input.length){
	    this.input_seq += 1;

        this.players.self.inputs.push({
            inputs : input,
           time : this.local_time.fixed(3),
            seq : this.input_seq
        });


        var server_packet = 'i.';
            server_packet += input.join('-') + '.';
            server_packet += this.local_time.toFixed(3).replace('.','-') + '.';
            server_packet += this.input_seq;
			
        this.socket.send( server_packet );
		
	}
}

game_core.prototype.server_handle_inputs = function(c, ic, it, is){
	this.players[c.id].inputs.push({inputs:ic, time:it, seq:is});
};


//Physics
game_core.prototype.create_physics_simulation = function() {

    setInterval(function(){
        this._pdt = (Date.now() - this._pdte)/1000.0;
        this._pdte = Date.now();
        this.update_physics();
    }.bind(this), 15);

};

game_core.prototype.update_physics = function() {

    if(this.server) {
        this.server_update_physics();
    } else {
        this.client_update_physics();
    }

};

game_core.prototype.server_update_physics = function(){

	
	for ( var i = j = 0; i < this.server_instance.sessions.length; i++){
		j = this.server_instance.sessions[i];
		this.players[j].old_state.pos = this.pos( this.players[j].pos );
		var nd = this.process_inputs(this.players[j]);
		this.players[j].pos = this.v_add( this.players[j].old_state.pos, nd);
		this.players[j].inputs = [];
	}
	
};

game_core.prototype.client_update_physics = function(){

	this.players.self.old_state.pos = this.pos( this.players.self.cur_state.pos );
	var nd = this.process_inputs(this.players.self);
	this.players.self.cur_state.pos = this.v_add( this.players.self.old_state.pos, nd);
	this.players.self.state_time = this.local_time;
};

game_core.prototype.physics_movement_vector = function(p,x,y) {
    return {
        x : (x * (p.speed * 0.015)).fixed(3),
        y : (y * (p.speed * 0.015)).fixed(3)
    };

};

game_core.prototype.client_update_local_position = function(){
	var t = (this.local_time - this.players.self.state_time) / this._pdt;
	
	    var old_state = this.players.self.old_state.pos;
        var current_state = this.players.self.cur_state.pos;
		this.players.self.pos = current_state;
};

game_core.prototype.client_prediction_correction = function(){
	//if (!this.server_updates.
};