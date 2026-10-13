(() => {
  const socket=io(), params=new URLSearchParams(location.search);
  let room=(params.get("room")||"SPACE-B").trim().toUpperCase(), connected=false, joined=false;
  const spinBtn=document.getElementById("spinBtn"),moveBtn=document.getElementById("moveBtn"),status=document.getElementById("connectionStatus");
  document.getElementById("roomLabel").textContent="ROOM "+room;
  function setStatus(s,type=""){status.textContent=s;status.className=type}
  function enable(v){spinBtn.disabled=!v;moveBtn.disabled=!v}
  function join(){if(!connected){setStatus("Reconnecting…","error");return}joined=false;enable(false);socket.emit("join-room",room);setStatus("Joining room…")}
  socket.on("connect",()=>{connected=true;join()});
  socket.on("disconnect",()=>{connected=false;joined=false;enable(false);setStatus("Connection lost","error")});
  socket.on("connect_error",()=>setStatus("Can't reach game server","error"));
  socket.on("joined-room",data=>{room=data.room;joined=true;document.getElementById("roomLabel").textContent="ROOM "+room;enable(true);setStatus("Connected","ok");document.getElementById("remoteCaption").textContent="READY, CAPTAIN!"});
  socket.on("room-status",data=>{if(joined&&data.room===room)setStatus("Connected","ok")});
  function send(command){if(!connected||!joined)return;socket.emit("game-command",{room,command});document.getElementById("remoteCaption").textContent=command==="spin"?"SPINNING UP!":command==="move"?"FLY, SPACESHIP!":"READY, CAPTAIN!"}
  spinBtn.addEventListener("click",()=>send("spin"));
  moveBtn.addEventListener("click",()=>send("move"));
  document.getElementById("reconnectBtn").addEventListener("click",join);
  window.addEventListener("keydown",e=>{if(e.repeat)return;if(e.key.toLowerCase()==="a"&&!spinBtn.disabled)send("spin");if(e.key.toLowerCase()==="b"&&!moveBtn.disabled)send("move")});
  enable(false);
})();
