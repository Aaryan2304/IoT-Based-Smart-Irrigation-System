require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const mqtt = require('mqtt');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import models
const SensorData = require('./server/models/SensorData');
const Device = require('./server/models/Device');

// Import utility functions
const { sendAlertEmail } = require('./server/utils/emailService');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// MQTT Client setup
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, {
  clientId: process.env.MQTT_CLIENT_ID,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  clean: true
});

// Make MQTT client available to route handlers
app.locals.mqttClient = mqttClient;

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Subscribe to topics
  mqttClient.subscribe(process.env.MQTT_TOPIC_SENSOR_DATA, { qos: 1 });
  mqttClient.subscribe(process.env.MQTT_TOPIC_STATUS, { qos: 1 });
  // Subscribe to new topics
  mqttClient.subscribe(process.env.MQTT_TOPIC_SENSORS_DATA, { qos: 1 });
  mqttClient.subscribe(process.env.MQTT_TOPIC_ALERTS, { qos: 1 });
});

mqttClient.on('error', (error) => {
  console.error('MQTT connection error:', error);
});

mqttClient.on('message', async (topic, message) => {
  console.log(`Message received: ${topic}`);
  
  try {
    const data = JSON.parse(message.toString());
    
    if (topic === process.env.MQTT_TOPIC_SENSOR_DATA) {
      // Process sensor data
      const sensorData = new SensorData({
        deviceId: data.device_id,
        soilMoisture: data.soil_moisture,
        temperature: data.temperature,
        humidity: data.humidity,
        pumpStatus: data.pump,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
      });
      
      await sensorData.save();
      
      // Update device's last seen timestamp
      let device = await Device.findOne({ deviceId: data.device_id });
      
      if (!device) {
        // Create new device if not exists
        device = new Device({
          deviceId: data.device_id,
          name: `Device ${data.device_id.substring(data.device_id.length - 6)}`,
          isOnline: true,
          lastSeen: new Date()
        });
        await device.save();
      } else {
        await device.updateLastSeen();
      }
      
      // Check for anomalies and send alert if needed
      if (!sensorData.isInNormalRange() && device.settings.notificationsEnabled) {
        sendAlertEmail({
          deviceId: device.deviceId,
          deviceName: device.name,
          soilMoisture: sensorData.soilMoisture,
          temperature: sensorData.temperature,
          humidity: sensorData.humidity,
          timestamp: sensorData.timestamp
        });
      }
      
      // Emit real-time update to connected clients
      io.emit('sensorData', sensorData);
    }
    
    // Handle sensors/data topic (new format)
    if (topic === process.env.MQTT_TOPIC_SENSORS_DATA) {
      // Extract sensor readings from the data payload
      // Support different data formats by checking for existence of fields
      
      // Create a standard format for storing in MongoDB
      const sensorData = new SensorData({
        deviceId: data.device_id || data.deviceId || data.id || 'unknown',
        soilMoisture: data.soil_moisture || data.soilMoisture || data.moisture || 0,
        temperature: data.temperature || data.temp || 0,
        humidity: data.humidity || data.humid || 0,
        pumpStatus: data.pump_status || data.pumpStatus || data.pump || false,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
      });
      
      // Save to database
      await sensorData.save();
      
      // Check for associated device
      let device = await Device.findOne({ deviceId: sensorData.deviceId });
      
      if (!device) {
        // Create new device if not exists
        device = new Device({
          deviceId: sensorData.deviceId,
          name: `Device ${sensorData.deviceId.substring(Math.max(0, sensorData.deviceId.length - 6))}`,
          isOnline: true,
          lastSeen: new Date()
        });
        await device.save();
      } else {
        await device.updateLastSeen();
      }
      
      // Emit real-time update to connected clients
      io.emit('sensorData', sensorData);
    }
    
    // Handle alerts topic
    if (topic === process.env.MQTT_TOPIC_ALERTS) {
      console.log('Alert received:', data);
      
      // Extract alert information
      const alertType = data.type || 'unknown';
      const deviceId = data.device_id || data.deviceId || data.id || 'unknown';
      const message = data.message || 'No details provided';
      const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
      
      // Find the device associated with this alert
      const device = await Device.findOne({ deviceId });
      
      // Send email alert if the device exists and notifications are enabled
      if (device && device.settings && device.settings.notificationsEnabled) {
        await sendAlertEmail({
          deviceId: device.deviceId,
          deviceName: device.name,
          soilMoisture: data.soil_moisture || data.soilMoisture || 0,
          temperature: data.temperature || data.temp || 0,
          humidity: data.humidity || data.humid || 0,
          timestamp: timestamp,
          alertType: alertType,
          alertMessage: message
        });
      }
      
      // Emit alert to connected clients for real-time display
      io.emit('deviceAlert', {
        deviceId: deviceId,
        alertType: alertType,
        message: message,
        timestamp: timestamp
      });
    }
    
    if (topic === process.env.MQTT_TOPIC_STATUS) {
      if (data.status === 'connected') {
        // Update device status
        let device = await Device.findOne({ deviceId: data.device_id });
        
        if (device) {
          await device.updateLastSeen();
        }
        
        // Emit device status update
        io.emit('deviceStatus', { deviceId: data.device_id, isOnline: true });
      }
    }
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

// API Routes
app.use('/api/sensor-data', require('./server/routes/sensorData'));
app.use('/api/devices', require('./server/routes/devices'));
app.use('/api/users', require('./server/routes/users'));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('controlPump', async (data) => {
    try {
      const { deviceId, pumpStatus, autoMode } = data;
      
      // Update device in database
      const device = await Device.findOne({ deviceId });
      if (device) {
        device.autoMode = autoMode;
        await device.save();
      }
      
      // Send command to device via MQTT
      mqttClient.publish(process.env.MQTT_TOPIC_PUMP_CONTROL, JSON.stringify({
        device_id: deviceId,
        pump: pumpStatus,
        auto: autoMode
      }), { qos: 1 });
      
      // Broadcast to all clients
      io.emit('pumpStatus', { deviceId, pumpStatus, autoMode });
    } catch (error) {
      console.error('Error controlling pump:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Print setup instructions
  console.log('\n=== Smart Irrigation System Backend ===');
  console.log('Make sure the following prerequisites are met:');
  console.log('1. MongoDB is installed and running on localhost:27017');
  console.log('2. MQTT broker is available at ' + process.env.MQTT_BROKER_URL);
  console.log('3. For email alerts, a Gmail App Password is configured in .env');
  console.log('\nSubscribed to MQTT topics:');
  console.log('- ' + process.env.MQTT_TOPIC_SENSOR_DATA);
  console.log('- ' + process.env.MQTT_TOPIC_STATUS);
  console.log('- ' + process.env.MQTT_TOPIC_SENSORS_DATA);
  console.log('- ' + process.env.MQTT_TOPIC_ALERTS);
  console.log('\nAPI Endpoints:');
  console.log('- GET /api/sensor-data/data - Dashboard data with optional filters');
  console.log('- GET /api/sensor-data/latest - Latest readings from all devices');
  console.log('- GET /api/sensor-data/device/:deviceId - Historical data for a specific device');
  console.log('- GET /api/sensor-data/aggregated/:deviceId - Aggregated data for charts');
  console.log('- GET /api/sensor-data/stats/:deviceId - Statistical summary for a device');
  console.log('=======================================\n');
}); 