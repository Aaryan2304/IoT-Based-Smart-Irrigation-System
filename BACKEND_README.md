# Smart Irrigation System - Backend

This backend server, built with Node.js and Express, serves as the central hub for the Smart Irrigation System. It processes MQTT data from IoT devices (NodeMCU), stores it in MongoDB, provides RESTful API endpoints for the frontend dashboard, manages user authentication, and handles system logic like automatic pump control and alerts.

## Prerequisites

1.  **Node.js**: Version 14 or later recommended. (Check with `node -v`)
2.  **npm**: Node Package Manager (usually comes with Node.js).
3.  **MongoDB**: Ensure MongoDB server is installed and running. The default connection URI used is `mongodb://localhost:27017/smart_irrigation`.
4.  **MQTT Broker**: A running MQTT broker accessible by the server. The configuration in `.env` points to HiveMQ Cloud (`mqtts://...hivemq.cloud:8883`). Ensure credentials match.
5.  **Git**: For cloning the repository.
6.  **Gmail Account with App Password**: Required if email notifications are used (see `.env` configuration).

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository_url>
    cd <project_directory>
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create the environment configuration file:
    *   Copy `.env.example` to `.env` if it exists, or create a new `.env` file in the project root.
    *   Update the variables in `.env` with your specific settings (see Configuration section below).
4.  Ensure your MongoDB server is running.
5.  Start the server:
    *   For development (with automatic restarting on file changes using `nodemon`):
        ```bash
        npm run dev
        ```
    *   For production:
        ```bash
        npm start
        ```
    The server will typically be accessible at `http://localhost:3000` (or the `PORT` specified in `.env`).

## Configuration (`.env` File)

Create a `.env` file in the project root and populate it with the following variables, replacing placeholder values with your actual configuration:

```dotenv
# Server Configuration
PORT=3000
NODE_ENV=development # or production

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/smart_irrigation

# MQTT Configuration (Example for HiveMQ Cloud)
MQTT_BROKER_URL=mqtts://<your_broker_id>.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=<your_mqtt_username>
MQTT_PASSWORD=<your_mqtt_password>
MQTT_CLIENT_ID=server_client # Can be customized

# MQTT Topics
MQTT_TOPIC_SENSOR_DATA=irrigation/sensor_data # Primary topic for sensor data
MQTT_TOPIC_PUMP_CONTROL=irrigation/pump_control # Topic for sending pump commands to devices
MQTT_TOPIC_STATUS=irrigation/status # Topic for device status updates (e.g., online/offline)
MQTT_TOPIC_SENSORS_DATA=sensors/data # Alternative sensor data topic
MQTT_TOPIC_ALERTS=alerts # Topic for custom alerts from devices

# Email Configuration (for alerts, using Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=<your_gmail_address@gmail.com>
EMAIL_PASS=<your_16_digit_gmail_app_password>
EMAIL_RECIPIENT=<default_recipient_email@example.com>

# JWT Configuration
JWT_SECRET=<generate_a_strong_random_secret_key> # e.g., using openssl rand -hex 32
JWT_EXPIRES_IN=7d # Token expiration time

# Default Device Settings
DEFAULT_THRESHOLD_LOW=40 # Default low moisture % for new devices
DEFAULT_THRESHOLD_HIGH=70 # Default high moisture % for new devices
```

### Gmail App Password Setup

If using Gmail for alerts:
1.  Enable 2-Step Verification on your Google Account.
2.  Go to Google Account settings > Security > 2-Step Verification.
3.  Scroll down to "App passwords".
4.  Select App: "Mail", Select device: "Other (Custom name)".
5.  Enter a name (e.g., "SmartIrrigationServer") and click "Generate".
6.  Copy the generated 16-digit password and use it as `EMAIL_PASS` in your `.env` file.

## MQTT Topics Handled

The server subscribes to and processes messages from these topics (defined in `.env`):

