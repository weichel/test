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
		width:2000,
		height: 2000,
	};
	
	this.players = {};		
	
	this._pdt = 0.0001;
	this._pdte = Date.now();
	this.local_time = 0.016;
	this._dt = Date.now();
	this._dte = Date.now();
	
	this.create_physics_simulation();
	this.create_timer();
	
	
	this.lm_handler = this.create_bullet;
	this.map = new game_hash_map(this.world);
	if('undefined' != typeof(global)){//server
		this.server = true;
		this.server_time = 0;
		
	}
	else {//client
		this.client_config();
		this.players.others = [];
		for ( var i = 0; i < 50; i++ ){
			this.players.others.push(new game_dummy_player());
		}
		this.server_updates = [];
	}
};

var game_player = function(id, g){
	this.id = id;
	this.game = g;
	this.pos = {x:100, y:100};
	this.size = {x:16, y:16, hx:8, hy:8};
	this.color = '#FFFFFF';
	this.inputs = [];
	this.speed = 120;
	this.old_state = {pos:{x:100, y:100}};
    this.cur_state = {pos:{x:100, y:100}};
    this.state_time = Date.now();
	this.bullets = [];
	this.hp = 100;
	
	this.pos_limits = {
            x_min: this.size.hx,
            x_max: this.game.world.width - this.size.hx,
            y_min: this.size.hy,
            y_max: this.game.world.height - this.size.hy
    };
	
	this.bbox = {hx:10,hy:10};
};

var game_dummy_player = function() {
	this.pos = {x:100, y:100};
	this.size = {x:16, y:16, hx:8, hy:8};
	this.show = 0;
	this.bbox = {hx:10,hy:10};
};

var game_bullet = function(player) {
	this.pid = player.id;
	this.speed = 1000;
	this.dir = {x:0, y:0};
	this.pos = {x:0, y:0};
	this.size = {x:2, y:2, hx:1, hy:1};
	this.color = '#FFFFFF';
	
	this.pos_limits = {
            x_min: this.size.hx,
            x_max: player.game.world.width - this.size.hx,
            y_min: this.size.hy,
            y_max: player.game.world.height - this.size.hy
    };
	
	this.bbox = {hx:2,hy:2};
};

var game_dummy_bullet = function() {
	this.pos = {x:-1, y:-1};
	this.size = {x:2, y:2, hx:1, yx:1};
	this.show = 0;
};

var game_hash_map = function(w){
	this.width = w.width;
	this.height = w.height;
	this.cellsize = 200;
	this.cols = w.width / this.cellsize;
	this.rows = w.height / this.cellsize;
	
	this.grid = [];
	for (var i = 0; i < (this.cols*this.rows); i++){
		this.grid.push([]);
	}
	
};

game_core.prototype.grid_ids = function(item){
	var arr = [];
	var min = {x:item.pos.x-item.size.hx ,y:item.pos.y-item.size.hy};
	var max = {x:item.pos.x+item.size.hx ,y:item.pos.y+item.size.hy};
	if(min.x < 0) min.x = 0;if(min.y < 0)min.y = 0;
	if(max.x > this.map.width)max.x = this.map.width;
	if(max.y > this.map.height)max.y = this.map.height;
	
	var a = parseInt((Math.floor(min.x / this.map.cellsize))+(Math.floor(min.y / this.map.cellsize))*this.map.cols);
	arr.push(a);
	var b = parseInt((Math.floor(max.x / this.map.cellsize))+(Math.floor(min.y / this.map.cellsize))*this.map.cols);
	if (arr.indexOf(b) == -1)arr.push(b);
	var c = parseInt((Math.floor(min.x / this.map.cellsize))+(Math.floor(max.y / this.map.cellsize))*this.map.cols);
	if (arr.indexOf(c) == -1)arr.push(c);
	var d = parseInt((Math.floor(max.x / this.map.cellsize))+(Math.floor(max.y / this.map.cellsize))*this.map.cols);
	if (arr.indexOf(d) == -1)arr.push(d);

	return arr;
};

game_core.prototype.reset_hash_map = function(){
	this.map.grid = [];
	for (var i = 0; i < (this.map.cols*this.map.rows); i++){
		this.map.grid.push([]);
	}
};

game_core.prototype.addto_hash_map = function(item){
	var ids = this.grid_ids(item);
	for (var j = 0; j < ids.length;j++){
		this.map.grid[ids[j]].push(item);
	}
};

