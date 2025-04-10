# IoT-based Smart Irrigation System

A complete solution for automating plant irrigation using real-time sensor data from NodeMCU ESP8266, with a web dashboard for monitoring and control.

## Features

- **Automated Irrigation**: Waters plants automatically based on soil moisture levels
- **Real-time Monitoring**: View current soil moisture, temperature, and humidity
- **Remote Control**: Manually control water pump from anywhere via web dashboard
- **Data Visualization**: View historical sensor data with interactive charts
- **3D Visualization**: See a 3D representation of your plant and irrigation system
- **Email Alerts**: Receive notifications for abnormal sensor readings
- **Secure Communication**: MQTT with TLS for secure data transmission
- **User Management**: Multi-user system with authentication and authorization
- **Responsive Design**: Works on desktop and mobile devices

## System Architecture

### Hardware Components
- NodeMCU ESP8266 (Microcontroller)
- Soil Moisture Sensor (connected to A0)
- DHT11 Temperature/Humidity Sensor (connected to D3)
- Relay Module (connected to D0)
- 5V Water Pump

### Software Components
- Arduino code for NodeMCU
- Node.js backend server
- MongoDB database
- MQTT for real-time communication
- Express.js for APIs
- Socket.io for real-time updates
- Chart.js for data visualization
- Three.js for 3D visualization

## Setup Instructions

### Hardware Setup

1. Connect the soil moisture sensor to the A0 pin on NodeMCU
2. Connect the DHT11 sensor to the D3 pin on NodeMCU
3. Connect the relay module to the D0 pin on NodeMCU
4. Connect the water pump to the relay module
5. Power the NodeMCU via USB or external power supply
6. Power the water pump with an appropriate 5V supply

### NodeMCU Setup

1. Install the Arduino IDE
2. Install ESP8266 board support in Arduino IDE
3. Install required libraries: ESP8266WiFi, PubSubClient, DHT, ArduinoJson
4. Open `nodeMCU_code/smart_irrigation.ino` in Arduino IDE
5. Update WiFi credentials and MQTT settings
6. Upload the code to your NodeMCU

### Server Setup

1. Install Node.js and MongoDB
2. Clone this repository
3. Navigate to the project directory and install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file based on the provided template and update settings
5. Start MongoDB:
   ```
   mongod
   ```
6. Start the server:
   ```
   npm start
   ```
7. Access the web dashboard at http://localhost:3000

### MQTT Setup

1. Install an MQTT broker (e.g., Mosquitto)
2. Configure MQTT for TLS security (optional but recommended)
3. Update MQTT broker settings in both NodeMCU code and server .env file

## System Operation

The system operates in two modes:

1. **Automatic Mode**: 
   - Water pump turns ON when soil moisture falls below 30%
   - Water pump turns OFF when soil moisture rises above 55%
   - Settings can be adjusted via the dashboard

2. **Manual Mode**:
   - Toggle automatic mode off in the dashboard
   - Manually control the pump using ON/OFF buttons

## Dashboard Features

- **Real-time Monitoring**: View current sensor readings
- **Historical Data**: Analyze trends over time (24h, 7d, 30d)
- **Device Management**: Add, configure, and monitor multiple devices
- **User Management**: Admin can manage users and permissions
- **Settings**: Configure thresholds, notifications, and more
- **Profile**: Manage your account and notification preferences

## Troubleshooting

### Common Hardware Issues
- Check all wiring connections
- Ensure sensors are properly inserted in soil
- Verify power supply is adequate for both NodeMCU and pump
- Try resetting the NodeMCU

### Common Software Issues
- Check MQTT broker connection
- Verify MongoDB is running
- Ensure correct environment variables are set
- Check server logs for errors
- Verify WiFi connectivity on NodeMCU

## License

MIT License

## Contributors

- [Your Name] - Initial work 