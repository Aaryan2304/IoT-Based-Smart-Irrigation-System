const nodemailer = require('nodemailer');

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send alert email for abnormal sensor readings
 * @param {Object} data - The sensor data
 * @param {string} data.deviceId - Device ID
 * @param {string} data.deviceName - Device name
 * @param {number} data.soilMoisture - Soil moisture percentage
 * @param {number} data.temperature - Temperature in Celsius
 * @param {number} data.humidity - Humidity percentage
 * @param {Date} data.timestamp - Timestamp of the reading
 * @param {string} [data.alertType] - Type of alert (optional)
 * @param {string} [data.alertMessage] - Custom alert message (optional)
 * @returns {Promise<boolean>} - True if email sent successfully
 */
const sendAlertEmail = async (data) => {
  try {
    // If alert type is provided directly, use it for a custom alert
    if (data.alertType && data.alertMessage) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_RECIPIENT,
        subject: `Alert: ${data.alertType} from ${data.deviceName}`,
        html: `
          <h2>Alert: ${data.alertType}</h2>
          <p><strong>Device:</strong> ${data.deviceName} (${data.deviceId})</p>
          <p><strong>Time:</strong> ${data.timestamp.toLocaleString()}</p>
          
          <h3>Alert Details:</h3>
          <p>${data.alertMessage}</p>
          
          <h3>Current Readings:</h3>
          <ul>
            <li>Soil Moisture: ${data.soilMoisture}%</li>
            <li>Temperature: ${data.temperature}°C</li>
            <li>Humidity: ${data.humidity}%</li>
          </ul>
          
          <p>Please check your irrigation system and sensors.</p>
          <p>This is an automated message from your Smart Irrigation System.</p>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`Custom alert email sent: ${info.messageId}`);
      return true;
    }
    
    // Process standard anomaly detection
    const abnormalReadings = [];
    
    if (data.soilMoisture < 20) {
      abnormalReadings.push(`Soil moisture critically low: ${data.soilMoisture}%`);
    }
    
    if (data.temperature < 10 || data.temperature > 40) {
      abnormalReadings.push(`Temperature outside normal range: ${data.temperature}°C`);
    }
    
    if (data.humidity < 20 || data.humidity > 90) {
      abnormalReadings.push(`Humidity outside normal range: ${data.humidity}%`);
    }
    
    if (abnormalReadings.length === 0) return true; // No abnormal readings
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_RECIPIENT,
      subject: `Alert: Abnormal readings from ${data.deviceName}`,
      html: `
        <h2>Alert: Abnormal Readings Detected</h2>
        <p><strong>Device:</strong> ${data.deviceName} (${data.deviceId})</p>
        <p><strong>Time:</strong> ${data.timestamp.toLocaleString()}</p>
        
        <h3>Abnormal Readings:</h3>
        <ul>
          ${abnormalReadings.map(reading => `<li>${reading}</li>`).join('')}
        </ul>
        
        <h3>Current Readings:</h3>
        <ul>
          <li>Soil Moisture: ${data.soilMoisture}%</li>
          <li>Temperature: ${data.temperature}°C</li>
          <li>Humidity: ${data.humidity}%</li>
        </ul>
        
        <p>Please check your irrigation system and sensors.</p>
        <p>This is an automated message from your Smart Irrigation System.</p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Alert email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending alert email:', error);
    return false;
  }
};

module.exports = {
  sendAlertEmail
}; 