if( 'undefined' != typeof global ) {
    module.exports = global.game_core = game_core;
	module.exports = global.game_player = game_player;
}

Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)); };
    //copies a 2d vector like object from one to another
game_core.prototype.pos = function(a) { return {x:a.x,y:a.y}; };
    //Add a 2d vector with another one and return the resulting vector
game_core.prototype.v_add = function(a,b) { return { x:(a.x+b.x).fixed(), y:(a.y+b.y).fixed() }; };
    //Subtract a 2d vector with another one and return the resulting vector
game_core.prototype.v_sub = function(a,b) { return { x:(a.x-b.x).fixed(),y:(a.y-b.y).fixed() }; };
    //Multiply a 2d vector with a scalar value and return the resulting vector
game_core.prototype.v_mul_scalar = function(a,b) { return {x: (a.x*b).fixed() , y:(a.y*b).fixed() }; };
    //For the server, we need to cancel the setTimeout that the polyfill creates
game_core.prototype.stop_update = function() { window.cancelAnimationFrame( this.updateid ); };
    //Simple linear interpolation
game_core.prototype.lerp = function(p, n, t) { var _t = Number(t); _t = (Math.max(0, Math.min(1, _t))).fixed(); return (p + _t * (n - p)).fixed(); };
    //Simple linear interpolation between 2 vectors
game_core.prototype.v_lerp = function(v,tv,t) { return { x: this.lerp(v.x, tv.x, t), y:this.lerp(v.y, tv.y, t) }; };
	//Unit vector from a to b
game_core.prototype.v_unit = function(a,b){
	var aa = b.x-a.x;
	var bb = b.y-a.y;
	return { x:((aa)/(Math.sqrt(aa*aa+bb*bb))).fixed(3), y:((bb)/(Math.sqrt(aa*aa+bb*bb))).fixed(3) };
};



game_player.prototype.die = function(){
	this.pos.x = 100;this.pos.y = 100;
	this.hp = 100;
};

game_player.prototype.draw = function(){

        this.game.ctx.fillStyle = this.color;
        this.game.ctx.fillRect(this.pos.x - this.size.hx, this.pos.y - this.size.hy, this.size.x, this.size.y);

		this.draw_info();
};

game_player.prototype.draw_info = function(){
	this.game.ctx.fillStyle = this.color;
	this.game.ctx.fillText(this.hp + "",parseInt(this.pos.x-9), parseInt(this.pos.y-10));
};

game_bullet.prototype.draw = function(){
	game.ctx.fillStyle = this.color;
	game.ctx.fillRect(this.pos.x - 1, this.pos.y - 1, 2, 2);
};

game_bullet.prototype.destroy = function(player){
	player.bullets.splice(player.bullets.indexOf(this),1);
	delete this;
};

game_core.prototype.client_config = function(){
	this.input_seq = 0;
	this.server = false;
	this.dt = 0.016;
	this.net_offset = 100; //100 ms latency between server and client interpolation for other clients
    this.buffer_size = 2; //The size of the server history to keep for rewinding/interpolating.
    this.target_time = 0.01; //the time where we want to be in the server timeline
    this.oldest_tick = 0.01; //the last time tick we have available in the buffer
	this.mouse = {};
	this.mouse.q = [];
    this.client_time = 0.01; //Our local 'clock' based on server time - client interpowww
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
        
		
	this.client_process_updates();
	
	
	for (var i = 0; i < this.players.self.bullets.length; i++){
		this.players.self.bullets[i].draw();
	}
	
        //Now they should have updated, we can draw the entity
    for (var i = j = 0; i < this.players.others.length; i++){
		if ( this.players.others[i].show ){
			j = this.players.others[i];
			
			game.ctx.fillStyle = '#cc00FF';
			game.ctx.fillRect(j.pos.x - 8, j.pos.y - 8, 16, 16);
			if (j.bullets){
				for (var k = 0; k < j.bullets.length;k++){
					game.ctx.fillStyle = '#FFFFFF'
					game.ctx.fillRect(j.bullets[k].pos.x - 1, j.bullets[k].pos.y - 1, 2, 2);
				}
			}
		}
	}
        //When we are doing client side prediction, we smooth out our position
        //across frames using local input states we have stored.
    this.client_update_local_position();

    if (this.players.self)this.players.self.draw();


}; 