-   **`MQTT_TOPIC_SENSOR_DATA` / `MQTT_TOPIC_SENSORS_DATA`**: Receives sensor readings from NodeMCU devices. The server parses these messages and stores them in the `SensorData` MongoDB collection.
-   **`MQTT_TOPIC_STATUS`**: Listens for device status updates (e.g., online, offline notifications).
-   **`MQTT_TOPIC_ALERTS`**: Listens for specific alert messages sent from devices.

The server publishes messages to:

-   **`MQTT_TOPIC_PUMP_CONTROL`**: Sends commands to specific devices to turn the pump ON/OFF or change the auto mode status.

## Data Formats (MQTT)

### Sensor Data (`MQTT_TOPIC_SENSOR_DATA` / `MQTT_TOPIC_SENSORS_DATA`)

The server expects JSON payloads. Key fields include:

```json
{
  "deviceId": "device_unique_id", // or "device_id"
  "soilMoisture": 45, // or "soil_moisture"
  "temperature": 22, // or "temp"
  "humidity": 65, // or "humid"
  "pumpStatus": false, // or "pump" (Boolean)
  "dhtError": false // Optional: Boolean indicating if there was a DHT sensor reading error
  // timestamp is usually added by the server upon reception or parsed if included
}
```

*Note: The `dhtError` flag is important. If `true`, the server might ignore temperature/humidity for calculations but still saves the record with the soil moisture.* 

### Alerts (`MQTT_TOPIC_ALERTS`)

```json
{
  "deviceId": "device_unique_id", // or "device_id"
  "type": "AlertType", // e.g., "Sensor Failure", "Low Battery"
  "message": "Descriptive alert message",
  "timestamp": "ISO_Date_String" // Optional
}
```

## API Endpoints

The server exposes the following REST API endpoints under the `/api` prefix. Most routes require JWT authentication via a `Bearer` token in the `Authorization` header (`auth` middleware).

### Authentication (`/api/users`)

-   **POST `/login`**: Authenticate user.
    -   Body: `{ "email": "user@example.com", "password": "secret" }`
    -   Response: `{ "success": true, "token": "jwt_token", "user": { ...user_details } }`
-   **POST `/register`**: Register a new user.
    -   Body: `{ "name": "User Name", "email": "user@example.com", "password": "secret" }`
    -   Response: `{ "success": true, "token": "jwt_token", "user": { ...user_details } }`
-   **GET `/me`** (`auth` required): Get current authenticated user's details.
    -   Response: `{ "success": true, "user": { ...user_details } }`

### Sensor Data (`/api/sensor-data`)

-   **GET `/data`**: Get recent sensor data, primarily for dashboard.
    -   Query Params: `limit` (int, default 50), `deviceId` (string), `from` (ISO Date), `to` (ISO Date)
    -   Response: `{ "success": true, "count": number, "data": [ ...sensor_data_records ] }`
-   **GET `/latest`**: Get the latest distinct reading for each registered device.
    -   Response: `[ ...latest_sensor_data_records ]`
-   **GET `/device/:deviceId`**: Get historical data for a specific device.
    -   Query Params: `limit` (int, default 100), `from` (ISO Date), `to` (ISO Date)
    -   Response: `[ ...sensor_data_records ]`
-   **GET `/aggregated/:deviceId`**: Get hourly aggregated data for charts.
    -   Query Params: `days` (int, default 7)
    -   Response: `[ ...aggregated_data_points ]` (includes avgSoilMoisture, avgTemperature, avgHumidity, pumpRunning, hasDhtError)
-   **GET `/stats/:deviceId`**: Get statistical summary (min, max, avg) for a device over a period.
    -   Query Params: `days` (int, default 30)
    -   Response: `{ count, avgSoilMoisture, ..., pumpOnCount, firstReading, lastReading }`

### Devices (`/api/devices`)

*All routes require `auth`.*

-   **GET `/`**: Get a list of all registered devices.
-   **POST `/`**: Create a new device.
    -   Body: `{ "deviceId": "unique_id", "name": "Device Name", "location": "Location", "settings": { "moistureThresholdLow": 30, "moistureThresholdHigh": 60, "notificationsEnabled": true } }`
