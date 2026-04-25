(function(root){
  // Simple deterministic platformer physics for the gravity-flip puzzle
  function rectsOverlap(a,b){ return !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h); }

  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  function Game(level){
    this.width = level.width || 800;
    this.height = level.height || 400;
    this.platforms = clone(level.platforms || []);
    this.key = clone(level.key || {x:0,y:0,w:12,h:12});
    this.door = clone(level.door || {x:0,y:0,w:28,h:36});
    this.startX = typeof level.startX === 'number' ? level.startX : 50;
    this.g = typeof level.g === 'number' ? level.g : 2000; // px/s^2
    this.speed = typeof level.speed === 'number' ? level.speed : 120; // px/s
    this.reset();
  }

  Game.prototype.reset = function(){
    this.char = { x: this.startX, y: 0, w: 28, h: 28, vx: this.speed, vy: 0 };
    // place on top of any floor under startX if available
    var placed = false;
    for(var i=0;i<this.platforms.length;i++){
      var p = this.platforms[i];
      if(p.oneSided && this.char.x + this.char.w > p.x && this.char.x < p.x + p.w){
        this.char.y = p.y - this.char.h; placed = true; break;
      }
    }
    if(!placed) this.char.y = this.height - this.char.h - 60;

    this.gravityDir = 1; // 1 = down, -1 = up
    this.keyCollected = false;
    this.win = false;
    this.time = 0;
  };

  Game.prototype.flipGravity = function(){ this.gravityDir = -this.gravityDir; if(this.char) this.char.vy = 0; };

  Game.prototype.step = function(dt){
    if(this.win) return;
    this.time += dt;
    var c = this.char;
    // record previous positions for one-sided collision checks
    var prev = { x: c.x, y: c.y, left: c.x, right: c.x + c.w, top: c.y, bottom: c.y + c.h };

    // ensure horizontal speed magnitude constant (auto-walk)
    var dir = c.vx >= 0 ? 1 : -1;
    if(Math.abs(c.vx) < 0.001) dir = 1;
    c.vx = this.speed * dir;

    // gravity
    c.vy += this.g * this.gravityDir * dt;

    // integrate
    c.x += c.vx * dt;
    c.y += c.vy * dt;

    // world bounds horizontal => reverse direction (walk back-and-forth)
    if(c.x < 0){ c.x = 0; c.vx = -c.vx; }
    if(c.x + c.w > this.width){ c.x = this.width - c.w; c.vx = -c.vx; }

    // reset onGround
    c.onGround = false;

    // collisions with platforms
    for(var i=0;i<this.platforms.length;i++){
      var p = this.platforms[i];
      if(p.solid){
        // full AABB
        var charRect = { x: c.x, y: c.y, w: c.w, h: c.h };
        var pRect = { x: p.x, y: p.y, w: p.w, h: p.h };
        if(rectsOverlap(charRect,pRect)){
          // compute overlap
          var overlapX = Math.min(c.x + c.w, p.x + p.w) - Math.max(c.x, p.x);
          var overlapY = Math.min(c.y + c.h, p.y + p.h) - Math.max(c.y, p.y);
          if(overlapX < overlapY){
            // resolve horizontally
            if(c.x + c.w/2 < p.x + p.w/2) c.x -= overlapX; else c.x += overlapX;
            c.vx = -c.vx;
          } else {
            // resolve vertically
            if(c.y + c.h/2 < p.y + p.h/2){
              c.y -= overlapY; c.vy = 0; c.onGround = true;
            } else { c.y += overlapY; c.vy = 0; c.onGround = true; }
          }
        }
      } else {
        // one-sided platforms: only collide from gravity-facing side
        var prevBottom = prev.bottom;
        var prevTop = prev.top;
        var currBottom = c.y + c.h;
        var currTop = c.y;
        var horizOverlap = (c.x + c.w > p.x) && (c.x < p.x + p.w);
        if(this.gravityDir > 0){
          // landing on top
          if(prevBottom <= p.y && currBottom >= p.y && horizOverlap){
            c.y = p.y - c.h; c.vy = 0; c.onGround = true;
          }
        } else {
          // hitting underside
          if(prevTop >= p.y + p.h && currTop <= p.y + p.h && horizOverlap){
            c.y = p.y + p.h; c.vy = 0; c.onGround = true;
          }
        }
      }
    }

    // key pickup
    if(!this.keyCollected){
      var keyRect = { x: this.key.x, y: this.key.y, w: this.key.w, h: this.key.h };
      var charRect = { x: c.x, y: c.y, w: c.w, h: c.h };
      if(rectsOverlap(keyRect, charRect)) this.keyCollected = true;
    }

    // door
    if(this.keyCollected){
      var doorRect = { x: this.door.x, y: this.door.y, w: this.door.w, h: this.door.h };
      var charRect2 = { x: c.x, y: c.y, w: c.w, h: c.h };
      if(rectsOverlap(doorRect, charRect2)) this.win = true;
    }
  };

  // expose
  if(typeof module !== 'undefined' && module.exports) module.exports = Game;
  else root.Game = Game;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