game_core.prototype.client_process_updates = function(){
	if(!this.server_updates.length) return;
	
    var current_time = this.client_time;
    var count = this.server_updates.length-1;
    var target = null;
    var previous = null;
	
	for(var i = 0; i < count; ++i) {
        var point = this.server_updates[i];
        var next_point = this.server_updates[i+1];

        if(current_time > point.t && current_time < next_point.t) {
            target = next_point;
            previous = point;
            break;
        }
    }

    if(!target) {
        target = this.server_updates[0];
        previous = this.server_updates[0];
    }	
	 if(target && previous) {

		this.target_time = target.t;

		var difference = this.target_time - current_time;
		var max_difference = (target.t - previous.t).fixed(3);
		var time_point = (difference/max_difference).fixed(3);

		if( isNaN(time_point) ) time_point = 0;
		if(time_point == -Infinity) time_point = 0;
		if(time_point == Infinity) time_point = 0;

		var latest_server_data = this.server_updates[ this.server_updates.length-1 ];

		
		
		if (target.ps.length == previous.ps.length){
			for ( var i = 0; i < previous.ps.length; i++ ){
				var ot = target.ps[i];
				var op = previous.ps[i];
				var v = this.v_lerp(op.p, ot.p, time_point);
				this.players.others[i].pos = this.v_lerp( this.players.others[i].pos, v, this._pdt*25);
				this.players.others[i].show = 1;
				this.players.others[i].bullets = previous.ps[i].b;
			}
		}
	}
};

game_core.prototype.server_update = function() {
	this.server_time = this.local_time;
		
	var a = [];
	for(var i = j = 0; i < this.server_instance.sessions.length;i++){
		j = this.server_instance.sessions[i];
		a.push({p:this.players[j].pos, id: this.players[j].id, b: this.players[j].bullets});
	}

	this.laststate = {
		u: {},
		ps: a,
		t : this.server_time
	}; 
	for(var i= j = 0; i < this.server_instance.sessions.length;i++){
		j = this.server_instance.sessions[i];
		this.laststate.u = {p:this.players[j].pos, is: this.players[j].last_input_seq, di:i, hp:this.players[j].hp};
		this.server_instance.clients[this.players[j].id].emit('serverupdate',this.laststate);
	}
	
};

game_core.prototype.client_serverupdate = function(data){
	this.server_time = data.t;
	this.client_time = this.server_time - (this.net_offset/1000);
	
	this.players.self.pos = this.pos(data.u.p);
	this.players.self.hp = data.u.hp;
	data.ps.splice(data.u.di,1);
	//this.players.others = data.ps;
	this.server_updates.push(data);
	
	if(this.server_updates.length >= ( 60*this.buffer_size )) {
		this.server_updates.splice(0,1);
    }
	this.oldest_tick = this.server_updates[0].t;
	
	this.client_prediction_correction();
};



