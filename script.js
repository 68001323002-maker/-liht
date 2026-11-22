const BROKER_URL = "wss://://hivemq.com";

// Topic เดิมของคุณ
const TOPIC_SET = "school-project/khemmachatnt2004/led26-7f3c91a2/set";
const TOPIC_STATE = "school-project/khemmachatnt2004/led26-7f3c91a2/state";

// HTML Elements
const statusDot = document.getElementById("statusDot");
const mqttConnection = document.getElementById("mqttConnection");
const bulbIcon = document.getElementById("bulbIcon");
const houseStatus = document.getElementById("houseStatus");
const messageStatus = document.getElementById("messageStatus");
const onButton = document.getElementById("onButton");
const offButton = document.getElementById("offButton");
const brightnessSlider = document.getElementById("brightnessSlider");
const brightnessValue = document.getElementById("brightnessValue");

// เชื่อมต่อ MQTT Broker
const client = mqtt.connect(BROKER_URL);

client.on("connect", () => {
  statusDot.className = "dot online";
  mqttConnection.textContent = "Connected to Broker";
  messageStatus.textContent = "พร้อมสั่งงานหลอดไฟ LED";
  client.subscribe(TOPIC_STATE);
});

client.on("offline", () => {
  statusDot.className = "dot offline";
  mqttConnection.textContent = "Disconnected";
});

// รับสถานะตอบกลับจาก ESP32
client.on("message", (topic, payload) => {
  if (topic === TOPIC_STATE) {
    const state = payload.toString().trim();
    updateUI(state);
    messageStatus.textContent = `สถานะล่าสุดจาก ESP32: ${state}`;
  }
});

// สั่งเปิดไฟ
onButton.addEventListener("click", () => {
  client.publish(TOPIC_SET, "ON");
  updateUI("ON");
});

// สั่งปิดไฟ
offButton.addEventListener("click", () => {
  client.publish(TOPIC_SET, "OFF");
  updateUI("OFF");
});

// สั่งปรับความสว่าง (ส่งค่า 0 - 100)
brightnessSlider.addEventListener("change", (e) => {
  const level = e.target.value;
  brightnessValue.textContent = `${level}%`;
  client.publish(TOPIC_SET, `BRIGHTNESS:${level}`);
  updateUI(level > 0 ? "ON" : "OFF", level);
});

// อัปเดตหน้าจอตามสถานะ
function updateUI(state, brightness = 100) {
  if (state === "ON" || parseInt(state) > 0) {
    bulbIcon.className = "bulb on";
    bulbIcon.style.opacity = brightness / 100;
    houseStatus.textContent = "ไฟเปิดอยู่ (ON)";
    houseStatus.style.color = "#facc15";
  } else if (state === "OFF" || state === "0") {
    bulbIcon.className = "bulb off";
    bulbIcon.style.opacity = 0.3;
    houseStatus.textContent = "ไฟปิดอยู่ (OFF)";
    houseStatus.style.color = "#94a3b8";
  }
}
