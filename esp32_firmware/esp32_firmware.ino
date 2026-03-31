#include <BLEDevice.h>
#include <BLEScan.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ─── CONFIG ───────────────────────────────────────
const char* WIFI_SSID = "OnePlus Nord CE 3 Lite 5G";
const char* WIFI_PASS = "pawan@26";
const char* BACKEND_URL = "http://10.165.67.130:5000"; // Ensure this matches your PC IP
const char* ESP32_ROOM_ID = "LAB_ROOM_001";
const char* ESP32_SECRET = "esp32secretkey2024";

// ─── TIMING CONFIG ────────────────────────────────
const int TEACHER_PRESENCE_TIME = 1 * 60 * 1000;  // 5 minutes to confirm arrival
const int STUDENT_PRESENCE_TIME = 0;              // immediate confirm arrival
const int ABSENCE_SCANS = 3;                      // missed scans to confirm leaving
const int RSSI_THRESHOLD = -70;                   // Ignore signals weaker than -70 dBm
// ──────────────────────────────────────────────────

struct TargetDevice {
  const char* beaconName;
  const char* id;
  const char* role;  // "teacher" or "student"
  unsigned long firstSeenTime;
  int missedScans;
  bool isConfirmed;
};

// Add all your database teachers and students here
// Must match the bluetooth_name in the database
TargetDevice devices[] = {
  { "TEACHER_TCH001", "TCH001", "teacher", 0, 0, false },
  { "TEACHER_TCH002", "TCH002", "teacher", 0, 0, false },
  { "TEACHER_TCH003", "TCH003", "teacher", 0, 0, false },
  { "TEACHER_TCH004", "TCH004", "teacher", 0, 0, false },
  { "PHONE_STU001", "STU001", "student", 0, 0, false },
  { "PHONE_STU002", "STU002", "student", 0, 0, false },
  { "PHONE_STU003", "STU003", "student", 0, 0, false },
  { "PHONE_STU004", "STU004", "student", 0, 0, false },
  { "PHONE_STU005", "STU005", "student", 0, 0, false },
  { "PHONE_STU006", "STU006", "student", 0, 0, false },
  { "PHONE_STU007", "STU007", "student", 0, 0, false },
  { "PHONE_STU008", "STU008", "student", 0, 0, false },
  { "PHONE_STU009", "STU009", "student", 0, 0, false },
  { "PHONE_STU010", "STU010", "student", 0, 0, false },
  { "PHONE_STU011", "STU011", "student", 0, 0, false },
  { "PHONE_STU012", "STU012", "student", 0, 0, false },
  { "PHONE_STU013", "STU013", "student", 0, 0, false },
  { "PHONE_STU014", "STU014", "student", 0, 0, false },
  { "PHONE_STU015", "STU015", "student", 0, 0, false },
  { "PHONE_STU016", "STU016", "student", 0, 0, false },
  { "PHONE_STU017", "STU017", "student", 0, 0, false },
  { "PHONE_STU018", "STU018", "student", 0, 0, false },
  { "PHONE_STU019", "STU019", "student", 0, 0, false },
  { "PHONE_STU020", "STU020", "student", 0, 0, false }
};

const int deviceCount = sizeof(devices) / sizeof(devices[0]);
bool seenInThisScan[24]; // Must array size match deviceCount
BLEScan* pBLEScan;

void sendDataToBackend(const char* endpoint, StaticJsonDocument<200>& doc) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, cannot send data.");
    return;
  }

  HTTPClient http;
  String fullUrl = String(BACKEND_URL) + endpoint;
  http.begin(fullUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-esp32-key", ESP32_SECRET);

  String body;
  serializeJson(doc, body);
  Serial.println("📤 Sending to " + String(endpoint) + " : " + body);

  int code = http.POST(body);
  if (code == 200) {
    Serial.println("✅ Success!");
  } else {
    Serial.println("❌ Failed: HTTP " + String(code));
    String response = http.getString();
    Serial.println("❌ Response: " + response);
  }
  http.end();
}