//Input
game_core.prototype.process_inputs = function(player){
	if (player){
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
					if(key.indexOf('/') == -1){
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
					}else{
						var parts = key.split('/');
						if (parts[0] == 'lm'){
							this.create_bullet(player,{x:parseInt(parts[1]), y:parseInt(parts[2])});
						}
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
	}
};

game_core.prototype.client_handle_inputs = function(){
	var input = [];
	if (this.keyboard.w)input.push('u');
	if (this.keyboard.a)input.push('l');
	if (this.keyboard.s)input.push('d');
	if (this.keyboard.d)input.push('r');
	
	for( var i = 0; i < this.mouse.q.length; i++){
		input.push(this.mouse.q[i]);
	}
	this.mouse.q = [];
	
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

	this.reset_hash_map();
	
	for ( var i = j = 0; i < this.server_instance.sessions.length; i++){
		j = this.server_instance.sessions[i];
		this.players[j].old_state.pos = this.pos( this.players[j].pos );
		var nd = this.process_inputs(this.players[j]);
		this.players[j].pos = this.v_add( this.players[j].old_state.pos, nd);
		
		for (var k = 0; k < this.players[j].bullets.length; k++){
			this.players[j].bullets[k].pos = this.v_add(this.players[j].bullets[k].pos, this.physics_movement_vector(this.players[j].bullets[k],this.players[j].bullets[k].dir.x, this.players[j].bullets[k].dir.y ));
			if(!this.check_collision_bullet(this.players[j].bullets[k], this.players[j]))this.addto_hash_map(this.players[j].bullets[k]);
			
		}
		//this.addto_hash_map(this.players[j]);
		this.players[j].inputs = [];
		
		
	}

	for ( var i = 0; i < this.server_instance.sessions.length; i++){
		j = this.players[this.server_instance.sessions[i]];
		this.check_collision(j);
		if (j.hp <= 0)j.die();
	}
};

game_core.prototype.client_update_physics = function(){

	this.reset_hash_map();
	for ( var i = 0; i < this.players.others.length; i++){
		this.addto_hash_map(this.players.others[i]);
	}
	if (this.players.self){
		this.players.self.old_state.pos = this.pos( this.players.self.cur_state.pos );
		var nd = this.process_inputs(this.players.self);
		this.players.self.cur_state.pos = this.v_add( this.players.self.old_state.pos, nd);
		this.players.self.state_time = this.local_time;
		
		for (var i = 0; i < this.players.self.bullets.length; i++){
			this.players.self.bullets[i].pos = this.v_add(this.players.self.bullets[i].pos, this.physics_movement_vector(this.players.self.bullets[i],this.players.self.bullets[i].dir.x, this.players.self.bullets[i].dir.y ));
			this.check_collision_bullet(this.players.self.bullets[i], this.players.self);
		}
	}
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
		
		this.check_collision(this.players.self);
};

game_core.prototype.create_bullet = function(player,dest){
	var bullet = new game_bullet(player);
	bullet.pos = player.pos;
	bullet.dir = this.v_unit(player.pos,dest);
	bullet.dest_handler = function(){bullet.destroy(player)};
	player.bullets.push(bullet);
};

game_core.prototype.client_prediction_correction = function(){
	if(!this.server_updates.length) return;
	var latest = this.server_updates[this.server_updates.length-1];
	var server_last = latest.u.is;
	if (server_last){
		var last = -1;
		for(var i = 0; i < this.players.self.inputs.length; ++i) {
            if(this.players.self.inputs[i].seq == server_last) {last = i;break;}
        }
		if(last != -1) {
                var number_to_clear = Math.abs(last - (-1));
                this.players.self.inputs.splice(0, number_to_clear);
                this.players.self.cur_state.pos = this.pos(latest.u.p);
                this.players.self.last_input_seq = last;
                this.client_update_physics();
                this.client_update_local_position();

        }
	}
};

game_core.prototype.check_collision = function(item){

	if(item.pos.x <= item.pos_limits.x_min) {item.pos.x = item.pos_limits.x_min;}
    if(item.pos.x >= item.pos_limits.x_max ) { item.pos.x = item.pos_limits.x_max;}
    if(item.pos.y <= item.pos_limits.y_min) {item.pos.y = item.pos_limits.y_min; }
    if(item.pos.y >= item.pos_limits.y_max ) {item.pos.y = item.pos_limits.y_max;}

	if (this.server){//Server side bullet collisions, players colliding with bullets
		if(this.map.grid.length){
			var ids = this.grid_ids(item);
			for (var i = 0; i < ids.length; i++){
				var b = this.map.grid[ids[i]];
				for (var j = 0; j < b.length; j++){
					if ( item.id != b[j].pid){
						if(this.check_collision_bbox(item, b[j])){
							item.hp -= 10;
							if (typeof b[j].dest_handler == 'function')b[j].dest_handler();
						}
					}
				}
			}
		}
	}
	else{//Client side bullet collisions, bullet collides with players
		for ( var i = 0; i < item.bullets.length; i++){
			for( var j = 0; j < this.players.others.length; j++)
			{
				if (item.bullets[i]){
					if(this.check_collision_bbox(this.players.others[j], item.bullets[i])){
						item.bullets[i].dest_handler();
					}	
				}
			}
		}
	}
	
	item.pos.x = item.pos.x.fixed(4);
    item.pos.y = item.pos.y.fixed(4);
};

game_core.prototype.check_collision_bullet = function(item,p){
	if(item.pos.x <= item.pos_limits.x_min || item.pos.x >= item.pos_limits.x_max || item.pos.y <= item.pos_limits.y_min || item.pos.y >= item.pos_limits.y_max) {
		item.destroy(p);
		return true;
	}else {
		item.pos.x = item.pos.x.fixed(4);
		item.pos.y = item.pos.y.fixed(4);
		return false;
	}
};

game_core.prototype.check_collision_bbox = function(a,b){
	return !( (a.pos.y+a.bbox.hy < b.pos.y-b.bbox.hy) || (a.pos.y-a.bbox.hy > b.pos.y+b.bbox.hy) || (a.pos.x-a.bbox.hx > b.pos.x+b.bbox.hx) || (a.pos.x+a.bbox.hx < b.pos.x-b.size.hx) );
};

