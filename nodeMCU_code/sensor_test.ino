/*
 * Sensor Test Sketch for Smart Irrigation System
 * 
 * This sketch helps isolate and test individual components:
 * 1. Soil moisture sensor reading
 * 2. DHT11 temperature and humidity sensor
 * 3. Relay/pump control
 * 4. WiFi connectivity
 * 5. MQTT connection
 * 
 * Instructions:
 * - Uncomment the TEST_* define for the component you want to test
 * - Upload the sketch and monitor the Serial output at 115200 baud
 * - Follow the instructions printed in the Serial Monitor
 */

// Uncomment ONE of these to select what to test
//#define TEST_SOIL_MOISTURE
//#define TEST_DHT11
//#define TEST_RELAY
//#define TEST_WIFI
//#define TEST_MQTT

// Libraries
#include <Arduino.h>

// Pin Definitions
const int MOISTURE_SENSOR_PIN = A0;
const int DHT_PIN = D3;
const int RELAY_PIN = D0;

// Soil Moisture Calibration
const int DRY_VALUE = 1023;  // Value when sensor is in air (completely dry)
const int WET_VALUE = 200;   // Value when sensor is in water (completely wet)

#ifdef TEST_DHT11
  #include <DHT.h>
  #define DHTTYPE DHT11
  DHT dht(DHT_PIN, DHTTYPE);
#endif

#if defined(TEST_WIFI) || defined(TEST_MQTT)
  #include <ESP8266WiFi.h>
  const char* ssid = "YOUR_WIFI_SSID";
  const char* password = "YOUR_WIFI_PASSWORD";
#endif

#ifdef TEST_MQTT
  #include <PubSubClient.h>
  const char* mqtt_server = "broker.hivemq.com";
  const int mqtt_port = 1883;
  WiFiClient espClient;
  PubSubClient client(espClient);
  const char* mqtt_topic = "irrigation/test";
#endif

void setup() {
  Serial.begin(115200);
  delay(2000); // Give time for serial monitor to connect
  Serial.println("\n=== Smart Irrigation System Component Test ===\n");
  
  #ifdef TEST_SOIL_MOISTURE
    setupSoilMoisture();
  #endif
  
  #ifdef TEST_DHT11
    setupDHT();
  #endif
  
  #ifdef TEST_RELAY
    setupRelay();
  #endif
  
  #ifdef TEST_WIFI
    setupWifi();
  #endif
  
  #ifdef TEST_MQTT
    setupWifi();
    setupMQTT();
  #endif
  
  if (!defined(TEST_SOIL_MOISTURE) && 
      !defined(TEST_DHT11) && 
      !defined(TEST_RELAY) && 
      !defined(TEST_WIFI) && 
      !defined(TEST_MQTT)) {
    Serial.println("ERROR: No test selected!");
    Serial.println("Please uncomment one of the TEST_* defines at the top of the sketch.");
    while(1) { delay(1000); } // Stop here
  }
}

#ifdef TEST_SOIL_MOISTURE
void setupSoilMoisture() {
  Serial.println("=== SOIL MOISTURE SENSOR TEST ===");
  Serial.println("1. Make sure the sensor is connected to A0");
  Serial.println("2. Put the sensor in air for dry reading");
  Serial.println("3. Then put it in water for wet reading");
  Serial.println("4. Use these values to calibrate your main sketch\n");
}
#endif

#ifdef TEST_DHT11
void setupDHT() {
  Serial.println("=== DHT11 TEMPERATURE & HUMIDITY SENSOR TEST ===");
  Serial.println("1. Make sure the sensor is connected to pin D3");
  Serial.println("2. Check for valid readings below\n");
  dht.begin();
}
#endif

#ifdef TEST_RELAY
void setupRelay() {
  Serial.println("=== RELAY/PUMP TEST ===");
  Serial.println("1. Make sure the relay is connected to pin D0");
  Serial.println("2. The relay will cycle ON and OFF every 5 seconds");
  Serial.println("3. Listen for clicking sound and check if pump activates\n");
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Turn relay OFF initially (relay is active LOW)
}
#endif

#ifdef TEST_WIFI
void setupWifi() {
  Serial.println("=== WIFI CONNECTION TEST ===");
  Serial.println("1. Attempting to connect to WiFi...");
  
  WiFi.begin(ssid, password);
  
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) {
    delay(500);
    Serial.print(".");
    timeout++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection FAILED!");
    Serial.println("Check your SSID and password in the sketch.");
  }
  Serial.println();
}
#endif

