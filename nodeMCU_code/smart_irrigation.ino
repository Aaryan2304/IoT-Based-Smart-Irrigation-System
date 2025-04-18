#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <time.h>  // Add time library for NTP
#include <math.h>  // Add math library for sqrt

// WiFi credentials
const char* ssid = "ISHAAN-2.4G";
const char* password = "ranger010101";

// HiveMQ MQTT Broker settings
const char* mqtt_server = "50ea210c158746818eff77f550c58a55.s1.eu.hivemq.cloud"; // e.g. "broker.hivemq.com"
const int mqtt_port = 8883; // TLS port
const char* mqtt_user = "iot_pbl"; // if required
const char* mqtt_password = "mitwpu_IoT_pbl_1"; // if required

// NTP Server
const char* ntp_server = "pool.ntp.org";

// Root CA Certificate for HiveMQ or your MQTT broker
// This is an example - replace with your broker's root CA certificate
// You can find this in your broker's documentation or export it from a browser
const char* rootCA = \
"-----BEGIN CERTIFICATE-----\n" \
"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\n" \
"-----END CERTIFICATE-----\n";

// MQTT topics
const char* topic_sensor_data = "irrigation/sensor_data";
const char* topic_pump_control = "irrigation/pump_control";
const char* topic_status = "irrigation/status";

// Sensor pins
#define SOIL_MOISTURE_PIN A0
#define DHT_PIN D3
#define PUMP_RELAY_PIN D0
#define DHT_TYPE DHT11

// Moisture thresholds for automatic control
#define MOISTURE_THRESHOLD_LOW 30  // Turn pump ON when moisture is below 30%
#define MOISTURE_THRESHOLD_HIGH 55 // Turn pump OFF when moisture is above 55%

