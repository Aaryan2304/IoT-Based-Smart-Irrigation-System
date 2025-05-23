const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  soilMoisture: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  temperature: {
    type: Number,
    required: true,
    // Removed min/max constraints to handle sensor errors
  },
  humidity: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  pumpStatus: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Add a flag to indicate sensor errors
  dhtError: {
    type: Boolean,
    default: false
  }
});

// Create indexes for efficient querying
sensorDataSchema.index({ deviceId: 1, timestamp: -1 });

// Virtual for formatted timestamp
sensorDataSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString();
});

// Method to check if values are in normal range
sensorDataSchema.methods.isInNormalRange = function() {
  // If DHT error is present, only check soil moisture
  if (this.dhtError) {
    return this.soilMoisture >= 20;
  }
  // Otherwise check all values
  return this.soilMoisture >= 20 && 
         this.temperature >= 10 && this.temperature <= 40 && 
         this.humidity >= 20 && this.humidity <= 90;
};

module.exports = mongoose.model('SensorData', sensorDataSchema); 