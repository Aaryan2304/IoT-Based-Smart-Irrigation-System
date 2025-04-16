const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');

// Simple /data endpoint for dashboard data (new endpoint)
router.get('/data', async (req, res) => {
  try {
    const { limit = 50, deviceId, from, to } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by device if provided
    if (deviceId) {
      query.deviceId = deviceId;
    }
    
    // Filter by date range if provided
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    
    // Get sensor data with pagination
    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10));
    
    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard data' 
    });
  }
});

// Get latest sensor data for all devices
router.get('/latest', async (req, res) => {
  try {
    // Aggregate the latest reading for each device
    const latestData = await SensorData.aggregate([
      {
        $sort: { deviceId: 1, timestamp: -1 }
      },
      {
        $group: {
          _id: '$deviceId',
          latestReading: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$latestReading' }
      }
    ]);
    
    res.json(latestData);
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    res.status(500).json({ error: 'Failed to fetch latest sensor data' });
  }
});

// Get sensor data for a specific device
router.get('/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 100, from, to } = req.query;
    
    // Build query
    const query = { deviceId };
    
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    
    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10));
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching device sensor data:', error);
    res.status(500).json({ error: 'Failed to fetch device sensor data' });
  }
});

// Get aggregated hourly sensor data for charts
router.get('/aggregated/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days, 10));
    
    const aggregatedData = await SensorData.aggregate([
      {
        $match: {
          deviceId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          },
          // Always include soil moisture
          avgSoilMoisture: { $avg: '$soilMoisture' },
          
          // Only include temperature from non-error records
          avgTemperature: { 
            $avg: {
              $cond: [
                { $or: [{ $eq: ['$dhtError', false] }, { $eq: ['$dhtError', null] }] },
                '$temperature',
                null
              ]
            } 
          },
          
          // Only include humidity from non-error records
          avgHumidity: { 
            $avg: {
              $cond: [
                { $or: [{ $eq: ['$dhtError', false] }, { $eq: ['$dhtError', null] }] },
                '$humidity',
                null
              ]
            } 
          },
          
          // Pump status tracking
          pumpRunning: { $max: { $cond: ['$pumpStatus', 1, 0] } },
          timestamp: { $first: '$timestamp' },
          
          // Track if ANY record in this hour had a DHT error
          hasDhtError: { $max: { $cond: ['$dhtError', 1, 0] } }
        }
      },
      {
        $sort: { timestamp: 1 }
      }
    ]);
    
    res.json(aggregatedData);
  } catch (error) {
    console.error('Error fetching aggregated sensor data:', error);
    res.status(500).json({ error: 'Failed to fetch aggregated sensor data' });
  }
});

// Get statistical summary for a device
router.get('/stats/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days, 10));
    
    const stats = await SensorData.aggregate([
      {
        $match: {
          deviceId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          // Always include soil moisture data
          avgSoilMoisture: { $avg: '$soilMoisture' },
          minSoilMoisture: { $min: '$soilMoisture' },
          maxSoilMoisture: { $max: '$soilMoisture' },
          
          // Only include temperature data from records where dhtError is false or not set
          avgTemperature: { 
            $avg: {
              $cond: [
                { $or: [{ $eq: ['$dhtError', false] }, { $eq: ['$dhtError', null] }] },
                '$temperature',
                null
              ]
            } 
          },
          minTemperature: { 
            $min: {
              $cond: [
                { $or: [{ $eq: ['$dhtError', false] }, { $eq: ['$dhtError', null] }] },
                '$temperature',
                null
              ]
            } 
          },
          maxTemperature: { 
            $max: {
              $cond: [
                { $or: [{ $eq: ['$dhtError', false] }, { $eq: ['$dhtError', null] }] },
                '$temperature',
                null
              ]
            } 
          },
          
          // Only include humidity data from records where dhtError is false or not set
          avgHumidity: { 
            $avg: {
              $cond: [
                { $or: [{ $eq: ['$dhtError', false] }, { $eq: ['$dhtError', null] }] },
                '$humidity',
                null
              ]
            } 
          },
          minHumidity: { 
            $min: {
              $cond: [
                { $or: [{ $eq: ['$dhtError', false] }, { $eq: ['$dhtError', null] }] },
                '$humidity',
                null
              ]
            } 
          },
          maxHumidity: { 
            $max: {
              $cond: [
                { $or: [{ $eq: ['$dhtError', false] }, { $eq: ['$dhtError', null] }] },
                '$humidity',
                null
              ]
            } 
          },
          
          // Count how many times the pump was on
          pumpOnCount: { $sum: { $cond: ['$pumpStatus', 1, 0] } },
          firstReading: { $min: '$timestamp' },
          lastReading: { $max: '$timestamp' }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return res.json({
        count: 0,
        avgSoilMoisture: 0,
        minSoilMoisture: 0,
        maxSoilMoisture: 0,
        avgTemperature: 0,
        minTemperature: 0,
        maxTemperature: 0,
        avgHumidity: 0,
        minHumidity: 0,
        maxHumidity: 0,
        pumpOnCount: 0,
        firstReading: null,
        lastReading: null
      });
    }
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router; 