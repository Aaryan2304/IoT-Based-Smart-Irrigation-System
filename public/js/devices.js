/**
 * Devices Management Module
 * Handles displaying, adding, and configuring irrigation devices
 */

const Devices = {
  devicesList: [],
  selectedDevice: null,
  
  // Initialize devices page
  async init() {
    console.log('Initializing Devices page');
    
    // First create a basic structure with the add button
    const container = document.getElementById('devices-container');
    container.innerHTML = `
      <div class="col-12 mb-4">
        <div class="d-flex justify-content-between align-items-center">
          <h2><i class="bi bi-hdd-rack me-2"></i>Irrigation Devices</h2>
          <button id="add-device-btn" class="btn btn-primary add-device-btn">
            <i class="bi bi-plus-circle me-1"></i> Add Device
          </button>
        </div>
      </div>
      <div id="devices-list" class="row">
        <div class="col-12">
          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            Loading devices...
          </div>
        </div>
      </div>
    `;
    
    // Set up event listeners before loading data
    this.setupEventListeners();
    
    // Then load devices and render them
    await this.loadDevices();
    this.renderDevicesList();
  },
  
  // Load devices from API
  async loadDevices() {
    try {
      const response = await fetch('/api/devices', {
        headers: {
          ...Auth.getAuthHeader()
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }
      
      this.devicesList = await response.json();
      console.log('Devices loaded:', this.devicesList.length);
    } catch (error) {
      console.error('Error loading devices:', error);
      App.showError('Failed to load devices. ' + error.message);
      this.devicesList = [];
    }
  },
  
  // Render the devices list
  renderDevicesList() {
    const container = document.getElementById('devices-container');
    
    // Clear existing content
    container.innerHTML = `
      <div class="col-12 mb-4">
        <div class="d-flex justify-content-between align-items-center">
          <h2><i class="bi bi-hdd-rack me-2"></i>Irrigation Devices</h2>
          <button id="add-device-btn" class="btn btn-primary">
            <i class="bi bi-plus-circle me-1"></i> Add Device
          </button>
        </div>
      </div>
    `;
    
    // If no devices, show a message
    if (this.devicesList.length === 0) {
      container.innerHTML += `
        <div class="col-12">
          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            No devices found. Click "Add Device" to set up your first device.
          </div>
        </div>
      `;
      return;
    }
    
    // Create devices grid
    const devicesGrid = document.createElement('div');
    devicesGrid.className = 'row';
    
    // Add each device card
    this.devicesList.forEach(device => {
      const lastSeen = device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never';
      
      // Create device card
      const deviceCard = document.createElement('div');
      deviceCard.className = 'col-md-6 col-lg-4 mb-4';
      deviceCard.innerHTML = `
        <div class="card device-card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="m-0">${device.name}</h5>
            <span class="badge ${device.isOnline ? 'bg-success' : 'bg-danger'}">
              ${device.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div class="card-body">
            <p><strong>ID:</strong> ${device.deviceId}</p>
            <p><strong>Location:</strong> ${device.location || 'Not specified'}</p>
            <p><strong>Last Seen:</strong> ${lastSeen}</p>
            <p><strong>Mode:</strong> ${device.autoMode ? 'Automatic' : 'Manual'}</p>
            <p><strong>Thresholds:</strong> ${device.settings.moistureThresholdLow}% - ${device.settings.moistureThresholdHigh}%</p>
          </div>
          <div class="card-footer">
            <div class="d-flex justify-content-between">
              <button class="btn btn-sm btn-primary edit-device-btn" data-device-id="${device.deviceId}">
                <i class="bi bi-pencil me-1"></i> Edit
              </button>
              <button class="btn btn-sm btn-danger delete-device-btn" data-device-id="${device.deviceId}">
                <i class="bi bi-trash me-1"></i> Delete
              </button>
            </div>
          </div>
        </div>
      `;
      
      devicesGrid.appendChild(deviceCard);
    });
    
    container.appendChild(devicesGrid);
    
    // Add event listeners for the buttons
    this.setupDeviceCardListeners();
  },
  
  // Set up device card button listeners
  setupDeviceCardListeners() {
    // Edit device buttons
    document.querySelectorAll('.edit-device-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const deviceId = e.target.closest('.edit-device-btn').dataset.deviceId;
        const device = this.devicesList.find(d => d.deviceId === deviceId);
        if (device) {
          this.showEditDeviceModal(device);
        }
      });
    });
    
    // Delete device buttons
    document.querySelectorAll('.delete-device-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const deviceId = e.target.closest('.delete-device-btn').dataset.deviceId;
        const device = this.devicesList.find(d => d.deviceId === deviceId);
        if (device) {
          this.showDeleteDeviceConfirmation(device);
        }
      });
    });
  },
  
  // Show edit device modal
  showEditDeviceModal(device) {
    this.selectedDevice = device;
    
    // Create modal HTML
    const modalHTML = `
      <div class="modal fade" id="editDeviceModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">Edit Device</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="edit-device-form">
                <div class="mb-3">
                  <label for="device-name" class="form-label">Device Name</label>
                  <input type="text" class="form-control" id="device-name" value="${device.name}" required>
                </div>
                <div class="mb-3">
                  <label for="device-location" class="form-label">Location</label>
                  <input type="text" class="form-control" id="device-location" value="${device.location || ''}">
                </div>
                <div class="mb-3">
                  <label for="threshold-low" class="form-label">Low Moisture Threshold (%)</label>
                  <input type="number" class="form-control" id="threshold-low" min="0" max="100" value="${device.settings.moistureThresholdLow}" required>
                  <div class="form-text">Pump turns ON when moisture falls below this value</div>
                </div>
                <div class="mb-3">
                  <label for="threshold-high" class="form-label">High Moisture Threshold (%)</label>
                  <input type="number" class="form-control" id="threshold-high" min="0" max="100" value="${device.settings.moistureThresholdHigh}" required>
                  <div class="form-text">Pump turns OFF when moisture rises above this value</div>
                </div>
                <div class="form-check mb-3">
                  <input class="form-check-input" type="checkbox" id="notifications-enabled" ${device.settings.notificationsEnabled ? 'checked' : ''}>
                  <label class="form-check-label" for="notifications-enabled">
                    Enable notifications for this device
                  </label>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="save-device-btn">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Create modal instance and show it
    const modal = new bootstrap.Modal(document.getElementById('editDeviceModal'));
    modal.show();
    
    // Set up save button
    document.getElementById('save-device-btn').addEventListener('click', async () => {
      await this.saveDeviceChanges();
      modal.hide();
      
      // Remove modal after hiding
      document.getElementById('editDeviceModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
      });
    });
  },
  
  // Save changes to device
  async saveDeviceChanges() {
    try {
      const deviceId = this.selectedDevice.deviceId;
      const deviceMongoId = this.selectedDevice._id;
      
      // Get form values
      const name = document.getElementById('device-name').value;
      const location = document.getElementById('device-location').value;
      const moistureThresholdLow = parseInt(document.getElementById('threshold-low').value);
      const moistureThresholdHigh = parseInt(document.getElementById('threshold-high').value);
      const notificationsEnabled = document.getElementById('notifications-enabled').checked;
      
      console.log('Updating device:', {
        id: deviceMongoId,
        deviceId,
        name,
        location,
        thresholds: { moistureThresholdLow, moistureThresholdHigh },
        notificationsEnabled
      });
      
      // Validate thresholds
      if (moistureThresholdLow >= moistureThresholdHigh) {
        App.showError('Low threshold must be less than high threshold');
        return;
      }
      
      // Prepare device data for thresholds update
      const thresholdData = {
        moistureThresholdLow,
        moistureThresholdHigh
      };
      
      // Send update request for thresholds
      const response = await fetch(`/api/devices/${deviceMongoId}/thresholds`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...Auth.getAuthHeader()
        },
        body: JSON.stringify(thresholdData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update device thresholds');
      }
      
      // Prepare device data for basic info
      const basicInfoData = {
        name,
        location
      };
      
      // Send update request for basic info
      const basicResponse = await fetch(`/api/devices/${deviceMongoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...Auth.getAuthHeader()
        },
        body: JSON.stringify(basicInfoData)
      });
      
      if (!basicResponse.ok) {
        throw new Error('Failed to update device information');
      }
      
      // Reload devices
      await this.loadDevices();
      this.renderDevicesList();
      
      // Update global thresholds if needed
      await this.updateGlobalThresholds();
      
      App.showSuccess('Device updated successfully');
    } catch (error) {
      console.error('Error updating device:', error);
      App.showError('Error updating device: ' + error.message);
    }
  },
  
  // Show delete device confirmation
  showDeleteDeviceConfirmation(device) {
    this.selectedDevice = device;
    
    if (confirm(`Are you sure you want to delete the device "${device.name}"? This cannot be undone.`)) {
      this.deleteDevice();
    }
  },
  
  // Delete a device
  async deleteDevice() {
    try {
      // Use MongoDB _id instead of deviceId
      const deviceMongoId = this.selectedDevice._id;
      
      console.log(`Attempting to delete device: ${this.selectedDevice.name} (ID: ${deviceMongoId})`);
      
      const response = await fetch(`/api/devices/${deviceMongoId}`, {
        method: 'DELETE',
        headers: {
          ...Auth.getAuthHeader()
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete device');
      }
      
      // Reload devices
      await this.loadDevices();
      this.renderDevicesList();
      
      App.showSuccess('Device deleted successfully');
    } catch (error) {
      console.error('Error deleting device:', error);
      App.showError('Failed to delete device. ' + error.message);
    }
  },
  
  // Show add device modal
  showAddDeviceModal() {
    // Create modal HTML
    const modalHTML = `
      <div class="modal fade" id="addDeviceModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">Add New Device</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="add-device-form">
                <div class="mb-3">
                  <label for="new-device-id" class="form-label">Device ID</label>
                  <input type="text" class="form-control" id="new-device-id" required>
                  <div class="form-text">Unique identifier from your NodeMCU device</div>
                </div>
                <div class="mb-3">
                  <label for="new-device-name" class="form-label">Device Name</label>
                  <input type="text" class="form-control" id="new-device-name" required>
                </div>
                <div class="mb-3">
                  <label for="new-device-location" class="form-label">Location</label>
                  <input type="text" class="form-control" id="new-device-location">
                </div>
                <div class="mb-3">
                  <label for="new-threshold-low" class="form-label">Low Moisture Threshold (%)</label>
                  <input type="number" class="form-control" id="new-threshold-low" min="0" max="100" value="30" required>
                  <div class="form-text">Pump turns ON when moisture falls below this value</div>
                </div>
                <div class="mb-3">
                  <label for="new-threshold-high" class="form-label">High Moisture Threshold (%)</label>
                  <input type="number" class="form-control" id="new-threshold-high" min="0" max="100" value="55" required>
                  <div class="form-text">Pump turns OFF when moisture rises above this value</div>
                </div>
                <div class="form-check mb-3">
                  <input class="form-check-input" type="checkbox" id="new-notifications-enabled" checked>
                  <label class="form-check-label" for="new-notifications-enabled">
                    Enable notifications for this device
                  </label>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="create-device-btn">Add Device</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Create modal instance and show it
    const modal = new bootstrap.Modal(document.getElementById('addDeviceModal'));
    modal.show();
    
    // Set up create button
    document.getElementById('create-device-btn').addEventListener('click', async () => {
      await this.createNewDevice();
      modal.hide();
      
      // Ensure modal and backdrop are fully removed
      document.getElementById('addDeviceModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
        // Remove any lingering backdrop
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
      });
    });
    
    // Also handle Cancel button and close icon click
    document.querySelector('#addDeviceModal .btn-secondary').addEventListener('click', () => {
      setTimeout(() => {
        // Remove any lingering backdrop
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
      }, 300);
    });
    
    document.querySelector('#addDeviceModal .btn-close').addEventListener('click', () => {
      setTimeout(() => {
        // Remove any lingering backdrop
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
      }, 300);
    });
  },
  
  // Create a new device
  async createNewDevice() {
    try {
      // Get form values
      const deviceId = document.getElementById('new-device-id').value;
      const name = document.getElementById('new-device-name').value;
      const location = document.getElementById('new-device-location').value;
      const moistureThresholdLow = parseInt(document.getElementById('new-threshold-low').value);
      const moistureThresholdHigh = parseInt(document.getElementById('new-threshold-high').value);
      const notificationsEnabled = document.getElementById('new-notifications-enabled').checked;
      
      console.log('Creating device with settings:', {
        deviceId, name, location, 
        thresholds: { moistureThresholdLow, moistureThresholdHigh },
        notificationsEnabled
      });
      
      // Validate inputs
      if (!deviceId || !name) {
        App.showError('Device ID and Name are required');
        return;
      }
      
      // Validate thresholds
      if (isNaN(moistureThresholdLow) || isNaN(moistureThresholdHigh)) {
        App.showError('Threshold values must be numbers');
        return;
      }
      
      if (moistureThresholdLow >= moistureThresholdHigh) {
        App.showError('Low threshold must be less than high threshold');
        return;
      }
      
      // Prepare device data
      const deviceData = {
        deviceId,
        name,
        location,
        settings: {
          moistureThresholdLow,
          moistureThresholdHigh,
          notificationsEnabled
        }
      };
      
      // Send create request
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Auth.getAuthHeader()
        },
        body: JSON.stringify(deviceData)
      });
      
      // Parse response
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create device');
      }
      
      console.log('Device created successfully:', responseData);
      
      // Reload devices
      await this.loadDevices();
      this.renderDevicesList();
      
      // Update system default thresholds if needed
      await this.updateGlobalThresholds();
      
      App.showSuccess('Device created successfully');
    } catch (error) {
      console.error('Error creating device:', error);
      App.showError('Failed to create device. ' + error.message);
    }
  },
  
  // Update global threshold settings from the system
  async updateGlobalThresholds() {
    try {
      // Only fetch system settings if Dashboard is available
      if (typeof Dashboard !== 'undefined' && Dashboard.currentDevice) {
        // Refresh the current device data
        const refreshedDevice = this.devicesList.find(
          d => d.deviceId === Dashboard.currentDevice.deviceId
        );
        
        if (refreshedDevice) {
          // Update the Dashboard's current device with fresh data
          Dashboard.currentDevice = refreshedDevice;
          
          // Update the UI with new thresholds
          const thresholdsDisplay = document.getElementById('thresholds-display');
          if (thresholdsDisplay) {
            const lowThreshold = refreshedDevice.settings.moistureThresholdLow;
            const highThreshold = refreshedDevice.settings.moistureThresholdHigh;
            thresholdsDisplay.innerHTML = `Thresholds: Dry < ${lowThreshold}% | ${lowThreshold}-${highThreshold}% Optimal | > ${highThreshold}% Wet`;
          }
        }
      }
    } catch (error) {
      console.error('Error updating global thresholds:', error);
    }
  },
  
  // Set up event listeners
  setupEventListeners() {
    console.log('Setting up device event listeners');
    
    // Ensure we attach the event listener after the button is rendered
    setTimeout(() => {
      const addBtn = document.getElementById('add-device-btn');
      if (addBtn) {
        console.log('Found add device button, attaching listener');
        addBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Add device button clicked');
          this.showAddDeviceModal();
        });
      } else {
        console.error('Add device button not found in the DOM');
      }
    }, 500);
  }
};

// Load devices when navigating to the devices page
function loadDevices() {
  console.log('Loading devices page');
  Devices.init();
} 