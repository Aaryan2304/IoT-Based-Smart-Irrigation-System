# NodeMCU Firmware for Smart Irrigation System

This firmware enables a NodeMCU ESP8266 to read soil moisture and environmental data, control a water pump, and communicate securely with an MQTT broker.

## Hardware Requirements

- NodeMCU ESP8266
- Soil Moisture Sensor (analog)
- DHT11 Temperature and Humidity Sensor
- Relay Module
- 5V Water Pump

## Wiring Instructions

1. Connect soil moisture sensor to A0 pin
2. Connect DHT11 sensor to D3 pin
3. Connect relay module to D0 pin
4. Connect the relay to control the water pump
5. Power NodeMCU via USB or external power supply
6. Power water pump with an appropriate 5V supply

## Library Dependencies

Install the following libraries in Arduino IDE:
- ESP8266WiFi
- PubSubClient
- WiFiClientSecure
- DHT sensor library by Adafruit
- ArduinoJson (v6.x)

## Configuration

Before uploading the firmware, update the following settings in the code:

### WiFi Configuration
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### MQTT Configuration
```cpp
const char* mqtt_server = "YOUR_HIVEMQ_BROKER"; // e.g. "broker.hivemq.com"
const int mqtt_port = 8883; // TLS port
const char* mqtt_user = "YOUR_MQTT_USERNAME"; // if required
const char* mqtt_password = "YOUR_MQTT_PASSWORD"; // if required
```

### Moisture Threshold Configuration
```cpp
#define MOISTURE_THRESHOLD_LOW 30  // Turn pump ON when moisture is below 30%
#define MOISTURE_THRESHOLD_HIGH 55 // Turn pump OFF when moisture is above 55%
```

## Calibrating the Soil Moisture Sensor

For accurate moisture percentage readings, you need to calibrate the sensor:

1. **Measure Dry Value**:
   - Remove the soil moisture sensor from soil and make sure it's completely dry
   - Open the Serial Monitor in Arduino IDE (set baud rate to 115200)
   - Upload this test sketch to get the raw analog value:

   ```cpp
   void setup() {
     Serial.begin(115200);
   }
   
   void loop() {
     int rawValue = analogRead(A0);
     Serial.println("Raw sensor value (dry): " + String(rawValue));
     delay(1000);
   }
   ```
   - Note the stable reading as your `dryValue` (typically close to 1023)

2. **Measure Wet Value**:
   - Place the sensor in a cup of water (don't submerge the electronics, just the probes)
   - Note the stable reading as your `wetValue` (typically closer to 0)

3. **Update Calibration Values**:
   - Update these values in the main code:
   ```cpp
   int dryValue = 1023;  // Replace with your measured dry value
   int wetValue = 0;     // Replace with your measured wet value
   ```

## TLS Security Note

For development purposes, this firmware uses `setInsecure()` to establish TLS connections without certificate validation. For production use, implement proper certificate validation:

1. Obtain the required certificates for your MQTT broker
2. Use `espClient.setCACert(root_ca)` to set the root certificate
3. Optionally, use client certificates as required by your broker

## MQTT Topics

The firmware communicates using these topics:
- `irrigation/sensor_data`: Publishes sensor readings every 10 seconds
- `irrigation/pump_control`: Subscribes to receive pump control commands
- `irrigation/status`: Publishes device status and pump state changes

## Manual Testing

After uploading the firmware, you can test the MQTT communication using tools like MQTT Explorer or mosquitto_pub/sub:

1. To manually control the pump, publish to `irrigation/pump_control`:
   ```json
   {"auto": false, "pump": true}  // Turn pump ON in manual mode
   ```
   ```json
   {"auto": false, "pump": false} // Turn pump OFF in manual mode
   ```
   ```json
   {"auto": true}                 // Switch back to automatic mode
   ```

2. Monitor sensor readings by subscribing to `irrigation/sensor_data`

## Troubleshooting

- **No WiFi connection**: Check SSID and password
- **Can't connect to MQTT**: Verify broker address, port, and credentials
- **Sensor readings are incorrect**: Recalibrate soil moisture sensor
- **DHT sensor errors**: Check wiring and try a different DHT library
- **Pump not activating**: Check relay connections and test relay separately

## Anomaly Detection

The firmware flags these anomalies:
- Soil moisture readings <= 0% or >= 100%
- DHT11 sensor read failures 