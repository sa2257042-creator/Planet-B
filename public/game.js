(() => {
  const ROOM = "SPACE-B", canvas = document.getElementById("spaceCanvas"), ctx = canvas.getContext("2d");
  const statusText = document.getElementById("statusText"), badgeCount = document.getElementById("badgeCount"), onlineCount = document.getElementById("onlineCount"), toast = document.getElementById("toast");
  const socket = io();
  let W=1000,H=600,dpr=1,stars=[],planets=[],badges=0,animation=null,toastTimer=null,started=false;
  let particles=[],trail=[],audioCtx=null,soundEnabled=true,lastTrail=0;
  let ship={x:110,y:300,angle:-.1,r:18};

  function wrap(value,size){return ((value%size)+size)%size}
  function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=Math.max(320,r.width);H=Math.max(300,r.height);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);makeStars();if(!planets.length)newGalaxy();ship.x=wrap(ship.x,W);ship.y=wrap(ship.y,H)}
  function makeStars(){stars=Array.from({length:Math.floor(W*H/3500)},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+.25,a:Math.random()*.55+.2,p:Math.random()*6.28}))}
  const colors=[["#9af7ff","#3774d9"],["#ffc2f1","#b34fd3"],["#ffe9a6","#d77b56"],["#b7ffcc","#2d9b9a"],["#c8c2ff","#6859d8"],["#ffb6a8","#c34c72"]];

  // All sounds are generated locally, so no sound files or extra downloads are needed.
  function unlockAudio(){if(!soundEnabled)return;try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume()}catch(e){}}
  function tone(freq,duration,type="sine",volume=.06,endFreq=null,delay=0){if(!soundEnabled)return;unlockAudio();if(!audioCtx)return;try{const now=audioCtx.currentTime+delay,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(Math.max(30,freq),now);if(endFreq!==null)osc.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),now+duration);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now);osc.stop(now+duration+.03)}catch(e){}}
  function playSpin(){tone(220,.45,"sawtooth",.035,720);tone(680,.5,"sine",.025,180,.08);tone(330,.7,"triangle",.025,560,.35)}
  function playEngine(){tone(115,.7,"sawtooth",.035,260);tone(235,.5,"triangle",.018,390,.08)}
  function playExplosion(){tone(180,.35,"sawtooth",.065,42);tone(540,.28,"triangle",.05,150,.03);tone(880,.45,"sine",.035,360,.12)}
  function playCelebration(){[523,659,784,1047].forEach((f,i)=>tone(f,.32,"triangle",.055,f*1.08,i*.11))}
  function playNoHit(){tone(300,.22,"sine",.025,230);tone(230,.25,"sine",.02,190,.13)}
  function newGalaxy(){
    planets=[];
    // Three large, collectible B planets.
    for(let i=0;i<3;i++){
      const r=34+Math.random()*6;let p,n=0;
      do{p={x:45+Math.random()*(W-90),y:45+Math.random()*(H-90),r,c:colors[(i*2)%colors.length],phase:Math.random()*6.28,target:true};n++}
      while(n<100&&(Math.hypot(p.x-ship.x,p.y-ship.y)<r+100||planets.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<r+q.r+55)));
      planets.push(p);
    }
    // Small planets add depth and can also be collected.
    for(let i=0;i<8;i++){
      const r=16+Math.random()*5;let p,n=0;
      do{p={x:18+Math.random()*(W-36),y:18+Math.random()*(H-36),r,c:colors[(i+1)%colors.length],phase:Math.random()*6.28,target:true};n++}
      while(n<100&&(Math.hypot(p.x-ship.x,p.y-ship.y)<r+45||planets.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<r+q.r+12)));
      planets.push(p);
    }
    if(started){statusText.textContent="New galaxy ready!";say("A new galaxy with 3 target planets and small background planets has appeared!")}
    draw(performance.now())
  }
  function say(s){toast.textContent=s;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2600)}
  function reset(){animation=null;badges=0;badgeCount.textContent="0 ⭐";particles=[];trail=[];ship={x:Math.max(65,W*.11),y:H*.5,angle:-.08,r:18};newGalaxy();statusText.textContent="Ready for launch!";say("Mission reset. Ready for the next student!")}
  function start(){started=true;unlockAudio();document.getElementById("setupPanel").classList.add("setup-started");statusText.textContent="Game started — scan the QR code!";say("Game started! Scan the QR code to connect.");tone(440,.16,"triangle",.035,660);document.getElementById("setupPanel").scrollIntoView({behavior:"smooth",block:"nearest"})}
  function spin(){if(!started){say("Press Start Game first!");return}if(animation){say("Finish the current move first!");return}playSpin();const a=ship.angle,dir=Math.random()<.5?1:-1,turns=2+Math.random()*2,offset=(Math.random()-.5)*Math.PI*1.1;animation={phase:"spin",at:performance.now(),duration:3000,a0:a,a1:a+dir*turns*Math.PI*2+offset};statusText.textContent="Spinning…";say("A: Spin initiated!")}
  function move(){if(!started){say("Press Start Game first!");return}if(animation){say("Finish the current move first!");return}playEngine();animation={phase:"move",at:performance.now(),x0:ship.x,y0:ship.y,x1:ship.x+Math.cos(ship.angle)*100,y1:ship.y+Math.sin(ship.angle)*100,duration:650};statusText.textContent="Flying forward…";say("B: Moving forward!")}
  function addBurst(x,y,count=30,celebrate=false){const palette=celebrate?["#fff7a8","#78f6ff","#ff8ed4","#ffffff"]:["#fff4a8","#75eaff","#c8a7ff","#ffffff"];for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=celebrate?1.2+Math.random()*5:1+Math.random()*4.8;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:35+Math.random()*35,max:70,size:1.5+Math.random()*3,color:palette[Math.floor(Math.random()*palette.length)],spark:Math.random()>.5})}}
  function addTrail(){const bx=ship.x-Math.cos(ship.angle)*19,by=ship.y-Math.sin(ship.angle)*19;trail.push({x:bx+(Math.random()-.5)*5,y:by+(Math.random()-.5)*5,life:18,max:18,size:3+Math.random()*5,color:Math.random()>.5?"#6eeaff":"#ffb3e2"});if(trail.length>100)trail.shift()}
  function drawBackground(t){const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,"#090f31");g.addColorStop(.55,"#10113a");g.addColorStop(1,"#170f37");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);for(const s of stars){ctx.globalAlpha=s.a*(.65+.35*Math.sin(t*.001+s.p));ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;for(let i=0;i<4;i++){const x=W*(.16+i*.25),y=H*(.25+(i%2)*.48),r=Math.min(W,H)*.23,glow=ctx.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,i%2===0?"#3d4ab322":"#9b3a8520");glow.addColorStop(1,"#00000000");ctx.fillStyle=glow;ctx.fillRect(x-r,y-r,r*2,r*2)}}
  function drawPlanet(p,t){const glow=ctx.createRadialGradient(p.x,p.y,p.r*.5,p.x,p.y,p.r*1.7);glow.addColorStop(0,p.c[0]+"28");glow.addColorStop(1,"#00000000");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,p.r*1.7,0,Math.PI*2);ctx.fill();if(p.target&&p.r>34){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.28+Math.sin(t*.0004+p.phase)*.05);ctx.strokeStyle="#c6d6ff8c";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,p.r*1.35,p.r*.38,0,0,Math.PI*2);ctx.stroke();ctx.restore()}const g=ctx.createRadialGradient(p.x-p.r*.36,p.y-p.r*.42,p.r*.08,p.x,p.y,p.r);g.addColorStop(0,p.c[0]);g.addColorStop(.65,p.c[1]);g.addColorStop(1,"#171846");ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.target?"#ffffff72":"#ffffff35";ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle="#fff";ctx.font=`900 ${Math.max(17,p.r*.88)}px Nunito,sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.shadowColor="#0b1647";ctx.shadowBlur=5;ctx.fillText("B",p.x,p.y+1);ctx.shadowBlur=0}
  function drawEffects(){for(const p of trail){ctx.globalAlpha=Math.max(0,p.life/p.max)*.65;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=15;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(p.life/p.max),0,Math.PI*2);ctx.fill()}ctx.shadowBlur=0;for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=p.spark?12:4;if(p.spark){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.life*.08);ctx.fillRect(-p.size*.5,-p.size*1.8,p.size,p.size*3.6);ctx.restore()}else{ctx.beginPath();ctx.arc(p.x,p.y,p.size*(p.life/p.max),0,Math.PI*2);ctx.fill()}}ctx.globalAlpha=1;ctx.shadowBlur=0}
  function drawShip(t=0){ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);const moving=animation&&animation.phase==="move",spinning=animation&&animation.phase==="spin";if(moving){const flame=18+Math.random()*12;const fg=ctx.createLinearGradient(-12,0,-12-flame,0);fg.addColorStop(0,"#fff5b5");fg.addColorStop(.35,"#72efff");fg.addColorStop(1,"#f85fc7");ctx.fillStyle=fg;ctx.shadowColor="#65eaff";ctx.shadowBlur=24;ctx.beginPath();ctx.moveTo(-12,-5);ctx.lineTo(-12-flame,0);ctx.lineTo(-12,5);ctx.closePath();ctx.fill()}ctx.shadowColor=spinning?"#ff86d6":"#67e9ff";ctx.shadowBlur=spinning?34:22;ctx.fillStyle="#ff9e77";ctx.beginPath();ctx.moveTo(-13,-6);ctx.lineTo(-28,0);ctx.lineTo(-13,6);ctx.closePath();ctx.fill();ctx.fillStyle="#ffe7a0";ctx.beginPath();ctx.moveTo(-13,-3);ctx.lineTo(-22,0);ctx.lineTo(-13,3);ctx.closePath();ctx.fill();ctx.shadowBlur=8;ctx.fillStyle="#eaf7ff";ctx.strokeStyle="#75dfff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(23,0);ctx.quadraticCurveTo(3,-18,-14,-11);ctx.lineTo(-10,0);ctx.lineTo(-14,11);ctx.quadraticCurveTo(3,18,23,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#58c8ff";ctx.beginPath();ctx.ellipse(3,0,7,5,0,0,Math.PI*2);ctx.fill();ctx.restore()}
  function findHit(x=ship.x,y=ship.y){return planets.find(p=>Math.hypot(x-p.x,y-p.y)<=p.r+ship.r)}
  function hitTest(p=null){if(!p)return false;planets=planets.filter(planet=>planet!==p);badges++;badgeCount.textContent=`${badges} ⭐`;statusText.textContent="Planet collected!";addBurst(p.x,p.y,42,true);playExplosion();playCelebration();say(`Planet collected! +1 badge! Total: ${badges}`);return true}
  function update(t){
    if(animation){
      if(animation.phase==="spin"){
        const p=Math.min(1,(t-animation.at)/animation.duration),e=1-Math.pow(1-p,3);
        ship.angle=animation.a0+(animation.a1-animation.a0)*e;
        if(t-lastTrail>25){addTrail();lastTrail=t}
        if(p>=1){animation=null;statusText.textContent="Spin complete. Press B to move!"}
      }else if(animation.phase==="move"){
        const a=animation;
        const p=Math.min(1,(t-a.at)/a.duration),e=1-Math.pow(1-p,2);
        const oldX=ship.x,oldY=ship.y;
        ship.x=wrap(a.x0+(a.x1-a.x0)*e,W);ship.y=wrap(a.y0+(a.y1-a.y0)*e,H);
        if(t-lastTrail>18){addTrail();lastTrail=t}
        // Check several points between frames so fast movement does not skip planets.
        for(let i=1;i<=8;i++){
          const q=i/8;
          const x=wrap(oldX+(ship.x-oldX)*q,W),y=wrap(oldY+(ship.y-oldY)*q,H);
          const hit=findHit(x,y);
          if(hit)hitTest(hit);
        }
        if(p>=1){animation=null;statusText.textContent="Flight complete! Press B to fly again."}
      }
    }
    trail=trail.filter(p=>p.life>0);for(const p of trail){p.life--;p.size*=1.005}
    particles=particles.filter(p=>p.life>0);for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vx*=.985;p.vy*=.985;p.life--}
  }
  function draw(t=0){drawBackground(t);planets.forEach(p=>drawPlanet(p,t));drawEffects();ctx.save();ctx.strokeStyle="#a6f5ff44";ctx.setLineDash([4,7]);ctx.beginPath();ctx.moveTo(ship.x,ship.y);ctx.lineTo(ship.x+Math.cos(ship.angle)*70,ship.y+Math.sin(ship.angle)*70);ctx.stroke();ctx.restore();drawShip(t)}
  function loop(t){update(t);draw(t);requestAnimationFrame(loop)}
  async function loadQr(){try{const res=await fetch(`/api/qr?room=${encodeURIComponent(ROOM)}`);const data=await res.json();document.getElementById("qrImage").src=data.dataUrl;document.getElementById("qrImage").hidden=false;document.getElementById("qrPlaceholder").hidden=true;document.getElementById("qrUrl").textContent=data.url;document.getElementById("modalQrImage").src=data.dataUrl;document.getElementById("modalQrUrl").textContent=data.url}catch(e){say("Couldn't load QR code. Please refresh.")}}
  socket.on("connect",()=>socket.emit("join-room",ROOM));
  socket.on("joined-room",({room})=>document.getElementById("roomLabel").textContent=room);
  socket.on("room-status",({count})=>onlineCount.textContent=count>1?`${count-1} phone(s) connected`:"Waiting for phone");
  socket.on("game-command",({command})=>{if(command==="spin"||command==="launch")spin();if(command==="move")move();if(command==="reset")reset();if(command==="new-galaxy")newGalaxy()});
  document.getElementById("startBtn").addEventListener("click",()=>{start();loadQr()});
  document.getElementById("resetBtn").addEventListener("click",()=>socket.emit("game-command",{room:ROOM,command:"reset"}));
  document.getElementById("newGalaxyBtn").addEventListener("click",()=>socket.emit("game-command",{room:ROOM,command:"new-galaxy"}));
  const soundBtn=document.getElementById("soundBtn");
  soundBtn.addEventListener("click",()=>{soundEnabled=!soundEnabled;soundBtn.textContent=soundEnabled?"🔊 Sound on":"🔇 Sound off";if(soundEnabled){unlockAudio();tone(520,.12,"triangle",.03,720);say("Sound effects on!")}else say("Sound effects off.")});
  const modal=document.getElementById("qrModal");
  document.getElementById("showQrBtn").addEventListener("click",()=>{modal.hidden=false;loadQr()});
  document.getElementById("closeQrBtn").addEventListener("click",()=>modal.hidden=true);
  modal.addEventListener("click",e=>{if(e.target===modal)modal.hidden=true});
  window.addEventListener("resize",resize);resize();ship={x:Math.max(65,W*.11),y:H*.5,angle:-.08,r:18};requestAnimationFrame(loop);
})();
