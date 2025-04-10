const express = require('express');
const router = express.Router();
const Device = require('../models/Device');

// Get all devices
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find().sort({ name: 1 });
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get a specific device
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findOne({ deviceId });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json(device);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Create or update a device
router.post('/', async (req, res) => {
  try {
    const { deviceId, name, location, settings } = req.body;
    
    if (!deviceId || !name) {
      return res.status(400).json({ error: 'Device ID and name are required' });
    }
    
    // Find existing device or create new one
    let device = await Device.findOne({ deviceId });
    
    if (!device) {
      // Create new device
      device = new Device({
        deviceId,
        name,
        location,
        settings
      });
    } else {
      // Update existing device
      device.name = name;
      if (location) device.location = location;
      if (settings) {
        device.settings = {
          ...device.settings,
          ...settings
        };
      }
    }
    
    await device.save();
    res.json(device);
  } catch (error) {
    console.error('Error saving device:', error);
    res.status(500).json({ error: 'Failed to save device' });
  }
});

// Update device settings
router.patch('/:deviceId/settings', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { moistureThresholdLow, moistureThresholdHigh, notificationsEnabled } = req.body;
    
    const device = await Device.findOne({ deviceId });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Update settings if provided
    if (moistureThresholdLow !== undefined) {
      device.settings.moistureThresholdLow = moistureThresholdLow;
    }
    
    if (moistureThresholdHigh !== undefined) {
      device.settings.moistureThresholdHigh = moistureThresholdHigh;
    }
    
    if (notificationsEnabled !== undefined) {
      device.settings.notificationsEnabled = notificationsEnabled;
    }
    
    await device.save();
    res.json(device);
  } catch (error) {
    console.error('Error updating device settings:', error);
    res.status(500).json({ error: 'Failed to update device settings' });
  }
});

// Set device auto/manual mode
router.patch('/:deviceId/mode', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { autoMode } = req.body;
    
    if (autoMode === undefined) {
      return res.status(400).json({ error: 'autoMode parameter is required' });
    }
    
    const device = await Device.findOne({ deviceId });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    device.autoMode = autoMode;
    await device.save();
    
    // Return the updated device
    res.json(device);
  } catch (error) {
    console.error('Error updating device mode:', error);
    res.status(500).json({ error: 'Failed to update device mode' });
  }
});

// Control pump endpoint
router.post('/:deviceId/pump', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { status, autoMode } = req.body;
    
    if (status === undefined) {
      return res.status(400).json({ error: 'pump status parameter is required' });
    }
    
    // Get the device
    const device = await Device.findOne({ deviceId });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // If autoMode is provided, update it
    if (autoMode !== undefined) {
      device.autoMode = autoMode;
      await device.save();
    }
    
    // Get MQTT client from app (passed through req.app.locals)
    const mqttClient = req.app.locals.mqttClient;
    
    if (!mqttClient || !mqttClient.connected) {
      return res.status(500).json({ error: 'MQTT client not connected' });
    }
    
    // Publish pump control message
    mqttClient.publish(process.env.MQTT_TOPIC_PUMP_CONTROL, JSON.stringify({
      device_id: deviceId,
      pump: status,
      auto: device.autoMode
    }), { qos: 1 });
    
    // Return success response
    res.json({
      deviceId,
      pumpStatus: status,
      autoMode: device.autoMode,
      message: `Pump turned ${status ? 'ON' : 'OFF'}`
    });
  } catch (error) {
    console.error('Error controlling pump:', error);
    res.status(500).json({ error: 'Failed to control pump' });
  }
});

// Delete a device
router.delete('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const device = await Device.findOne({ deviceId });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    await Device.deleteOne({ deviceId });
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

module.exports = router; 