const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const auth = require('../middleware/auth');

// Get system settings
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to access system settings' 
      });
    }
    
    // Get settings from .env file
    const envConfig = dotenv.parse(fs.readFileSync(path.resolve(process.cwd(), '.env')));
    
    // Return only safe settings (no credentials)
    const settings = {
      defaultThresholdLow: parseInt(envConfig.DEFAULT_THRESHOLD_LOW) || 30,
      defaultThresholdHigh: parseInt(envConfig.DEFAULT_THRESHOLD_HIGH) || 55,
      emailRecipient: envConfig.EMAIL_RECIPIENT || ''
    };
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch system settings' 
    });
  }
});

// Update system settings
router.put('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to update system settings' 
      });
    }
    
    const { defaultThresholdLow, defaultThresholdHigh, emailRecipient } = req.body;
    
    // Basic validation
    if (!emailRecipient || !defaultThresholdLow || !defaultThresholdHigh) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Validate thresholds
    if (defaultThresholdLow >= defaultThresholdHigh) {
      return res.status(400).json({
        success: false,
        error: 'Low threshold must be less than high threshold'
      });
    }
    
    // Update .env file
    const envPath = path.resolve(process.cwd(), '.env');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    
    // Update values
    envConfig.EMAIL_RECIPIENT = emailRecipient;
    envConfig.DEFAULT_THRESHOLD_LOW = defaultThresholdLow;
    envConfig.DEFAULT_THRESHOLD_HIGH = defaultThresholdHigh;
    
    // Write back to .env
    const envContent = Object.keys(envConfig)
      .map(key => `${key}=${envConfig[key]}`)
      .join('\n');
    
    fs.writeFileSync(envPath, envContent);
    
    // Return success
    res.json({
      success: true,
      message: 'System settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update system settings' 
    });
  }
});

module.exports = router; 