-   **GET `/:id`**: Get a specific device by its MongoDB `_id`.
-   **PUT `/:id`**: Update basic device info (name, location) by MongoDB `_id`.
    -   Body: `{ "name": "New Name", "location": "New Location" }`
-   **PATCH `/:id/thresholds`**: Update moisture thresholds by MongoDB `_id`.
    -   Body: `{ "moistureThresholdLow": 35, "moistureThresholdHigh": 65 }`
-   **PATCH `/:id/auto-mode`**: Update auto mode status by MongoDB `_id`.
    -   Body: `{ "autoMode": true/false }`
-   **PATCH `/device/:deviceId/mode`**: Update auto mode status by device `deviceId`.
    -   Body: `{ "autoMode": true/false }`
-   **POST `/:deviceId/pump`**: Control the pump for a specific device by `deviceId` and optionally update its auto mode.
    -   Body: `{ "status": true/false, "autoMode": true/false }` (autoMode is optional)
-   **DELETE `/:id`**: Delete a device by MongoDB `_id`.
-   **DELETE `/device/:deviceId`**: Delete a device by `deviceId`.

### Settings (`/api/settings`)

*Requires `auth` and `admin` role.*

-   **GET `/`**: Get current system settings (default thresholds, email recipient).
-   **PUT `/`**: Update system settings.
    -   Body: `{ "defaultThresholdLow": 40, "defaultThresholdHigh": 70, "emailRecipient": "admin@example.com" }`

## Database Models

-   **`SensorData`**: Stores individual sensor readings (`deviceId`, `soilMoisture`, `temperature`, `humidity`, `pumpStatus`, `timestamp`, `dhtError`).
-   **`Device`**: Stores device configuration (`deviceId`, `name`, `location`, `autoMode`, `settings` {`moistureThresholdLow`, `moistureThresholdHigh`, `notificationsEnabled`}).
-   **`User`**: Stores user information (`name`, `email`, `password` (hashed), `role`, `notificationPreferences`, `lastLogin`).

## Testing MQTT

You can manually publish messages to test the server's MQTT handling using a client like `mosquitto_pub` or MQTT Explorer:

```bash
# Example: Publish sensor data (adjust host, port, user, pass, topic as needed)
mosquitto_pub -h <broker_host> -p <port> -u <user> -P <pass> -t sensors/data -m '{"deviceId":"testDevice001","soilMoisture":55,"temperature":23.5,"humidity":68,"pumpStatus":false, "dhtError":false}'

# Example: Publish an alert
mosquitto_pub -h <broker_host> -p <port> -u <user> -P <pass> -t alerts -m '{"deviceId":"testDevice001","type":"Sensor Failure","message":"DHT sensor read failed multiple times"}'
```

## Troubleshooting

-   **Server Won't Start**: Check console for errors. Ensure `.env` file exists and is correctly formatted. Verify `PORT` is not already in use.
-   **MongoDB Connection Issues**: Confirm MongoDB server is running. Double-check `MONGODB_URI` in `.env`. Check MongoDB logs.
-   **MQTT Connection Issues**: Verify broker details (`URL`, `USERNAME`, `PASSWORD`) in `.env`. Ensure the broker is running and accessible from the server. Check server logs for MQTT connection errors.
-   **API Errors (401 Unauthorized)**: Ensure a valid JWT `Bearer` token is included in the `Authorization` header for protected routes.
-   **API Errors (403 Forbidden)**: Ensure the authenticated user has the required role (e.g., `admin` for settings).
-   **Data Not Saving/Updating**: Check server logs for MQTT message processing errors or database errors. Verify the JSON format of incoming MQTT messages matches expectations. Check `dhtError` handling logic if temperature/humidity seems off.
-   **Email Alert Issues**: Confirm `EMAIL_USER` and `EMAIL_PASS` (App Password) are correct in `.env`. Check Gmail security settings. Verify `EMAIL_RECIPIENT` is correct.

## License

MIT 