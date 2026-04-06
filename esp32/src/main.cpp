#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

#include "secrets.h"
#include "EPD_7in3e.h"
#include "DEV_Config.h"

#define IMAGE_BYTES (EPD_7IN3E_WIDTH / 2 * EPD_7IN3E_HEIGHT)  // 192,000
#define CHUNK_SIZE  512

// ─── WiFi ─────────────────────────────────────────────────────────────────────
static bool connectWiFi() {
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int i = 0; i < 40; i++) {
    if (WiFi.status() == WL_CONNECTED) { Serial.println(" OK"); return true; }
    delay(500);
    Serial.print(".");
  }
  Serial.println(" FAILED");
  return false;
}

// ─── NTP ──────────────────────────────────────────────────────────────────────
static bool syncTime() {
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, "pool.ntp.org", "time.google.com");
  Serial.print("Syncing time");
  struct tm t;
  for (int i = 0; i < 20; i++) {
    if (getLocalTime(&t)) { Serial.println(" OK"); return true; }
    delay(500);
    Serial.print(".");
  }
  Serial.println(" FAILED");
  return false;
}

// ─── Sleep until next WAKE_HOUR ───────────────────────────────────────────────
static void goToSleep() {
  uint64_t sleepUs;
  struct tm t;
  if (getLocalTime(&t)) {
    int nowSec  = t.tm_hour * 3600 + t.tm_min * 60 + t.tm_sec;
    int wakeSec = WAKE_HOUR * 3600;
    int diff    = wakeSec - nowSec;
    if (diff <= 0) diff += 24 * 3600;
    Serial.printf("Sleeping %dh %02dm until %02d:00\n", diff/3600, (diff%3600)/60, WAKE_HOUR);
    sleepUs = (uint64_t)diff * 1000000ULL;
  } else {
    Serial.println("No time — sleeping 6 hours");
    sleepUs = 6ULL * 3600 * 1000000ULL;
  }
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  esp_sleep_enable_timer_wakeup(sleepUs);
  Serial.println("Deep sleep.");
  Serial.flush();
  esp_deep_sleep_start();
}

// ─── Fetch + stream bitmap directly to display ───────────────────────────────
static bool fetchAndDisplay() {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String host = String(VERCEL_HOST);
  host.trim();
  if (host.startsWith("https://")) {
    host = host.substring(8);
  } else if (host.startsWith("http://")) {
    host = host.substring(7);
  }
  while (host.endsWith("/")) {
    host.remove(host.length() - 1);
  }

  String url = String("https://") + host + "/api/calendar/bitmap?key=" + BITMAP_API_KEY;
  Serial.println("GET " + url);

  if (!http.begin(client, url)) { Serial.println("begin failed"); return false; }

  int code = http.GET();
  int size = http.getSize();
  Serial.printf("HTTP %d  size %d\n", code, size);

  if (code != 200) { http.end(); return false; }
  if (size != IMAGE_BYTES) {
    Serial.printf("Wrong size (expected %d)\n", IMAGE_BYTES);
    http.end(); return false;
  }

  // Init display now that we know the download will succeed
  Serial.println("Init display...");
  DEV_Module_Init();
  EPD_7IN3E_Init();
  EPD_7IN3E_DisplayBegin();  // sends 0x10 command — data transfer starts

  // Stream HTTP response → SPI in small chunks (uses only CHUNK_SIZE bytes of RAM)
  WiFiClient* stream = http.getStreamPtr();
  static uint8_t chunk[CHUNK_SIZE];
  size_t received   = 0;
  unsigned long t0  = millis();

  while (received < (size_t)IMAGE_BYTES) {
    int avail = stream->available();
    if (avail > 0) {
      int toRead = min(avail, (int)min((size_t)CHUNK_SIZE, (size_t)IMAGE_BYTES - received));
      int got    = stream->readBytes(chunk, toRead);
      EPD_7IN3E_DisplayChunk(chunk, got);
      received  += got;
    } else {
      if (millis() - t0 > 60000) { Serial.println("Stream timeout"); break; }
      delay(1);  // yield to WiFi/TCP task
    }
  }

  http.end();

  if (received == (size_t)IMAGE_BYTES) {
    Serial.printf("Done — %u bytes in %lums\n", received, millis() - t0);
    EPD_7IN3E_DisplayEnd();  // triggers display refresh
    EPD_7IN3E_Sleep();
    DEV_Module_Exit();
    return true;
  }

  Serial.printf("Incomplete: %u / %d bytes\n", received, IMAGE_BYTES);
  return false;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.printf("\n=== Wall Calendar  free heap: %u ===\n", ESP.getFreeHeap());

  if (connectWiFi()) {
    syncTime();
    if (!fetchAndDisplay()) {
      Serial.println("Display update failed — will retry at next wake");
    }
  }

  goToSleep();
}

void loop() {}
