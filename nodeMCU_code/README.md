# NodeMCU Firmware for Smart Irrigation System

This firmware enables a NodeMCU ESP8266 board to:
- Read analog soil moisture levels.
- Read temperature and humidity using a DHT sensor.
- Control a water pump via a relay module.
- Communicate securely with an MQTT broker (configured for HiveMQ Cloud with TLS) to send sensor data and receive control commands.
- Handle potential DHT sensor read errors gracefully.

## Hardware Requirements

- NodeMCU ESP8266 V2 or V3
- Capacitive Soil Moisture Sensor (Analog Output)
- DHT11 or DHT22 Temperature and Humidity Sensor
- 5V Relay Module (Single Channel)
- 5V Water Pump (or pump compatible with your relay and power supply)
- Connecting Wires (Dupont cables recommended)
- Separate 5V power supply for the water pump (recommended)

## Wiring Instructions

| Component             | NodeMCU Pin | Connection                                      |
| --------------------- | ----------- | ----------------------------------------------- |
| Soil Moisture Sensor  | A0          | Analog Output (AO/SIG)                          |
|                       | 3V3         | VCC                                             |
|                       | GND         | GND                                             |
| DHT Sensor            | D3 (GPIO0)  | Data Pin                                        |
|                       | 3V3         | VCC                                             |
|                       | GND         | GND                                             |
| Relay Module          | D0 (GPIO16) | IN (Control Pin)                                |
|                       | 3V3 or 5V*  | VCC (*Check relay module requirements*)         |
|                       | GND         | GND                                             |
| Water Pump Power (+)  | N/A         | Relay COM (Common) Terminal                     |
| Water Pump Power (-)  | N/A         | Power Supply GND                                |
| Power Supply 5V (+)   | N/A         | Relay NO (Normally Open) or NC Terminal**       |

**Notes:**
- *\*Some relay modules require 5V, ensure your NodeMCU setup can provide this or use an external supply.*
- *\***Connect to NO if you want the pump OFF by default, NC if you want it ON by default. The firmware assumes OFF by default (connected to NO).*
- Power the NodeMCU itself via its Micro-USB port or the Vin pin (if using >5V supply via Vin).

## Library Dependencies

Install the following libraries using the Arduino IDE Library Manager:

1.  `ESP8266WiFi` (Usually included with ESP8266 Board Support)
2.  `PubSubClient` by Nick O'Leary
3.  `WiFiClientSecure` (Usually included with ESP8266 Board Support)
4.  `DHT sensor library` by Adafruit
5.  `Adafruit Unified Sensor` by Adafruit (Dependency for DHT library)
6.  `ArduinoJson` by Benoit Blanchon (Install version 6.x)

## Configuration (Before Uploading)

Open the main firmware sketch (e.g., `smart_irrigation.ino`) and update the constants at the beginning of the file:

```cpp
// --- Device Configuration ---
const char* DEVICE_ID = "YourUniqueDeviceID"; // Replace with a unique ID for this device

// --- WiFi Configuration ---
const char* ssid = "YOUR_WIFI_SSID";         // Replace with your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";   // Replace with your WiFi password

// --- MQTT Configuration (Match your .env file) ---
const char* mqtt_server = "<your_broker_id>.s1.eu.hivemq.cloud"; // From HiveMQ Cloud
const int mqtt_port = 8883;
const char* mqtt_username = "<your_mqtt_username>"; // From HiveMQ Cloud
const char* mqtt_password = "<your_mqtt_password>"; // From HiveMQ Cloud

// --- MQTT Topics (Match your .env file) ---
const char* topic_sensor_data = "irrigation/sensor_data"; // Topic to publish sensor readings
const char* topic_pump_control = "irrigation/pump_control"; // Topic to receive pump commands
const char* topic_status = "irrigation/status";         // Topic to publish device status

// --- Sensor Configuration ---
#define SOIL_MOISTURE_PIN A0
#define DHT_PIN D3
#define DHT_TYPE DHT11 // or DHT22
#define RELAY_PIN D0

// --- Soil Moisture Calibration ---
// !! IMPORTANT: Calibrate using soil_moisture_calibration.ino !!
int dryValue = 950; // Replace with your sensor's reading in dry air
int wetValue = 450; // Replace with your sensor's reading fully submerged in water

// --- Timing Intervals ---
unsigned long sensorReadInterval = 10000; // Read sensors every 10 seconds
unsigned long mqttPublishInterval = 30000; // Publish data every 30 seconds
```

