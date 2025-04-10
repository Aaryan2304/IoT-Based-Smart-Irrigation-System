# Smart Irrigation System - Backend

This backend server processes MQTT data from IoT devices, stores it in MongoDB, and provides API endpoints for the dashboard. It also sends email alerts when anomalies are detected.

## Prerequisites

1. **Node.js** and npm installed (v14+ recommended)
2. **MongoDB** installed and running on `localhost:27017`
3. **MQTT broker** (e.g., Mosquitto, HiveMQ) available
4. **Gmail account** with App Password (for sending email alerts)

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables in `.env` file (see below)
4. Start the server:
   ```
   npm start
   ```
   or for development:
   ```
   npm run dev
   ```

## Configuration

Update the `.env` file with your settings:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/smart_irrigation

# MQTT Configuration
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=your_mqtt_username
MQTT_PASSWORD=your_mqtt_password
MQTT_CLIENT_ID=server_client
MQTT_TOPIC_SENSOR_DATA=irrigation/sensor_data
MQTT_TOPIC_PUMP_CONTROL=irrigation/pump_control
MQTT_TOPIC_STATUS=irrigation/status
MQTT_TOPIC_SENSORS_DATA=sensors/data
MQTT_TOPIC_ALERTS=alerts

# Email Configuration (for alerts)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_RECIPIENT=recipient@example.com
```

### Gmail App Password Setup

1. Go to your Google Account settings
2. Navigate to Security > 2-Step Verification
3. At the bottom, click on "App passwords"
4. Select "Mail" as the app and "Other" as the device
5. Enter a name (e.g., "Smart Irrigation")
6. Click "Generate" and copy the 16-character password
7. Paste this password in your `.env` file as `EMAIL_PASS`

## MQTT Topics

The server subscribes to the following MQTT topics:

1. **irrigation/sensor_data** - Original sensor data format
2. **irrigation/status** - Device status updates
3. **sensors/data** - New sensor data format (added)
4. **alerts** - Custom alerts from devices (added)

## Data Formats

### sensors/data Topic

```json
{
  "device_id": "device123",
  "soil_moisture": 45,
  "temperature": 22,
  "humidity": 65,
  "pump_status": false,
  "timestamp": "2023-10-04T12:34:56Z"
}
```

Alternative formats are also supported:
```json
{
  "deviceId": "device123",
  "soilMoisture": 45,
  "temp": 22,
  "humid": 65,
  "pump": false
}
```

### alerts Topic

```json
{
  "device_id": "device123",
  "type": "Sensor Failure",
  "message": "Soil moisture sensor disconnected",
  "timestamp": "2023-10-04T12:34:56Z"
}
```

## API Endpoints

- **GET /api/sensor-data/data** - Dashboard data with optional filters
  - Query parameters:
    - `limit` - Maximum number of readings (default: 50)
    - `deviceId` - Filter by specific device
    - `from` - Start date (ISO format)
    - `to` - End date (ISO format)

- **GET /api/sensor-data/latest** - Latest readings from all devices

- **GET /api/sensor-data/device/:deviceId** - Historical data for a specific device
  - Query parameters:
    - `limit` - Maximum number of readings (default: 100)
    - `from` - Start date (ISO format)
    - `to` - End date (ISO format)

- **GET /api/sensor-data/aggregated/:deviceId** - Aggregated data for charts
  - Query parameters:
    - `days` - Number of days to include (default: 7)

- **GET /api/sensor-data/stats/:deviceId** - Statistical summary for a device
  - Query parameters:
    - `days` - Number of days to include (default: 30)

## Testing

You can test the server by publishing MQTT messages using a client like Mosquitto or MQTT Explorer:

```bash
# Publish sample sensor data
mosquitto_pub -h localhost -t sensors/data -m '{"device_id":"test123","soil_moisture":42,"temperature":25,"humidity":60}'

# Publish sample alert
mosquitto_pub -h localhost -t alerts -m '{"device_id":"test123","type":"Low Battery","message":"Battery level critical (15%)"}'
```

## Troubleshooting

- **MongoDB connection issues**: Make sure MongoDB is installed and running
- **MQTT connection issues**: 
  - Check MQTT broker URL, username, and password
  - Verify the broker is running and accessible
- **Email alert issues**:
  - Ensure your Gmail App Password is correct
  - Check your Gmail account settings to allow less secure apps

## License

MIT 