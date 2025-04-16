/**
 * Settings Module
 * Handles system-wide settings for the irrigation system
 */

const Settings = {
  // Initialize settings page
  async init() {
    console.log('Initializing Settings page');
    
    // Render settings page
    this.renderSettingsPage();
    
    // Load current settings
    await this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
  },
  
  // Render settings page structure
  renderSettingsPage() {
    const container = document.getElementById('settings-container');
    
    container.innerHTML = `
      <div class="col-md-12 mb-4">
        <h2><i class="bi bi-gear-fill me-2"></i>System Settings</h2>
      </div>
      
      <div class="col-md-6">
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">
            <i class="bi bi-sliders me-2"></i>Default Device Settings
          </div>
          <div class="card-body">
            <form id="default-settings-form">
              <div class="mb-3">
                <label for="default-moisture-low" class="form-label">Default Low Moisture Threshold (%)</label>
                <input type="number" class="form-control" id="default-moisture-low" min="0" max="100" value="30">
                <div class="form-text">Default threshold for new devices (pump turns ON below this)</div>
              </div>
              
              <div class="mb-3">
                <label for="default-moisture-high" class="form-label">Default High Moisture Threshold (%)</label>
                <input type="number" class="form-control" id="default-moisture-high" min="0" max="100" value="55">
                <div class="form-text">Default threshold for new devices (pump turns OFF above this)</div>
              </div>
              
              <button type="submit" class="btn btn-primary">
                <i class="bi bi-save me-1"></i> Save Default Settings
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">
            <i class="bi bi-envelope me-2"></i>Notification Settings
          </div>
          <div class="card-body">
            <form id="notification-settings-form">
              <div class="mb-3">
                <label for="email-recipient" class="form-label">Email for System Alerts</label>
                <input type="email" class="form-control" id="email-recipient">
                <div class="form-text">Where system alerts will be sent</div>
              </div>
              
              <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" id="enable-alerts" checked>
                <label class="form-check-label" for="enable-alerts">
                  Enable System-wide Alerts
                </label>
              </div>
              
              <button type="submit" class="btn btn-primary">
                <i class="bi bi-save me-1"></i> Save Notification Settings
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  },
  
  // Load settings from API/localStorage
  async loadSettings() {
    try {
      // For demo purposes, load from localStorage if available
      const defaultLow = localStorage.getItem('default-moisture-low') || 30;
      const defaultHigh = localStorage.getItem('default-moisture-high') || 55;
      const emailRecipient = localStorage.getItem('email-recipient') || '';
      const enableAlerts = localStorage.getItem('enable-alerts') !== 'false';
      
      // Set form values
      document.getElementById('default-moisture-low').value = defaultLow;
      document.getElementById('default-moisture-high').value = defaultHigh;
      document.getElementById('email-recipient').value = emailRecipient;
      document.getElementById('enable-alerts').checked = enableAlerts;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },
  
  // Save default settings
  async saveDefaultSettings(event) {
    event.preventDefault();
    
    try {
      const defaultLow = document.getElementById('default-moisture-low').value;
      const defaultHigh = document.getElementById('default-moisture-high').value;
      
      // Validate settings
      if (parseInt(defaultLow) >= parseInt(defaultHigh)) {
        App.showError('Low threshold must be less than high threshold');
        return;
      }
      
      // Save to localStorage for demo
      localStorage.setItem('default-moisture-low', defaultLow);
      localStorage.setItem('default-moisture-high', defaultHigh);
      
      // Show success message
      App.showSuccess('Default settings saved successfully');
    } catch (error) {
      console.error('Error saving default settings:', error);
      App.showError('Failed to save default settings');
    }
  },
  
  // Save notification settings
  async saveNotificationSettings(event) {
    event.preventDefault();
    
    try {
      const emailRecipient = document.getElementById('email-recipient').value;
      const enableAlerts = document.getElementById('enable-alerts').checked;
      
      // Validate email
      if (emailRecipient && !this.validateEmail(emailRecipient)) {
        App.showError('Please enter a valid email address');
        return;
      }
      
      // Save to localStorage for demo
      localStorage.setItem('email-recipient', emailRecipient);
      localStorage.setItem('enable-alerts', enableAlerts);
      
      // Show success message
      App.showSuccess('Notification settings saved successfully');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      App.showError('Failed to save notification settings');
    }
  },
  
  // Validate email format
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Default settings form
    const defaultSettingsForm = document.getElementById('default-settings-form');
    if (defaultSettingsForm) {
      defaultSettingsForm.addEventListener('submit', (e) => this.saveDefaultSettings(e));
    }
    
    // Notification settings form
    const notificationSettingsForm = document.getElementById('notification-settings-form');
    if (notificationSettingsForm) {
      notificationSettingsForm.addEventListener('submit', (e) => this.saveNotificationSettings(e));
    }
  }
};

// Load settings when navigating to the settings page
function loadSettings() {
  Settings.init();
}

// Add a success message method to App if it doesn't exist
if (typeof App !== 'undefined' && typeof App.showSuccess !== 'function') {
  App.showSuccess = function(message, duration = 3000) {
    // Create success toast if it doesn't exist
    let successToast = document.getElementById('success-toast');
    
    if (!successToast) {
      successToast = document.createElement('div');
      successToast.id = 'success-toast';
      successToast.className = 'toast position-fixed top-0 end-0 m-3';
      successToast.setAttribute('role', 'alert');
      successToast.setAttribute('aria-live', 'assertive');
      successToast.setAttribute('aria-atomic', 'true');
      
      successToast.innerHTML = `
        <div class="toast-header bg-success text-white">
          <i class="bi bi-check-circle-fill me-2"></i>
          <strong class="me-auto">Success</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body"></div>
      `;
      
      document.body.appendChild(successToast);
    }
    
    // Set the success message
    successToast.querySelector('.toast-body').textContent = message;
    
    // Show the toast
    const bsToast = new bootstrap.Toast(successToast, {
      autohide: true,
      delay: duration
    });
    
    bsToast.show();
  };
} 