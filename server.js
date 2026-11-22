const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// เรียกแสดงผลหน้าเว็บจากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, "public")));

let espClient = null;
let webClients = new Set();
let currentLedState = "OFF";

// ส่งสถานะให้หน้าเว็บทั้งหมดอัปเดต
function broadcastToWeb(data) {
  const message = JSON.stringify(data);
  webClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      // 1. กรณีบอร์ด ESP32 เชื่อมต่อเข้ามา
      if (data.type === "ESP_CLIENT") {
        espClient = ws;
        ws.clientType = "ESP";
        console.log("ESP32 Connected!");
        broadcastToWeb({ type: "ESP_STATUS", online: true });
        // ส่งสถานะไฟล่าสุดให้ ESP32 รับทราบ
        ws.send(JSON.stringify({ type: "COMMAND", gpio: 26, state: currentLedState }));
      }

      // 2. กรณีหน้าเว็บเปิดขึ้นมา
      else if (data.type === "WEB_CLIENT") {
        webClients.add(ws);
        ws.clientType = "WEB";
        const isEspOnline = espClient !== null && espClient.readyState === WebSocket.OPEN;
        ws.send(JSON.stringify({ type: "ESP_STATUS", online: isEspOnline }));
        ws.send(JSON.stringify({ type: "LED_STATE", state: currentLedState }));
      }

      // 3. รับคำสั่งกดปุ่มเปิด-ปิดจากหน้าเว็บ ส่งต่อไปยัง ESP32
      else if (data.type === "COMMAND") {
        currentLedState = data.state;
        if (espClient && espClient.readyState === WebSocket.OPEN) {
          espClient.send(JSON.stringify(data));
        }
        broadcastToWeb({ type: "LED_STATE", state: currentLedState });
      }

      // 4. รับสถานะยืนยันจริงจาก ESP32 (GPIO 26)
      else if (data.type === "LED_STATE") {
        currentLedState = data.state;
        broadcastToWeb({ type: "LED_STATE", state: currentLedState });
      }
    } catch (err) {
      console.error("Invalid JSON:", err);
    }
  });

  ws.on("close", () => {
    if (ws.clientType === "ESP") {
      espClient = null;
      console.log("ESP32 Disconnected!");
      broadcastToWeb({ type: "ESP_STATUS", online: false });
    } else if (ws.clientType === "WEB") {
      webClients.delete(ws);
    }
  });
});

// ระบบเช็กการเชื่อมต่อ ESP32 ทุกๆ 10 วินาที (ป้องกันสถานะค้างกรณีเน็ตหลุด)
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 10000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