void processArrival(int index, int rssi) {
  StaticJsonDocument<200> doc;
  doc["room_id"] = ESP32_ROOM_ID;
  
  if (String(devices[index].role) == "teacher") {
    doc["teacher_id"] = devices[index].id;
    doc["rssi"] = rssi;
    sendDataToBackend("/api/update-location", doc);
  } else {
    doc["student_id"] = devices[index].id;
    doc["rssi"] = rssi;
    sendDataToBackend("/api/student-detected", doc);
  }
}

void processLeave(int index) {
  StaticJsonDocument<200> doc;
  doc["room_id"] = ESP32_ROOM_ID;

  if (String(devices[index].role) == "teacher") {
    doc["teacher_id"] = devices[index].id;
    sendDataToBackend("/api/teacher-left", doc);
  } else {
    doc["student_id"] = devices[index].id;
    sendDataToBackend("/api/student-left", doc);
  }
}

class ScanCallbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice device) {
    String name = device.getName().c_str();
    String mac  = device.getAddress().toString().c_str();
    int rssi    = device.getRSSI();

    if (name.length() == 0) return;

    for (int i = 0; i < deviceCount; i++) {
        if (name == String(devices[i].beaconName)) {
        // Serial.println("👀 MATCH FOUND: " + name + " (Role: " + String(devices[i].role) + ") [RSSI: " + String(rssi) + "]");

        // Only track if RSSI is strong enough (closer than threshold)
        if (rssi < RSSI_THRESHOLD) {
           // Serial.println("⚠️ Too far away: " + String(rssi) + " dBm");
           return;
        }

        if (devices[i].firstSeenTime == 0) {
          devices[i].firstSeenTime = millis();
          Serial.println("⏳ Timer started for " + name);
        }

        unsigned long timeInRoom = millis() - devices[i].firstSeenTime;
        int requiredTime = (String(devices[i].role) == "teacher") ? TEACHER_PRESENCE_TIME : STUDENT_PRESENCE_TIME;

        if (!devices[i].isConfirmed && timeInRoom >= requiredTime) {
          devices[i].isConfirmed = true;
          Serial.println("✅ CONFIRMED! " + name + " has arrived.");
          processArrival(i, rssi);
        } else if (!devices[i].isConfirmed) {
          Serial.println("⏱️ " + name + " in range for " + String(timeInRoom / 1000) + "s / " + String(requiredTime / 1000) + "s");
        }

        devices[i].missedScans = 0;
        seenInThisScan[i] = true;
        break; // matched, no need to check other devices
      }
    }
  }
};

void checkForLeaving() {
  for (int i = 0; i < deviceCount; i++) {
    if (devices[i].firstSeenTime == 0) continue;

    if (!seenInThisScan[i]) {
      devices[i].missedScans++;
      Serial.println("⚠️ " + String(devices[i].beaconName) + " missed scan " + String(devices[i].missedScans) + "/" + String(ABSENCE_SCANS));

      // If missed enough scans → device left
      if (devices[i].missedScans >= ABSENCE_SCANS) {
        if (devices[i].isConfirmed) {
          Serial.println("🚶 Left room: " + String(devices[i].beaconName));
          processLeave(i);
        } else {
          Serial.println("↩️ Left before confirmation: " + String(devices[i].beaconName));
        }
        // Reset device state
        devices[i].firstSeenTime = 0;
        devices[i].missedScans = 0;
        devices[i].isConfirmed = false;
      }
    }
  }
}

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n❌ WiFi Failed!");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  for (int i = 0; i < deviceCount; i++) {
    seenInThisScan[i] = false;
  }

  connectWiFi();

  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new ScanCallbacks());
  pBLEScan->setActiveScan(true);
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(99);
  Serial.println("🔍 BLE Scanner Ready. Starting continuous scan...");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ Reconnecting WiFi...");
    WiFi.disconnect();
    delay(1000);
    connectWiFi();
    return;
  }

  // Reset seen flags before each scan round
  for (int i = 0; i < deviceCount; i++) {
    seenInThisScan[i] = false;
  }

  Serial.println("\n--- Scanning for 5 seconds ---");
  BLEScanResults* results = pBLEScan->start(5, false);
  Serial.println("BLE Devices found: " + String(results->getCount()));
  pBLEScan->clearResults();

  // Check if any confirmed teacher or student missed their scans
  checkForLeaving();

  delay(2000); // Wait 2 seconds before next scan
}
