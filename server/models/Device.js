const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  autoMode: {
    type: Boolean,
    default: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: null
  },
  settings: {
    moistureThresholdLow: {
      type: Number,
      default: 30,
      min: 0,
      max: 100
    },
    moistureThresholdHigh: {
      type: Number,
      default: 55,
      min: 0,
      max: 100
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to check if device needs maintenance (hasn't been seen in 24 hours)
deviceSchema.methods.needsMaintenance = function() {
  if (!this.lastSeen) return true;
  
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  
  return this.lastSeen < twentyFourHoursAgo;
};

// Update last seen timestamp
deviceSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  this.isOnline = true;
  return this.save();
};

// Set device offline
deviceSchema.methods.setOffline = function() {
  this.isOnline = false;
  return this.save();
};

module.exports = mongoose.model('Device', deviceSchema); 