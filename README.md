# Position Monitoring System (ESP32 Attendance Tracker)

A fully integrated hardware and software solution for tracking student attendance via ESP32 BLE (Bluetooth Low Energy) Beacons.

## Architecture

The system consists of three main components:
1. **Frontend (React)**: An ultra-responsive web dashboard providing live attendance stats, schedule management, and manual overrides for Teachers and Students.
2. **Backend (Node.js/Express + MongoDB)**: A REST API that handles authentication, live attendance computation, duration limits, and CSV exporting.
3. **Firmware (ESP32 C++)**: An active scanner that detects BLE MAC addresses (student phones/tags) and syncs their presence directly to the Backend via Wi-Fi HTTP requests.

---

## 🚀 How to Run the Project

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Running locally or via Atlas)
- Arduino IDE (for the ESP32)

### 1. Start the Database
Ensure your MongoDB service is running on your machine:
```bash
# Windows
net start MongoDB
```

### 2. Start the Backend API
The backend requires environment variables (like `MONGO_URI` and `JWT_SECRET`). Ensure you have a `.env` file in the `backend/` folder.
```bash
cd backend
npm install
npm run dev
```
*The server will start on port 5000 (e.g., http://localhost:5000).*

### 3. Start the Frontend React App
```bash
cd frontend
npm install
npm run dev
```
*The app will be accessible at http://localhost:5173.*

### 4. Deploy the ESP32 Firmware
1. Open `esp32_firmware/esp32_firmware.ino` in the Arduino IDE.
2. Make sure you have the [ESP32 Board Manager](https://dl.espressif.com/dl/package_esp32_index.json) installed in Arduino IDE.
3. Update the global variables at the top of the script:
   - `ssid`: Your Wi-Fi Name
   - `password`: Your Wi-Fi Password
   - `serverName`: Your Backend IP (e.g., `http://192.168.1.100:5000/api`)
   - `ESP32_ROOM_ID`: Ensure this matches a room in your database (e.g., `ROOM_101`).
4. Select your COM Port and click **Upload**.
5. Open the Serial Monitor (115200 baud) to watch the scanner live!

---

## Core Features Implemented

- **Strict Boundary Timing**: Students must be inside the room *during* the officially scheduled hours. Early arrivals and late exits do not artificially inflate attendance duration.
- **Signal Disconnect Tracking**: The system calculates every momentary drop in connection (when a student walks out of the room) and logs it into a `Disconnect_Count` metric.
- **Live Frontend Grid**: The web dashboard automatically polls the ESP32 database every 2 seconds to update exactly how many students are effectively present *right now*.
- **Role-based Authentication**: Students can view their tracking stats, whereas Teachers can only manipulate attendance in rooms they are officially scheduled to teach.
- **CSV Reports**: High-integrity, crash-resistant CSV generating mechanism summarizing total trailing, absent durations, and explicit drop counts per student.
