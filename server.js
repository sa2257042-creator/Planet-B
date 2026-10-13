const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const QRCode = require("qrcode");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/controller", (_req, res) => res.sendFile(path.join(__dirname, "public", "controller.html")));
app.get("/api/qr", async (req, res) => {
  try {
    const origin = `${req.protocol}://${req.get("host")}`;
    const room = String(req.query.room || "SPACE-B").trim().toUpperCase().slice(0, 20);
    const url = `${origin}/controller.html?room=${encodeURIComponent(room)}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: "M" });
    res.json({ url, dataUrl });
  } catch (e) {
    res.status(500).json({ error: "Could not create QR code." });
  }
});

io.on("connection", socket => {
  socket.on("join-room", raw => {
    const room = String(raw || "").trim().toUpperCase().slice(0, 20);
    if (!room) return;
    for (const r of socket.rooms) if (r !== socket.id) socket.leave(r);
    socket.join(room);
    socket.emit("joined-room", { room });
    io.to(room).emit("room-status", { room, count: io.sockets.adapter.rooms.get(room)?.size || 0 });
  });

  socket.on("game-command", payload => {
    if (!payload || typeof payload.room !== "string") return;
    const room = payload.room.trim().toUpperCase().slice(0, 20);
    if (!room) return;
    if (["spin", "move", "launch", "reset", "new-galaxy"].includes(payload.command)) {
      io.to(room).emit("game-command", { command: payload.command, at: Date.now() });
    }
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) if (room !== socket.id) {
      setTimeout(() => io.to(room).emit("room-status", {
        room, count: io.sockets.adapter.rooms.get(room)?.size || 0
      }), 0);
    }
  });
});

server.listen(PORT, () => console.log(`Planet B Adventure listening on ${PORT}`));
