#include <BLEDevice.h>
#include <BLEScan.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <esp_bt.h>
#include <esp_task_wdt.h>
#include <time.h>

// ─── CONFIG ───────────────────────────────────────
const char* WIFI_SSID = "OnePlus Nord CE 3 Lite 5G";
const char* WIFI_PASS = "pawan@26";
const char* BACKEND_URL = "https://position-monitoring-system.onrender.com";  // Ensure this matches your PC IP
const char* ESP32_ROOM_ID = "LAB_ROOM_004";
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
  bool needsArrivalSync;
  bool needsLeaveSync;
  int lastRssi;
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
bool seenInThisScan[24];  // Must array size match deviceCount
BLEScan* pBLEScan;

// ✅ NEW: Counter for detecting stuck BLE
int consecutiveEmptyScans = 0;

// Let's Encrypt ISRG Root X1 Trust Anchor (Render SSL Certificate Authority)
const char* rootCACertificate =
  "-----BEGIN CERTIFICATE-----\n"
  "MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRnXubJIVcwAwDQYJKoZIhvcNAQELBQAw\n"
  "TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n"
  "cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\n"
  "WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\n"
  "ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\n"
  "MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJ1yOObpPeYaUKQIF\n"
  "glzDwgZQO+qGBaI/oY+r6RaiS4J5E3qAozkELoEwX8oVbH/B6n5N0npsj84p08M8\n"
  "5vG33bQ2o0wK0l7qUmsw/p01gQkG20gKzQj7502R3tC8R7sI1y3q78I3H8l1yR2\n"
  "5g1t/4y8+2xR03p1m0+m8QzTz+oI9k2n9t8B2j3B4y818m1lIMN7/L+2d5/m8v9t\n"
  "v5t6h1m1qG6q+uO8s8W2d1m3A8q9v3e7R6F+82T5c3e0/eK/D7Q6g0l4g0O8V8pG\n"
  "2u9Z6X2d4Y2z8B1q7+C3V/4xQ/9XyR3M+l3W8l2b0z4H0G2m9a0C1P7h2D2q6T7p\n"
  "N7D/z9s8u0k9X4O+B5/z7x5fP/E8G4s9q9s/u3L4/y/9T9t1V4/Q2P5w2Z4P4P3/\n"
  "4y8+qD7G0N/r5v1R8T0u6r1T1J8u9B5d4u/y/2x9Q0G7XJ6I7S3x0l1S0d0C9Q4/\n"
  "qI6u9l7t2Z4b2c1k2F/5E0h80q6k9g5w4P0j9X8/1o6R2y5A2U2+H5b6m4x9w/L/\n"
  "m7x92d/P2l/1q1A1E8D/4z1q6s8F4Q==\n"
  "-----END CERTIFICATE-----\n";

WiFiClientSecure secureClient;

bool sendDataToBackend(const char* endpoint, StaticJsonDocument<200>& doc) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, cannot send data.");
    return false;
  }

  secureClient.stop();
  secureClient.setInsecure();

  Serial.print("⏳ Connecting to Render TLS... ");
  if (!secureClient.connect("position-monitoring-system.onrender.com", 443)) {
    Serial.println("❌ Connection failed (core TLS layer aborted).");
    return false;
  }
  Serial.println("✅ Connected!");

  String body;
  serializeJson(doc, body);
  Serial.println("📤 Sending to " + String(endpoint));

  secureClient.print(String("POST ") + endpoint + " HTTP/1.1\r\n");
  secureClient.print("Host: position-monitoring-system.onrender.com\r\n");
  secureClient.print("User-Agent: ESP32/RawSocket\r\n");
  secureClient.print("Content-Type: application/json\r\n");
  secureClient.print("x-esp32-key: " + String(ESP32_SECRET) + "\r\n");
  secureClient.print("Connection: close\r\n");
  secureClient.print("Content-Length: " + String(body.length()) + "\r\n\r\n");
  secureClient.print(body);

  long timeout = millis();
  while (secureClient.connected() && !secureClient.available()) {
    if (millis() - timeout > 60000) {
      Serial.println("❌ Render server timeout (did not respond in 60s)");
      secureClient.stop();
      return false;
    }
    delay(10);
  }

  String response = secureClient.readStringUntil('\n');
  secureClient.stop();

  if (response.indexOf("200") != -1 || response.indexOf("201") != -1) {
    Serial.println("✅ Success! " + response);
    return true;
  } else {
    Serial.println("❌ Server responded with: " + response);
    return false;
  }
}

bool processArrival(int index, int rssi) {
  StaticJsonDocument<200> doc;
  doc["room_id"] = ESP32_ROOM_ID;

  if (String(devices[index].role) == "teacher") {
    doc["teacher_id"] = devices[index].id;
    doc["rssi"] = rssi;
    return sendDataToBackend("/api/update-location", doc);
  } else {
    doc["student_id"] = devices[index].id;
    doc["rssi"] = rssi;
    return sendDataToBackend("/api/student-detected", doc);
  }
}

bool processLeave(int index) {
  StaticJsonDocument<200> doc;
  doc["room_id"] = ESP32_ROOM_ID;

  if (String(devices[index].role) == "teacher") {
    doc["teacher_id"] = devices[index].id;
    return sendDataToBackend("/api/teacher-left", doc);
  } else {
    doc["student_id"] = devices[index].id;
    return sendDataToBackend("/api/student-left", doc);
  }
}

class ScanCallbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice device) {
    String name = device.getName().c_str();
    String mac = device.getAddress().toString().c_str();
    int rssi = device.getRSSI();

    if (name.length() == 0) return;

    for (int i = 0; i < deviceCount; i++) {
      if (name == String(devices[i].beaconName)) {
        if (rssi < RSSI_THRESHOLD) {
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
          devices[i].lastRssi = rssi;
          devices[i].needsArrivalSync = true;
          devices[i].needsLeaveSync = false;  // FLUSH STALE QUEUE
          Serial.println("✅ CONFIRMED! " + name + " has arrived. (Queued for sync)");
        } else if (!devices[i].isConfirmed) {
          Serial.println("⏱️ " + name + " in range for " + String(timeInRoom / 1000) + "s / " + String(requiredTime / 1000) + "s");
        }

        devices[i].missedScans = 0;
        seenInThisScan[i] = true;
        break;
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

      if (devices[i].missedScans >= ABSENCE_SCANS) {
        if (devices[i].isConfirmed) {
          Serial.println("🚶 Left room: " + String(devices[i].beaconName) + " (Queued for sync)");
          devices[i].needsLeaveSync = true;
          devices[i].needsArrivalSync = false;  // FLUSH STALE QUEUE
        } else {
          Serial.println("↩️ Left before confirmation: " + String(devices[i].beaconName));
        }
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

    Serial.print("⏳ Syncing time with NTP for SSL verification ");
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    time_t now = time(nullptr);
    int retries = 0;
    while (now < 1600000000 && retries < 20) {
      delay(500);
      Serial.print(".");
      now = time(nullptr);
      retries++;
    }
    Serial.println("\n✅ Time Synced!");

  } else {
    Serial.println("\n❌ WiFi Failed!");
  }
}

// ✅ NEW: Separate BLE init function for clean reinitialization
void initBLE() {
  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new ScanCallbacks());
  pBLEScan->setActiveScan(true);
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(99);
  Serial.println("🔍 BLE Scanner Ready.");
}
void resetAllTeachersOnBoot() {
  Serial.println("🔄 Boot: Resetting all teacher locations to Away...");
  for (int i = 0; i < deviceCount; i++) {
    if (String(devices[i].role) == "teacher") {
      StaticJsonDocument<200> doc;
      doc["room_id"] = ESP32_ROOM_ID;
      doc["teacher_id"] = devices[i].id;
      sendDataToBackend("/api/teacher-left", doc);
      delay(500); // small gap between each request
    }
  }
  Serial.println("✅ All teachers reset to Away.");
}
void setup() {
  Serial.begin(115200);
  delay(1000);

  esp_bt_controller_mem_release(ESP_BT_MODE_CLASSIC_BT);

  for (int i = 0; i < deviceCount; i++) {
    seenInThisScan[i] = false;
  }

  connectWiFi();

  initBLE();  // ✅ CHANGED: Now calls initBLE() instead of inline BLE setup
  Serial.println("🔍 BLE Scanner Ready. Starting continuous scan...");
  resetAllTeachersOnBoot();
  // ✅ FIXED: New watchdog API for ESP32 core 3.x
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = 60000,  // 60 seconds
    .idle_core_mask = 0,
    .trigger_panic = true
  };
  esp_task_wdt_reconfigure(&wdt_config);
  esp_task_wdt_add(NULL);
}

void loop() {
  // ✅ NEW: Feed the watchdog at the start of every loop
  esp_task_wdt_reset();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ Reconnecting WiFi...");
    WiFi.disconnect();
    delay(1000);
    connectWiFi();
    return;
  }

  for (int i = 0; i < deviceCount; i++) {
    seenInThisScan[i] = false;
  }

  Serial.println("\n--- Scanning for 5 seconds ---");
  BLEScanResults* results = pBLEScan->start(5, false);

  // ✅ NEW: Detect broken/stuck BLE state
  if (results == nullptr) {
    consecutiveEmptyScans++;
    Serial.println("⚠️ BLE scan returned null! Attempt " + String(consecutiveEmptyScans));
  } else {
    int count = results->getCount();
    Serial.println("BLE Devices found: " + String(count));
    if (count == 0) {
      consecutiveEmptyScans++;
    } else {
      consecutiveEmptyScans = 0;  // Reset counter on any successful scan
    }
  }

  pBLEScan->clearResults();

  // ✅ NEW: If BLE appears stuck after 5 consecutive empty scans, reinitialize it
  if (consecutiveEmptyScans >= 5) {
    Serial.println("🔄 BLE appears stuck. Reinitializing BLE stack...");
    consecutiveEmptyScans = 0;
    BLEDevice::deinit(true);
    delay(1000);
    initBLE();
    delay(500);
    return;
  }

  checkForLeaving();

  for (int i = 0; i < deviceCount; i++) {
    if (devices[i].needsArrivalSync) {
      if (processArrival(i, devices[i].lastRssi)) {
        devices[i].needsArrivalSync = false;
      }
    }
    if (devices[i].needsLeaveSync) {
      if (processLeave(i)) {
        devices[i].needsLeaveSync = false;
      }
    }
  }

  delay(2000);
}