// Variables
WiFiClientSecure espClient;
PubSubClient client(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastMsg = 0;
const int msgInterval = 10000; // Send data every 10 seconds
bool pumpStatus = false;
bool autoMode = true;  // Default to automatic control

// Calibration values for soil moisture sensor
// These should be adjusted based on your sensor's readings
int dryValue = 1023;  // Value when sensor is in air (completely dry)
int wetValue = 0;     // Value when sensor is in water (completely wet)

// Debug flags
bool debugMode = true;  // Set to true for detailed connection logs

// Variables for anomaly detection
const int NUM_READINGS = 5;                    // Number of readings to store for anomaly detection
int moistureReadings[NUM_READINGS] = {0};      // Array to store past moisture readings
int readingIndex = 0;                          // Current index in the readings array
bool readingsInitialized = false;              // Flag to check if initial readings are collected
float meanMoisture = 0;                        // Running average of moisture readings
float stdDevMoisture = 0;                      // Standard deviation of moisture readings
const float ANOMALY_THRESHOLD = 3.0;           // Number of standard deviations to flag as anomaly

void setup() {
  Serial.begin(115200);
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  digitalWrite(PUMP_RELAY_PIN, LOW); // Make sure pump is OFF initially
  
  dht.begin();
  setup_wifi();
  
  // Setup time sync (required for certificate validation)
  if (debugMode) Serial.println("Setting up time sync with NTP...");
  configTime(0, 0, ntp_server);
  
  // Wait for time to be set
  time_t now = time(nullptr);
  int timeoutCounter = 0;
  while (now < 8 * 3600 * 2 && timeoutCounter < 20) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    timeoutCounter++;
  }
  Serial.println();
  
  if (now > 8 * 3600 * 2) {
    if (debugMode) {
      Serial.println("Time synchronized successfully");
      struct tm timeinfo;
      gmtime_r(&now, &timeinfo);
      Serial.print("Current time: ");
      Serial.print(timeinfo.tm_year + 1900);
      Serial.print("-");
      Serial.print(timeinfo.tm_mon + 1);
      Serial.print("-");
      Serial.print(timeinfo.tm_mday);
      Serial.print(" ");
      Serial.print(timeinfo.tm_hour);
      Serial.print(":");
      Serial.print(timeinfo.tm_min);
      Serial.print(":");
      Serial.println(timeinfo.tm_sec);
    }
    
    // Configure TLS with certificate validation
    if (debugMode) Serial.println("Setting up secure TLS connection...");
    
    // Use insecure mode for demonstration
    espClient.setInsecure();
    
    if (debugMode) Serial.println("TLS: Using insecure mode for testing");
    
    // Optional: Set client certificate if broker requires mutual TLS
    // espClient.setCertificate(clientCert);
    // espClient.setPrivateKey(clientKey);
    
  } else {
    Serial.println("Failed to get time from NTP server");
    Serial.println("Using insecure mode as fallback");
    espClient.setInsecure();
  }
  
  // Setup MQTT connection
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
  
  if (debugMode) {
    // Log WiFi signal strength
    long rssi = WiFi.RSSI();
    Serial.print("WiFi signal strength (RSSI): ");
    Serial.print(rssi);
    Serial.println(" dBm");
    
    // Log connection information
    Serial.print("Connected to SSID: ");
    Serial.println(WiFi.SSID());
    Serial.print("MAC address: ");
    Serial.println(WiFi.macAddress());
    Serial.print("Subnet mask: ");
    Serial.println(WiFi.subnetMask());
    Serial.print("Gateway IP: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("DNS: ");
    Serial.println(WiFi.dnsIP());
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Handle pump control messages
  if (String(topic) == topic_pump_control) {
    DynamicJsonDocument doc(256);
    deserializeJson(doc, message);
    
    if (doc.containsKey("auto")) {
      autoMode = doc["auto"].as<bool>();
      Serial.print("Auto mode: ");
      Serial.println(autoMode);
    }
    
    if (doc.containsKey("pump") && !autoMode) {
      bool command = doc["pump"].as<bool>();
      controlPump(command);
    }
  }
}

void reconnect() {
  int reconnectAttempts = 0;
  while (!client.connected() && reconnectAttempts < 5) {
    reconnectAttempts++;
    Serial.print("Attempting MQTT connection to ");
    Serial.print(mqtt_server);
    Serial.print(":");
    Serial.print(mqtt_port);
    Serial.print(" (Attempt ");
    Serial.print(reconnectAttempts);
    Serial.print("/5)");
    Serial.println("...");
    
    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);
    
    if (debugMode) {
      Serial.print("Using client ID: ");
      Serial.println(clientId);
      Serial.print("MQTT user: ");
      Serial.println(mqtt_user != NULL ? mqtt_user : "none");
      Serial.print("MQTT password: ");
      Serial.println(mqtt_password != NULL ? "set" : "none");
    }
    
    unsigned long connectStart = millis();
    bool connectResult = client.connect(clientId.c_str(), mqtt_user, mqtt_password);
    unsigned long connectTime = millis() - connectStart;
    
    if (connectResult) {
      Serial.print("Connected to MQTT broker in ");
      Serial.print(connectTime);
      Serial.println(" ms");
      client.subscribe(topic_pump_control);
      
      // Send status message
      DynamicJsonDocument statusDoc(256);
      statusDoc["status"] = "connected";
      statusDoc["device_id"] = WiFi.macAddress();
      statusDoc["connect_time"] = connectTime;
      String statusMessage;
      serializeJson(statusDoc, statusMessage);
      client.publish(topic_status, statusMessage.c_str());
    } else {
      int mqttState = client.state();
      Serial.print("Failed, rc=");
      Serial.print(mqttState);
      Serial.print(" (");
      
      // Translate error code to human-readable message
      switch(mqttState) {
        case -4: Serial.print("Connection timeout"); break;
        case -3: Serial.print("Connection lost"); break;
        case -2: Serial.print("Connect failed"); break;
        case -1: Serial.print("Client disconnected"); break;
        case 1: Serial.print("Bad protocol"); break;
        case 2: Serial.print("Bad client ID"); break;
        case 3: Serial.print("Server unavailable"); break;
        case 4: Serial.print("Bad credentials"); break;
        case 5: Serial.print("Not authorized"); break;
        default: Serial.print("Unknown error"); break;
      }
      
      Serial.println(")");
      
      if (debugMode) {
        Serial.println("Checking WiFi status...");
        if (WiFi.status() != WL_CONNECTED) {
          Serial.println("WiFi disconnected. Reconnecting...");
          setup_wifi();
        } else {
          Serial.println("WiFi still connected. MQTT connection issue.");
          
          // Test server connectivity
          Serial.print("Testing connection to server IP...");
          IPAddress serverIP;
          if (WiFi.hostByName(mqtt_server, serverIP)) {
            Serial.print("Resolved: ");
            Serial.println(serverIP.toString());
          } else {
            Serial.println("DNS resolution failed!");
          }
        }
      }
      
      Serial.println("Trying again in 5 seconds");
      delay(5000);
    }
  }
  
  if (!client.connected()) {
    Serial.println("Failed to connect to MQTT broker after 5 attempts");
    Serial.println("Will continue with sensor readings but data won't be published");
  }
}

void controlPump(bool turnOn) {
  digitalWrite(PUMP_RELAY_PIN, turnOn ? HIGH : LOW);
  pumpStatus = turnOn;
  
  Serial.print("Pump turned ");
  Serial.println(turnOn ? "ON" : "OFF");
  
  // Publish pump status
  DynamicJsonDocument pumpDoc(256);
  pumpDoc["pump"] = pumpStatus;
  String pumpMessage;
  serializeJson(pumpDoc, pumpMessage);
  client.publish(topic_status, pumpMessage.c_str());
}

int readSoilMoisture() {
  int analogValue = analogRead(SOIL_MOISTURE_PIN);
  
  // Convert analog reading (0-1023) to percentage (0-100)
  // Using calibration values for more accurate readings
  int moisture = map(analogValue, dryValue, wetValue, 0, 100);
  
  // Constrain to handle values outside the expected range
  moisture = constrain(moisture, 0, 100);
  
  return moisture;
}

bool isAnomalous(int moisture) {
  // Check if moisture readings are outside the expected range
  // This could indicate sensor issues or disconnection
  return (moisture <= 0 || moisture >= 100);
}

// Add this debug function after checkSoilMoistureAnomaly
void logAnomalyDetectionDiagnostics(int currentReading) {
  if (!debugMode) return;
  
  Serial.println("\n----- ANOMALY DETECTION DIAGNOSTICS -----");
  
  // 1. Raw sensor reading diagnostics
  int rawAnalogValue = analogRead(SOIL_MOISTURE_PIN);
  Serial.print("Raw analog value: ");
  Serial.print(rawAnalogValue);
  Serial.print(" (mapped to ");
  Serial.print(currentReading);
  Serial.println("%)");
  
  // 2. Check sensor wiring/connection
  if (rawAnalogValue == 0 || rawAnalogValue == 1023) {
    Serial.println("POTENTIAL ISSUE: Sensor reading at extreme value - possible disconnection or short circuit");
  }
  
  // 3. Calibration issues
  Serial.print("Calibration settings - Dry: ");
  Serial.print(dryValue);
  Serial.print(", Wet: ");
  Serial.println(wetValue);
  
  // 4. Historical data analysis
  Serial.println("Historical readings:");
  for (int i = 0; i < NUM_READINGS; i++) {
    Serial.print("  Reading[");
    Serial.print(i);
    Serial.print("]: ");
    Serial.println(moistureReadings[i]);
  }
  
  // 5. Statistical analysis
  Serial.print("Mean: ");
  Serial.print(meanMoisture);
  Serial.print("%, StdDev: ");
  Serial.println(stdDevMoisture);
  
  float zScore = 0;
  if (stdDevMoisture > 0.5) {
    zScore = abs(currentReading - meanMoisture) / stdDevMoisture;
    Serial.print("Z-Score: ");
    Serial.println(zScore);
    Serial.print("Anomaly threshold: ");
    Serial.println(ANOMALY_THRESHOLD);
  } else {
    Serial.println("Standard deviation too low for meaningful z-score calculation");
  }
  
  // 6. Memory diagnostics
  Serial.print("Free heap: ");
  Serial.print(ESP.getFreeHeap());
  Serial.println(" bytes");
  
  // 7. Power stability check
  float vcc = ESP.getVcc() / 1000.0;  // This requires ADC_MODE(ADC_VCC) in setup
  Serial.print("Supply voltage: ");
  Serial.print(vcc);
  Serial.println("V");
  
  Serial.println("-----------------------------------------\n");
}

// Modify checkSoilMoistureAnomaly to call the diagnostics function
bool checkSoilMoistureAnomaly(int currentReading) {
  // Add current reading to the array
  moistureReadings[readingIndex] = currentReading;
  
  // Calculate mean and standard deviation after we have enough readings
  if (!readingsInitialized && readingIndex >= NUM_READINGS - 1) {
    readingsInitialized = true;
    if (debugMode) Serial.println("Anomaly detection initialized with baseline readings");
  }
  
  // Update index for next reading
  readingIndex = (readingIndex + 1) % NUM_READINGS;
  
  // If we don't have enough readings yet, we can't detect anomalies
  if (!readingsInitialized) {
    return false;
  }
  
  // Calculate mean
  float sum = 0;
  for (int i = 0; i < NUM_READINGS; i++) {
    sum += moistureReadings[i];
  }
  meanMoisture = sum / NUM_READINGS;
  
  // Calculate standard deviation
  float sumSquaredDiff = 0;
  for (int i = 0; i < NUM_READINGS; i++) {
    float diff = moistureReadings[i] - meanMoisture;
    sumSquaredDiff += diff * diff;
  }
  stdDevMoisture = sqrt(sumSquaredDiff / NUM_READINGS);
  
  // Check if current reading is an anomaly
  // We check if it's more than ANOMALY_THRESHOLD standard deviations from the mean
  // Also implement sanity checks for physically impossible values
  bool isAnomaly = false;
  
  // Check for physically impossible values (e.g., > 100% or < 0%)
  if (currentReading < 0 || currentReading > 100) {
    isAnomaly = true;
    if (debugMode) {
      Serial.print("Physical anomaly detected in moisture reading: ");
      Serial.print(currentReading);
      Serial.println("% (physically impossible value)");
    }
  }
  // Check for statistical anomalies if we have some variation in readings
  else if (stdDevMoisture > 0.5) {  // Avoid division by near-zero std dev
    float zScore = abs(currentReading - meanMoisture) / stdDevMoisture;
    if (zScore > ANOMALY_THRESHOLD) {
      isAnomaly = true;
      if (debugMode) {
        Serial.print("Statistical anomaly detected in moisture reading: ");
        Serial.print(currentReading);
        Serial.print("% (z-score: ");
        Serial.print(zScore);
        Serial.println(")");
      }
    }
  }
  
  // Call diagnostics logging for debug information
  if (isAnomaly || debugMode) {
    logAnomalyDetectionDiagnostics(currentReading);
  }
  
  return isAnomaly;
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long currentMillis = millis();
  
  // Read sensor data every X seconds
  if (currentMillis - lastMsg > msgInterval) {
    lastMsg = currentMillis;
    
    // Read sensors
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    int sensorValue = analogRead(SOIL_MOISTURE_PIN);
    int moisture = map(sensorValue, 0, 1023, 100, 0); // Convert to percentage (0-100%)
    
    // Check for sensor read errors
    bool dhtError = isnan(humidity) || isnan(temperature);
    bool moistureAnomaly = checkSoilMoistureAnomaly(moisture);
    
    // Prepare JSON document for sensor data
    DynamicJsonDocument sensorDoc(256);
    sensorDoc["device_id"] = WiFi.macAddress();
    sensorDoc["soil_moisture"] = moistureAnomaly ? -999 : moisture;
    sensorDoc["temperature"] = dhtError ? -999 : temperature;
    sensorDoc["humidity"] = dhtError ? -999 : humidity;
    sensorDoc["pump"] = pumpStatus;
    sensorDoc["timestamp"] = currentMillis;
    
    // Add anomaly flags
    sensorDoc["moisture_anomaly"] = moistureAnomaly;
    sensorDoc["dht_error"] = dhtError;
    
    String sensorMessage;
    serializeJson(sensorDoc, sensorMessage);
    
    // Publish to MQTT
    if (client.publish(topic_sensor_data, sensorMessage.c_str())) {
      Serial.println("Sensor data published successfully");
    } else {
      Serial.println("Failed to publish sensor data");
    }
    
    // Log the data to serial
    Serial.print("Soil moisture: ");
    Serial.print(moistureAnomaly ? -999 : moisture);
    if (moistureAnomaly) {
      Serial.print(" (ANOMALY)");
    }
    Serial.print("%, Temperature: ");
    Serial.print(dhtError ? "Error" : String(temperature));
    Serial.print("°C, Humidity: ");
    Serial.print(dhtError ? "Error" : String(humidity));
    Serial.println("%");
    
    // Automatic pump control based on soil moisture
    if (autoMode && !moistureAnomaly) {
      if (moisture < MOISTURE_THRESHOLD_LOW && !pumpStatus) {
        Serial.println("Moisture below threshold, turning pump ON");
        controlPump(true);  // Turn pump ON
      } else if (moisture > MOISTURE_THRESHOLD_HIGH && pumpStatus) {
        Serial.println("Moisture above threshold, turning pump OFF");
        controlPump(false); // Turn pump OFF
      }
    }
  }
} 