#ifdef TEST_MQTT
void setupMQTT() {
  Serial.println("=== MQTT CONNECTION TEST ===");
  Serial.println("1. Attempting to connect to MQTT broker...");
  
  client.setServer(mqtt_server, mqtt_port);
  
  reconnectMQTT();
}

void reconnectMQTT() {
  int attempts = 0;
  while (!client.connected() && attempts < 5) {
    Serial.print("MQTT connecting...");
    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      String message = "Test connection from ESP8266: " + WiFi.macAddress();
      client.publish(mqtt_topic, message.c_str());
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying...");
      delay(2000);
    }
    attempts++;
  }
  
  if (client.connected()) {
    Serial.println("MQTT connected successfully!");
    Serial.println("Test message published to: " + String(mqtt_topic));
  } else {
    Serial.println("MQTT connection FAILED after multiple attempts!");
    Serial.println("Check your broker settings and network connection.");
  }
  Serial.println();
}
#endif

void loop() {
  #ifdef TEST_SOIL_MOISTURE
    testSoilMoisture();
  #endif
  
  #ifdef TEST_DHT11
    testDHT();
  #endif
  
  #ifdef TEST_RELAY
    testRelay();
  #endif
  
  #ifdef TEST_WIFI
    testWifi();
  #endif
  
  #ifdef TEST_MQTT
    testMQTT();
  #endif
  
  delay(2000); // Update every 2 seconds
}

#ifdef TEST_SOIL_MOISTURE
void testSoilMoisture() {
  int rawValue = analogRead(MOISTURE_SENSOR_PIN);
  int moisturePercent = map(rawValue, DRY_VALUE, WET_VALUE, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);
  
  Serial.print("Raw analog value: ");
  Serial.print(rawValue);
  Serial.print(" | Moisture: ");
  Serial.print(moisturePercent);
  Serial.println("%");
}
#endif

#ifdef TEST_DHT11
void testDHT() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("DHT sensor read FAILED! Check wiring.");
  } else {
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.print(" °C | Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  }
}
#endif

#ifdef TEST_RELAY
void testRelay() {
  static bool relayState = false;
  static unsigned long lastToggleTime = 0;
  
  unsigned long currentTime = millis();
  if (currentTime - lastToggleTime > 5000) {
    relayState = !relayState;
    lastToggleTime = currentTime;
    
    // Relay is active LOW, so LOW turns it ON
    digitalWrite(RELAY_PIN, !relayState);
    
    Serial.print("Relay/Pump turned ");
    Serial.println(relayState ? "ON" : "OFF");
  }
}
#endif

#ifdef TEST_WIFI
void testWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi still connected, RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("WiFi connection lost! Attempting to reconnect...");
    WiFi.begin(ssid, password);
  }
}
#endif

#ifdef TEST_MQTT
void testMQTT() {
  if (!client.connected()) {
    Serial.println("MQTT connection lost! Attempting to reconnect...");
    reconnectMQTT();
  } else {
    static int counter = 0;
    counter++;
    String message = "Test message #" + String(counter) + " from ESP8266";
    
    client.publish(mqtt_topic, message.c_str());
    Serial.println("MQTT message published: " + message);
    
    client.loop();
  }
}
#endif

/*
 * Troubleshooting Tips:
 * 
 * Soil Moisture Sensor Issues:
 * - If readings are unstable: Add capacitor (100-220μF) between VCC and GND
 * - If readings are inaccurate: Recalibrate DRY_VALUE and WET_VALUE
 * - No readings: Check wiring, especially VCC (3.3V) and GND connections
 * 
 * DHT11 Sensor Issues:
 * - "Failed to read from DHT": Check wiring, especially the pull-up resistor
 * - Incorrect readings: Wait 2+ seconds between readings
 * - No readings: Verify proper voltage (3.3V)
 * 
 * Relay Issues:
 * - Relay not switching: Check if you need to invert the logic
 * - Relay clicks but pump doesn't turn on: Check power supply to pump
 * - Erratic behavior: Add diode across relay coil to prevent back-EMF
 * 
 * WiFi Issues:
 * - Connection failures: Check SSID and password, try moving closer to router
 * - Intermittent disconnects: Add delay(100) in main loop
 * 
 * MQTT Issues:
 * - Error code -2: Network connection failed
 * - Error code -3: Network connection lost
 * - Error code -4: Server didn't respond within keepalive time
 */ 