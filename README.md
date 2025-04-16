# IoT-based Smart Irrigation System

A complete solution for automating plant irrigation using real-time sensor data from NodeMCU ESP8266, with a web dashboard for monitoring and control.

## Features

- **Automated Irrigation**: Waters plants automatically based on configurable soil moisture thresholds.
- **Real-time Monitoring**: View current soil moisture, temperature, and humidity via Dashboard and MQTT.
- **Remote Control**: Manually control the water pump from the web dashboard.
- **Data Visualization**: View historical sensor data with interactive charts (24h, 7d, 30d).
- **3D Visualization**: See an interactive 3D representation of your plant and irrigation system status.
- **DHT Error Handling**: System identifies and flags potential DHT sensor errors (`dhtError` flag) without discarding soil moisture data.
- **Secure Communication**: Uses MQTT with TLS (via HiveMQ Cloud) for secure data transmission.
- **User Management**: Multi-user system with JWT-based authentication (Login/Register). Supports 'user' and 'admin' roles.
- **Device Management**: Add, edit, and delete irrigation devices. Configure device-specific settings.
- **Statistics**: View aggregated statistics for each device.
- **Profile Management**: Users can manage their profile information and change passwords.
- **System Settings (Admin)**: Admins can configure default thresholds and notification settings.
- **Notifications**: (Partially implemented - Structure exists) View system notifications. Email alerts configured via `.env`.
- **Responsive Design**: Web dashboard works on desktop and mobile devices.

## System Architecture

### Hardware Components
- NodeMCU ESP8266 (Microcontroller)
- Soil Moisture Sensor (Analog, connected to A0)
- DHT11/DHT22 Temperature/Humidity Sensor (connected to D3)
- Relay Module (connected to D0)
- 5V Water Pump

### Software Components
- **NodeMCU Firmware**: Arduino code (`nodeMCU_code/`) handles sensor reading, pump control, and MQTT communication.
- **Backend Server**: Node.js (`server.js`, `server/`) using Express.js.
  - Handles MQTT messages (subscribes to sensor data, status, alerts).
  - Provides REST APIs for frontend communication.
  - Stores data in MongoDB.
  - Manages user authentication and authorization.
- **Frontend Application**: Single Page Application (`public/`) built with HTML, CSS, Bootstrap 5, and vanilla JavaScript.
  - Uses Chart.js for charts and Three.js for 3D visualization.
  - Communicates with the backend via REST APIs and Socket.IO (for potential real-time updates, though primary updates seem MQTT-driven via backend).
- **Database**: MongoDB stores sensor data, device configurations, and user information.
- **MQTT Broker**: HiveMQ Cloud (as per `.env`) facilitates real-time communication between NodeMCU and the backend server.

## Setup Instructions

### Hardware Setup

1.  Connect the soil moisture sensor analog output to the **A0** pin on NodeMCU.
2.  Connect the DHT11/DHT22 data pin to the **D3** pin on NodeMCU.
3.  Connect the relay module control pin (IN) to the **D0** pin on NodeMCU.
4.  Connect the water pump to the relay module's normally open (NO) or normally closed (NC) terminal, depending on your relay type, and provide appropriate power to the pump and relay.
5.  Power the NodeMCU via USB or an external 5V power supply.

### NodeMCU Setup

