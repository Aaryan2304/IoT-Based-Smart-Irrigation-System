const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const auth = require('../middleware/auth');

// Get all devices
router.get('/', auth, async (req, res) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get a specific device
router.get('/:id', auth, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Create a new device
router.post('/', auth, async (req, res) => {
  try {
    const { deviceId, name, location, settings } = req.body;
    
    // Check if device ID already exists
    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) {
      return res.status(400).json({ error: 'Device ID already exists' });
    }
    
    // Create new device
    const device = new Device({
      deviceId,
      name,
      location,
      settings: {
        moistureThresholdLow: settings?.moistureThresholdLow || 30,
        moistureThresholdHigh: settings?.moistureThresholdHigh || 55,
        notificationsEnabled: settings?.notificationsEnabled !== undefined 
          ? settings.notificationsEnabled 
          : true
      }
    });
    
    await device.save();
    res.status(201).json(device);
  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({ error: 'Failed to create device' });
  }
});

// Update device basic info
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, location } = req.body;
    
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Update fields
    if (name) device.name = name;
    if (location) device.location = location;
    
    await device.save();
    res.json(device);
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

// Update device thresholds
router.patch('/:id/thresholds', auth, async (req, res) => {
  try {
    const { moistureThresholdLow, moistureThresholdHigh } = req.body;
    
    // Basic validation
    if (moistureThresholdLow === undefined || moistureThresholdHigh === undefined) {
      return res.status(400).json({ error: 'Both threshold values are required' });
    }
    
    // Ensure thresholds are within range
    if (moistureThresholdLow < 0 || moistureThresholdLow > 100 ||
        moistureThresholdHigh < 0 || moistureThresholdHigh > 100) {
      return res.status(400).json({ error: 'Thresholds must be between 0 and 100' });
    }
    
    // Ensure low is less than high
    if (moistureThresholdLow >= moistureThresholdHigh) {
      return res.status(400).json({ error: 'Low threshold must be less than high threshold' });
    }
    
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Update thresholds
    device.settings.moistureThresholdLow = moistureThresholdLow;
    device.settings.moistureThresholdHigh = moistureThresholdHigh;
    
    await device.save();
    res.json({ 
      success: true, 
      message: 'Thresholds updated successfully',
      device 
    });
  } catch (error) {
    console.error('Error updating thresholds:', error);
    res.status(500).json({ error: 'Failed to update thresholds' });
  }
});

// Update device auto mode
router.patch('/:id/auto-mode', auth, async (req, res) => {
  try {
    const { autoMode } = req.body;
    
    if (autoMode === undefined) {
      return res.status(400).json({ error: 'autoMode parameter is required' });
    }
    
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Update auto mode
    device.autoMode = autoMode;
    
    await device.save();
    res.json({ 
      success: true, 
      message: 'Auto mode updated successfully',
      device 
    });
  } catch (error) {
    console.error('Error updating auto mode:', error);
    res.status(500).json({ error: 'Failed to update auto mode' });
  }
});

// Update device auto mode by deviceId (not MongoDB id)
router.patch('/device/:deviceId/mode', auth, async (req, res) => {
  try {
    const { autoMode } = req.body;
    
    if (autoMode === undefined) {
      return res.status(400).json({ error: 'autoMode parameter is required' });
    }
    
    const device = await Device.findOne({ deviceId: req.params.deviceId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Update auto mode
    device.autoMode = autoMode;
    
    await device.save();
    res.json({ 
      success: true, 
      message: 'Auto mode updated successfully',
      device 
    });
  } catch (error) {
    console.error('Error updating auto mode:', error);
    res.status(500).json({ error: 'Failed to update auto mode' });
  }
});

// Control pump for a specific device by deviceId
router.post('/:deviceId/pump', auth, async (req, res) => {
  try {
    const { status, autoMode } = req.body;
    
    if (status === undefined) {
      return res.status(400).json({ error: 'status parameter is required' });
    }
    
    // Find device by deviceId (not MongoDB _id)
    const device = await Device.findOne({ deviceId: req.params.deviceId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Update device autoMode if provided
    if (autoMode !== undefined) {
      device.autoMode = autoMode;
      await device.save();
    }
    
    // Get MQTT client from app locals
    const mqttClient = req.app.locals.mqttClient;
    
    // Publish control message to MQTT
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(process.env.MQTT_TOPIC_PUMP_CONTROL, JSON.stringify({
        device_id: req.params.deviceId,
        pump: status,
        auto: device.autoMode
      }), { qos: 1 });
    } else {
      console.warn('MQTT client not available or not connected');
    }
    
    res.json({ 
      success: true, 
      message: `Pump ${status ? 'turned ON' : 'turned OFF'}`,
      device
    });
  } catch (error) {
    console.error('Error controlling pump:', error);
    res.status(500).json({ error: 'Failed to control pump' });
  }
});

// Delete a device
router.delete('/:id', auth, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    await device.deleteOne();
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// Delete a device by deviceId (not MongoDB id)
router.delete('/device/:deviceId', auth, async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.params.deviceId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    await device.deleteOne();
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Error deleting device by deviceId:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

module.exports = router; 