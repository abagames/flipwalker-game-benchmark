(function(){
  // Level definition used by the renderer and identical to the test harness
  var level = {
    width: 800, height: 400,
    startX: 50,
    speed: 120,
    g: 2000,
    // platforms: oneSided floors/ceilings, solid walls if needed
    platforms: [
      { x: 0, y: 340, w: 200, h: 60, oneSided: true },      // left floor
      { x: 200, y: 60, w: 150, h: 20, oneSided: true },    // ceiling walkway 1
      { x: 360, y: 260, w: 60, h: 20, oneSided: true },    // alcove platform (key)
      { x: 420, y: 340, w: 60, h: 60, oneSided: true },    // small floor after alcove
      { x: 480, y: 60, w: 170, h: 20, oneSided: true },    // ceiling walkway 2
      { x: 650, y: 340, w: 150, h: 60, oneSided: true },  // right floor
      // optional solid walls (small) to keep walking inside area
      { x: -10, y: 0, w: 10, h: 400, solid: true },
      { x: 800, y: 0, w: 10, h: 400, solid: true }
    ],
    key: { x: 380, y: 232, w: 12, h: 12 },
    door: { x: 760, y: 312, w: 28, h: 36 }
  };

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var game = new Game(level);

  var last = performance.now();
  var simAuto = false;
  // auto-solve flip x positions determined by tuning/simulation
  var autoFlips = [160, 323, 423, 720];

  document.getElementById('simulateBtn').addEventListener('click', function(){
    simAuto = !simAuto; this.textContent = simAuto ? 'Stop Auto-solve' : 'Auto-solve (demo)';
    if(simAuto) game.reset();
  });
  document.getElementById('resetBtn').addEventListener('click', function(){ game.reset(); simAuto = false; document.getElementById('simulateBtn').textContent = 'Auto-solve (demo)'; });

  window.addEventListener('keydown', function(e){ if(e.code === 'Space') { game.flipGravity(); e.preventDefault(); } });
  canvas.addEventListener('pointerdown', function(){ game.flipGravity(); });

  function draw(){
    var now = performance.now();
    var dt = Math.min(0.032, (now - last)/1000);
    last = now;

    // auto-solve triggers flips when character passes x thresholds
    if(simAuto){
      var cx = game.char.x;
      while(autoFlips.length && cx >= autoFlips[0]){ game.flipGravity(); autoFlips.shift(); }
    }

    game.step(dt);

    // draw background
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = '#d0f0ff'; ctx.fillRect(0,0,canvas.width,canvas.height);

    // draw platforms
    for(var i=0;i<level.platforms.length;i++){
      var p = level.platforms[i];
      ctx.fillStyle = p.solid ? '#444' : (p.y < 120 ? '#554' : '#333');
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }

    // key
    if(!game.keyCollected){ ctx.fillStyle = '#ffcc00'; ctx.fillRect(level.key.x, level.key.y, level.key.w, level.key.h); }

    // door
    ctx.fillStyle = game.keyCollected ? '#6bff6b' : '#ff6b6b';
    ctx.fillRect(level.door.x, level.door.y, level.door.w, level.door.h);

    // character
    var c = game.char;
    ctx.save();
    ctx.translate(c.x + c.w/2, c.y + c.h/2);
    // draw body
    ctx.fillStyle = '#222';
    ctx.fillRect(-c.w/2, -c.h/2, c.w, c.h);
    // draw eyes to show orientation
    ctx.fillStyle = '#fff';
    if(game.gravityDir > 0){ ctx.fillRect(-6, -6, 4, 4); ctx.fillRect(6, -6, 4, 4); }
    else { ctx.fillRect(-6, 2, 4, 4); ctx.fillRect(6, 2, 4, 4); }
    ctx.restore();

    // HUD
    var status = document.getElementById('status');
    status.textContent = (game.keyCollected ? 'Key: obtained' : 'Key: missing') + (game.win ? ' — Door reached! Level complete.' : '');

    if(game.win){ ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 120, 800, 120); ctx.fillStyle = '#fff'; ctx.font = '28px sans-serif'; ctx.fillText('LEVEL COMPLETE — Well done!', 200, 190); }

    requestAnimationFrame(draw);
  }
  draw();
})();