1.  Install the Arduino IDE.
2.  Install the ESP8266 board support package in the Arduino IDE (Boards Manager).
3.  Install the required libraries from the Arduino Library Manager:
    *   `ESP8266WiFi`
    *   `PubSubClient` (by Nick O'Leary)
    *   `DHT sensor library` (by Adafruit)
    *   `ArduinoJson` (version 6.x)
    *   `WiFiClientSecure`
4.  **(Calibration)**: It's highly recommended to calibrate your soil moisture sensor first using the `nodeMCU_code/soil_moisture_calibration.ino` sketch. Note the `dryValue` (sensor in air) and `wetValue` (sensor in water).
5.  Open the main firmware sketch (`nodeMCU_code/smart_irrigation.ino` or similar) in the Arduino IDE.
6.  Update the following constants in the code:
    *   WiFi credentials (`ssid`, `password`).
    *   MQTT broker details (`mqtt_server`, `mqtt_port`, `mqtt_username`, `mqtt_password` - should match your `.env` file).
    *   MQTT topics (if different from defaults).
    *   Soil moisture calibration values (`dryValue`, `wetValue` from step 4).
    *   Device ID (`DEVICE_ID`).
7.  Verify the TLS setup. The current code might use `client.setInsecure()`. For production, refer to `nodeMCU_code/mqtt_tls_example.ino` and use `espClient.setTrustAnchors(&cert)` with the correct root CA (e.g., `isrgrootx1.pem` provided).
8.  Upload the code to your NodeMCU.

### Server Setup

1.  Install Node.js (v14 or later recommended) and npm.
2.  Install MongoDB and ensure it's running (default URI: `mongodb://localhost:27017/smart_irrigation`).
3.  Clone this repository: `git clone <repository_url>`
4.  Navigate to the project directory: `cd <project_directory>`
5.  Install dependencies: `npm install`
6.  Create a `.env` file in the project root. Copy the contents from `.env.example` (if available) or create it based on the required variables (see `BACKEND_README.md` or `.env` file content). **Crucially, update:**
    *   `MONGODB_URI`
    *   `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` (matching NodeMCU settings)
    *   `EMAIL_USER`, `EMAIL_PASS` (use a Gmail App Password), `EMAIL_RECIPIENT`
    *   `JWT_SECRET` (generate a strong secret key)
7.  Start the server:
    *   For development (with auto-restart): `npm run dev`
    *   For production: `npm start`
8.  Access the web dashboard in your browser, typically at `http://localhost:3000` (or the port specified in `.env`).

## System Operation

The system primarily operates in **Automatic Mode**, where the backend logic (potentially triggered by incoming MQTT data or scheduled checks, although the exact trigger isn't explicitly shown in provided server code) determines when to turn the pump on/off based on the latest soil moisture reading and the configured thresholds for the specific device.

- **Thresholds**: Default thresholds are set in `.env` (`DEFAULT_THRESHOLD_LOW`, `DEFAULT_THRESHOLD_HIGH`) and applied to new devices. These can be overridden per device via the 'Devices' section or potentially the dashboard modal. Admins can change the system defaults via the 'Settings' page.
- **Manual Mode**: Users can disable automatic mode for a device via the dashboard. In manual mode, the pump can be turned ON or OFF using dedicated buttons. The backend sends control messages via the `MQTT_TOPIC_PUMP_CONTROL` topic.
- **Data Flow**:
    1. NodeMCU reads sensors periodically.
    2. NodeMCU publishes data (including `soilMoisture`, `temperature`, `humidity`, `pumpStatus`, `dhtError`) to `MQTT_TOPIC_SENSOR_DATA` (or `MQTT_TOPIC_SENSORS_DATA`).
    3. Backend server receives MQTT message, parses it, and saves it to the `SensorData` collection in MongoDB.
    4. Frontend fetches data via REST APIs (`/api/sensor-data`, `/api/devices`, etc.) to display on the dashboard, device list, statistics page, etc.
    5. User interactions (e.g., manual pump control, setting changes) trigger API calls to the backend.
    6. Backend sends pump control commands back to the NodeMCU via MQTT (`MQTT_TOPIC_PUMP_CONTROL`).

## Dashboard Features

- **Dashboard**: Main overview showing current moisture gauge, environmental conditions, pump control, historical data chart, system info, and 3D visualization for the selected device.
- **Devices**: List, add, edit, and delete irrigation devices. Configure device-specific thresholds and settings.
- **Statistics**: View aggregated historical statistics (min/max/avg) for selected devices.
- **Profile**: Manage user name, email, and password. Configure personal notification preferences.
- **Settings (Admin only)**: Configure system-wide default thresholds and the recipient email address for alerts.
- **Notifications**: View system-generated notifications (e.g., alerts, status changes).

## Troubleshooting

### Common Hardware Issues
- **Incorrect Sensor Readings**: Check wiring. Recalibrate the soil moisture sensor. Ensure DHT sensor is functioning (check for `dhtError: true` in data).
- **Pump Not Working**: Verify relay wiring and power. Test the relay manually. Check D0 pin connection.
- **NodeMCU Connection Issues**: Verify WiFi credentials. Check NodeMCU power supply. Ensure the board is flashed correctly.

### Common Software Issues
- **MQTT Connection Failure**: Verify broker URL, port, username/password in both NodeMCU code and `.env` file. Ensure the MQTT broker is running and accessible (check firewall). Check server logs (`npm run dev` or `npm start` output). Check NodeMCU serial monitor output.
- **Database Issues**: Ensure MongoDB service is running. Verify `MONGODB_URI` in `.env`. Check for validation errors in server logs (e.g., due to unexpected sensor values before `dhtError` handling was added).
- **API Errors**: Check browser developer console (Network tab, Console tab) for errors when interacting with the dashboard. Check server logs for backend errors.
- **Authentication Problems**: Ensure correct email/password. Check JWT secret consistency.
- **Data Not Updating**: Verify NodeMCU is publishing data (Serial Monitor). Check MQTT broker logs/clients (like MQTT Explorer). Ensure the backend is receiving MQTT messages and saving them. Check API calls from the frontend.

## License

MIT License

## Contributors

- [Your Name] - Initial work 