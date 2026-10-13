# Planet B Adventure — QR phone controller

## Play flow
1. Deploy this project to a Node.js host with WebSocket/Socket.IO support.
2. Open the site's home page on the classroom computer.
3. Click **Start Game & Show QR**.
4. Scan the QR code with your phone camera.
5. Tap **A — SPIN** to spin for 3 seconds, then gradually stop.
6. Tap **B — MOVE** to move forward about 100 game pixels.
7. Touching a planet marked B earns a badge.

## Local testing
Requires Node.js 18+.
```bash
npm install
npm start
```
Open `http://localhost:3000`. For phone testing on the same Wi-Fi, open `http://COMPUTER-LAN-IP:3000/controller.html?room=SPACE-B` on your phone. The QR code generated on localhost will point to localhost, which phones cannot usually use to reach the computer; use the computer's LAN IP to test or deploy online.

## Deploy online
Deploy the folder to a Node.js host such as Render or Railway. Build command: `npm install`; start command: `npm start`. The host must support persistent Node processes and WebSockets. Open the public service URL on the computer; scan the QR code displayed there from the phone. The QR code automatically uses the current website URL.

The room code defaults to `SPACE-B`. Anyone who can access the site and knows the room code can send commands, so this prototype is intended for classroom use rather than sensitive access.