## Calibrating the Soil Moisture Sensor

Accurate percentage readings depend on calibration. Use the provided `soil_moisture_calibration.ino` sketch:

1.  Upload `soil_moisture_calibration.ino` to your NodeMCU.
2.  Open the Arduino IDE Serial Monitor (set baud rate to 115200).
3.  Hold the sensor probes in **dry air**. Note the stable "Raw Value" - this is your `dryValue`.
4.  Submerge the sensor probes **fully in water**. Note the stable "Raw Value" - this is your `wetValue`.
5.  Update `dryValue` and `wetValue` constants in the main firmware sketch with the values you recorded.

## TLS Security

The firmware is configured to connect to HiveMQ Cloud using TLS for security.
- It relies on the `WiFiClientSecure` library.
- **Root CA Certificate**: The necessary Root CA certificate (e.g., ISRG Root X1 for Let's Encrypt, used by HiveMQ Cloud) must be included in the firmware or handled by the underlying library. The example `mqtt_tls_example.ino` shows how to embed and use it with `espClient.setTrustAnchors(&cert);`. Ensure the main sketch implements proper certificate handling for secure connections. **Avoid using `client.setInsecure()` in production.**
- **Time Synchronization**: Secure TLS connections require the device to have the correct time to validate certificates. The firmware should include NTP time synchronization (`configTime`, `time(nullptr)`) before establishing the MQTT connection, as shown in `mqtt_tls_example.ino`.

## MQTT Communication

### Published Topics

-   **`topic_sensor_data` (`irrigation/sensor_data`)**: Publishes JSON payload with sensor readings at `mqttPublishInterval`.
    ```json
    {
      "deviceId": "YourUniqueDeviceID",
      "soilMoisture": 45.6,
      "temperature": 22.5,
      "humidity": 60.1,
      "pumpStatus": false,
      "dhtError": false
    }
    ```
    *If a DHT read error occurs, `temperature` and `humidity` might be fallback values (e.g., -999), and `dhtError` will be `true`.*
-   **`topic_status` (`irrigation/status`)**: Publishes device status messages (e.g., "Device connected", "Pump ON/OFF", "Auto Mode ON/OFF").

### Subscribed Topics

-   **`topic_pump_control` (`irrigation/pump_control`)**: Listens for JSON commands to control the pump and mode.
    ```json
    // Turn pump ON, set mode to Manual
    {"deviceId": "YourUniqueDeviceID", "pump": true, "auto": false}

    // Turn pump OFF, keep mode as is (or set explicitly)
    {"deviceId": "YourUniqueDeviceID", "pump": false}

    // Set mode to Automatic (pump state might be adjusted by device logic)
    {"deviceId": "YourUniqueDeviceID", "auto": true}
    ```
    *The firmware should check if the `deviceId` in the message matches its own `DEVICE_ID` before acting.*

## Troubleshooting

-   **WiFi Connection Failure**: Double-check SSID and password in the configuration. Ensure your WiFi network is 2.4GHz. Check signal strength.
-   **MQTT Connection Failure**: Verify MQTT broker address (`mqtt_server`), port (8883 for TLS), username, and password match your HiveMQ Cloud credentials (and `.env` file). Check if the device has correct time for TLS validation. Look for specific error codes in the Serial Monitor (see `PubSubClient` documentation or `mqtt_tls_example.ino` comments).
-   **Incorrect Sensor Readings**: Check wiring. Recalibrate the soil moisture sensor. Ensure the correct `DHT_TYPE` (DHT11 or DHT22) is defined.
-   **DHT Sensor Errors (`dhtError: true`)**: Check DHT sensor wiring (VCC, GND, Data). Ensure good connections. Replace the sensor if necessary. Some environmental factors can affect DHT readings.
-   **Pump Not Activating**: Check relay wiring (Control pin D0, VCC, GND). Ensure the relay receives adequate power. Test the relay module separately. Verify pump wiring and power supply.
-   **Serial Monitor Gibberish**: Ensure the Serial Monitor baud rate is set to 115200 (or matching the `Serial.begin()` value in the code).

## Anomaly Detection / Error Handling

-   The firmware includes checks for DHT sensor read failures. If a failure occurs, it sets the `dhtError` flag to `true` in the published MQTT message and may use fallback values for temperature/humidity (like -999) to signal the error to the backend.
-   Soil moisture percentage is constrained between 0% and 100%. 