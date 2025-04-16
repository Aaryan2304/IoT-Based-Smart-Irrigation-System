/**
 * Dashboard Module
 * Handles real-time data display, gauges, charts and device control
 */

// Dashboard state
const Dashboard = {
  socket: null,
  charts: {},
  currentDevice: null,
  selectedPeriod: '24h',
  deviceData: {},
  isAutoMode: true,
  systemDefaults: {
    lowThreshold: 30,
    highThreshold: 55
  },
  
  // Initialize dashboard
  async init() {
    try {
      // Load system defaults first
      await this.loadSystemDefaults();
      
      // Connect to Socket.io
      this.connectSocket();
      
      // Initialize gauge
      this.initMoistureGauge();
      
      // Get devices
      const devices = await this.fetchDevices();
      if (devices.length > 0) {
        // Select first device by default
        this.selectDevice(devices[0]);
      } else {
        // If no devices, still update the thresholds display with system defaults
        this.updateThresholdDisplayWithDefaults();
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      return true;
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      return false;
    }
  },
  
  // Load system default thresholds from server
  async loadSystemDefaults() {
    try {
      const response = await fetch('/api/settings', {
        headers: Auth.getAuthHeader()
      });
      
      if (response.ok) {
        const { settings } = await response.json();
        this.systemDefaults = {
          lowThreshold: settings.defaultThresholdLow || 30,
          highThreshold: settings.defaultThresholdHigh || 55
        };
        console.log('Loaded system defaults:', this.systemDefaults);
      }
    } catch (error) {
      console.error('Error loading system defaults:', error);
      // Keep default values if fetch fails
    }
  },
  
  // Update threshold display with system defaults when no device is selected
  updateThresholdDisplayWithDefaults() {
    const thresholdsDisplay = document.getElementById('thresholds-display');
    if (thresholdsDisplay) {
      const { lowThreshold, highThreshold } = this.systemDefaults;
      thresholdsDisplay.innerHTML = `Thresholds: <span class="text-danger">Dry &lt; ${lowThreshold}%</span> | <span class="text-success">${lowThreshold}-${highThreshold}% Optimal</span> | <span class="text-primary">&gt; ${highThreshold}% Wet</span>`;
    }
  },
  
  // Connect to Socket.io for real-time updates
  connectSocket() {
    this.socket = io();
    
    // Listen for sensor data updates
    this.socket.on('sensorData', (data) => {
      // If this is our selected device, update the UI
      if (this.currentDevice && data.deviceId === this.currentDevice.deviceId) {
        this.updateSensorDisplay(data);
        this.deviceData[data.deviceId] = data;
      }
    });
    
    // Listen for device status updates
    this.socket.on('deviceStatus', (data) => {
      // If this is our selected device, update the status
      if (this.currentDevice && data.deviceId === this.currentDevice.deviceId) {
        this.updateDeviceStatus(data.isOnline);
      }
    });
    
    // Listen for pump status updates
    this.socket.on('pumpStatus', (data) => {
      // If this is our selected device, update the pump status
      if (this.currentDevice && data.deviceId === this.currentDevice.deviceId) {
        this.updatePumpStatus(data.pumpStatus);
        this.updateAutoMode(data.autoMode);
      }
    });
    
    // Handle connection errors
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  },
  
  // Initialize moisture gauge
  initMoistureGauge() {
    const ctx = document.getElementById('moisture-gauge-chart').getContext('2d');
    
    this.charts.moistureGauge = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [0, 100],
          backgroundColor: [
            'rgba(40, 167, 69, 0.8)',
            'rgba(240, 240, 240, 0.5)'
          ],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '75%',
        circumference: 180,
        rotation: 270,
        maintainAspectRatio: true,
        plugins: {
          tooltip: {
            enabled: false
          },
          legend: {
            display: false
          }
        }
      }
    });
  },
  
  // Update moisture gauge
  updateMoistureGauge(value) {
    if (this.charts.moistureGauge) {
      this.charts.moistureGauge.data.datasets[0].data = [value, 100 - value];
      
      // Get thresholds - either from device or system defaults
      let lowThreshold, highThreshold;
      
      if (this.currentDevice && this.currentDevice.settings) {
        // Use device specific thresholds
        lowThreshold = this.currentDevice.settings.moistureThresholdLow;
        highThreshold = this.currentDevice.settings.moistureThresholdHigh;
      } else {
        // Fall back to system defaults
        lowThreshold = this.systemDefaults.lowThreshold;
        highThreshold = this.systemDefaults.highThreshold;
      }
      
      // Update color based on moisture level
      if (value < lowThreshold) {
        // Dry - red
        this.charts.moistureGauge.data.datasets[0].backgroundColor[0] = 'rgba(220, 53, 69, 0.8)';
      } else if (value > highThreshold) {
        // Wet - blue
        this.charts.moistureGauge.data.datasets[0].backgroundColor[0] = 'rgba(13, 110, 253, 0.8)';
      } else {
        // Optimal - green
        this.charts.moistureGauge.data.datasets[0].backgroundColor[0] = 'rgba(40, 167, 69, 0.8)';
      }
      
      this.charts.moistureGauge.update();
    }
  },
  
  // Initialize history chart
  initHistoryChart() {
    const ctx = document.getElementById('history-chart').getContext('2d');
    
    this.charts.historyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Soil Moisture (%)',
            data: [],
            borderColor: 'rgba(40, 167, 69, 1)',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Temperature (°C)',
            data: [],
            borderColor: 'rgba(220, 53, 69, 1)',
            backgroundColor: 'transparent',
            tension: 0.4,
            yAxisID: 'y1'
          },
          {
            label: 'Humidity (%)',
            data: [],
            borderColor: 'rgba(13, 110, 253, 1)',
            backgroundColor: 'transparent',
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Soil Moisture (%)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false
            },
            title: {
              display: true,
              text: 'Temp & Humidity'
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  },
  
  // Fetch devices from API
  async fetchDevices() {
    try {
      const response = await fetch('/api/devices', {
        headers: {
          ...Auth.getAuthHeader()
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }
      
      const devices = await response.json();
      return devices;
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  },
  
  // Fetch historical data for a device
  async fetchHistoricalData(deviceId, period) {
    try {
      // Calculate days based on selected period
      let days = 1;
      if (period === '7d') days = 7;
      if (period === '30d') days = 30;
      
      const response = await fetch(`/api/sensor-data/aggregated/${deviceId}?days=${days}`, {
        headers: {
          ...Auth.getAuthHeader()
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  },
  
  // Select a device and load its data
  async selectDevice(device) {
    this.currentDevice = device;
    
    console.log('Selected device:', device);
    
    // Update selected device in UI
    this.updateDeviceUI();
    
    // Update thresholds display
    this.updateThresholdDisplay();
    
    // Load historical data
    await this.loadHistoricalData();
  },
  
  // Update device UI with selected device
  updateDeviceUI() {
    if (!this.currentDevice) return;
    
    // Update system info panel
    document.getElementById('device-name').textContent = this.currentDevice.name || '--';
    document.getElementById('device-id').textContent = this.currentDevice.deviceId || '--';
    document.getElementById('device-location').textContent = this.currentDevice.location || '--';
    
    // Update thresholds
    const thresholdText = `${this.currentDevice.settings.moistureThresholdLow}% - ${this.currentDevice.settings.moistureThresholdHigh}%`;
    document.getElementById('moisture-thresholds').textContent = thresholdText;
    
    // Add edit button next to thresholds
    const thresholdsElement = document.getElementById('moisture-thresholds');
    
    // Remove existing edit button if present
    const existingEditBtn = document.querySelector('.edit-thresholds-btn');
    if (existingEditBtn) {
      existingEditBtn.remove();
    }
    
    // Add new edit button
    const editButton = document.createElement('button');
    editButton.className = 'btn btn-sm btn-outline-primary ms-2 edit-thresholds-btn';
    editButton.innerHTML = '<i class="bi bi-pencil-square"></i>';
    editButton.setAttribute('title', 'Edit moisture thresholds');
    editButton.onclick = () => this.showEditThresholdsModal();
    
    thresholdsElement.parentNode.appendChild(editButton);
    
    // Update last update timestamp
    const lastUpdateDate = this.currentDevice.lastSeen 
      ? new Date(this.currentDevice.lastSeen).toLocaleString() 
      : '--';
    document.getElementById('last-update').textContent = lastUpdateDate;
    
    // Update status indicators
    this.updateDeviceStatus(this.currentDevice.isOnline);
    
    // Update auto mode toggle
    const autoModeToggle = document.getElementById('auto-mode-toggle');
    if (autoModeToggle) {
      autoModeToggle.checked = this.currentDevice.autoMode;
    }
  },
  
  // Show modal to edit moisture thresholds
  showEditThresholdsModal() {
    if (!this.currentDevice) return;
    
    // Create modal HTML
    const modalHTML = `
      <div class="modal fade" id="editThresholdsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">Edit Moisture Thresholds</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="edit-thresholds-form">
                <div class="mb-3">
                  <label for="threshold-low" class="form-label">Low Moisture Threshold (%)</label>
                  <input type="number" class="form-control" id="threshold-low" min="0" max="100" value="${this.currentDevice.settings.moistureThresholdLow}" required>
                  <div class="form-text">Pump turns ON when moisture falls below this value</div>
                </div>
                <div class="mb-3">
                  <label for="threshold-high" class="form-label">High Moisture Threshold (%)</label>
                  <input type="number" class="form-control" id="threshold-high" min="0" max="100" value="${this.currentDevice.settings.moistureThresholdHigh}" required>
                  <div class="form-text">Pump turns OFF when moisture rises above this value</div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="save-thresholds-btn">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Create modal instance and show it
    const modal = new bootstrap.Modal(document.getElementById('editThresholdsModal'));
    modal.show();
    
    // Set up save button
    document.getElementById('save-thresholds-btn').addEventListener('click', async () => {
      await this.saveThresholds();
      modal.hide();
      
      // Remove modal after hiding
      document.getElementById('editThresholdsModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
        // Remove any lingering backdrop
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
      });
    });
  },
  
  // Save thresholds to server
  async saveThresholds() {
    try {
      const thresholdLow = parseInt(document.getElementById('threshold-low').value);
      const thresholdHigh = parseInt(document.getElementById('threshold-high').value);
      
      // Basic validation
      if (thresholdLow >= thresholdHigh) {
        App.showError('Low threshold must be less than high threshold');
        return;
      }
      
      // Send to API
      const response = await fetch(`/api/devices/${this.currentDevice._id}/thresholds`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...Auth.getAuthHeader()
        },
        body: JSON.stringify({
          moistureThresholdLow: thresholdLow,
          moistureThresholdHigh: thresholdHigh
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update thresholds');
      }
      
      const result = await response.json();
      
      // Update device in memory
      this.currentDevice.settings.moistureThresholdLow = thresholdLow;
      this.currentDevice.settings.moistureThresholdHigh = thresholdHigh;
      
      // Update UI
      this.updateDeviceUI();
      
      // Show success message
      App.showSuccess('Moisture thresholds updated successfully');
    } catch (error) {
      console.error('Error saving thresholds:', error);
      App.showError('Failed to update thresholds');
    }
  },
  
  // Load historical data for selected device and period
  async loadHistoricalData() {
    if (!this.currentDevice) return;
    
    // Show loading
    document.getElementById('loading-overlay').style.display = 'flex';
    
    const historicalData = await this.fetchHistoricalData(
      this.currentDevice.deviceId, 
      this.selectedPeriod
    );
    
    // Hide loading
    document.getElementById('loading-overlay').style.display = 'none';
    
    // Update chart with data
    if (historicalData.length > 0) {
      const labels = historicalData.map(item => {
        return moment(item.timestamp).format(
          this.selectedPeriod === '24h' ? 'HH:mm' : 'MM/DD HH:mm'
        );
      });
      
      const moistureData = historicalData.map(item => item.avgSoilMoisture);
      const temperatureData = historicalData.map(item => item.avgTemperature);
      const humidityData = historicalData.map(item => item.avgHumidity);
      
      this.charts.historyChart.data.labels = labels;
      this.charts.historyChart.data.datasets[0].data = moistureData;
      this.charts.historyChart.data.datasets[1].data = temperatureData;
      this.charts.historyChart.data.datasets[2].data = humidityData;
      this.charts.historyChart.update();
    }
  },
  
  // Update sensor display with new data
  updateSensorDisplay(data) {
    // Update moisture
    document.getElementById('current-moisture').textContent = data.soilMoisture;
    this.updateMoistureGauge(data.soilMoisture);
    
    // Update moisture status based on current device's thresholds
    const moistureStatus = document.getElementById('moisture-status');
    
    // Get thresholds - either from device or system defaults
    let lowThreshold, highThreshold;
    
    if (this.currentDevice && this.currentDevice.settings) {
      // Use device specific thresholds
      lowThreshold = this.currentDevice.settings.moistureThresholdLow;
      highThreshold = this.currentDevice.settings.moistureThresholdHigh;
    } else {
      // Fall back to system defaults
      lowThreshold = this.systemDefaults.lowThreshold;
      highThreshold = this.systemDefaults.highThreshold;
    }
    
    // Update threshold display
    const thresholdsDisplay = document.getElementById('thresholds-display');
    if (thresholdsDisplay) {
      thresholdsDisplay.innerHTML = `Thresholds: <span class="text-danger">Dry &lt; ${lowThreshold}%</span> | <span class="text-success">${lowThreshold}-${highThreshold}% Optimal</span> | <span class="text-primary">&gt; ${highThreshold}% Wet</span>`;
    }
    
    if (data.soilMoisture < lowThreshold) {
      moistureStatus.textContent = 'Dry';
      moistureStatus.className = 'badge rounded-pill status-dry';
    } else if (data.soilMoisture > highThreshold) {
      moistureStatus.textContent = 'Wet';
      moistureStatus.className = 'badge rounded-pill status-wet';
    } else {
      moistureStatus.textContent = 'Optimal';
      moistureStatus.className = 'badge rounded-pill status-optimal';
    }
    
    // Update temperature and humidity
    document.getElementById('current-temperature').textContent = data.temperature;
    document.getElementById('current-humidity').textContent = data.humidity;
    
    // Update pump status
    this.updatePumpStatus(data.pumpStatus);
    
    // Update last update time
    document.getElementById('last-update').textContent = 
      new Date(data.timestamp).toLocaleString();
  },
  
  // Update device status display
  updateDeviceStatus(isOnline) {
    const deviceStatus = document.getElementById('device-status');
    if (isOnline) {
      deviceStatus.textContent = 'Online';
      deviceStatus.className = 'badge rounded-pill status-online';
    } else {
      deviceStatus.textContent = 'Offline';
      deviceStatus.className = 'badge rounded-pill status-offline';
    }
  },
  
  // Update pump status display
  updatePumpStatus(isOn) {
    const pumpStatus = document.getElementById('pump-status');
    if (isOn) {
      pumpStatus.textContent = 'ON';
      pumpStatus.className = 'badge status-on';
    } else {
      pumpStatus.textContent = 'OFF';
      pumpStatus.className = 'badge status-off';
    }
  },
  
  // Update auto mode display and controls
  updateAutoMode(isAuto) {
    this.isAutoMode = isAuto;
    
    // Update switch
    document.getElementById('auto-mode-switch').checked = isAuto;
    
    // Show/hide manual controls
    const manualControls = document.getElementById('manual-controls');
    if (manualControls) {
      if (isAuto) {
        manualControls.style.display = 'none';
      } else {
        manualControls.style.display = 'block';
      }
      console.log('Manual controls visibility updated to: ' + (isAuto ? 'none' : 'block'));
    } else {
      console.error('Could not find manual controls element');
    }
  },
  
  // Send pump control command
  sendPumpControl(turnOn) {
    if (!this.currentDevice) return;
    
    // Show loading
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Use the REST API endpoint first (more reliable)
    fetch(`/api/devices/${this.currentDevice.deviceId}/pump`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Auth.getAuthHeader()
      },
      body: JSON.stringify({
        status: turnOn,
        autoMode: false
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to control pump');
      }
      return response.json();
    })
    .then(data => {
      console.log('Pump control success:', data);
      // Hide loading
      document.getElementById('loading-overlay').style.display = 'none';
    })
    .catch(error => {
      console.error('Error controlling pump:', error);
      // Hide loading
      document.getElementById('loading-overlay').style.display = 'none';
      
      // Fall back to socket if the REST API fails
      this.socket.emit('controlPump', {
        deviceId: this.currentDevice.deviceId,
        pumpStatus: turnOn,
        autoMode: false
      });
    });
  },
  
  // Toggle auto mode
  toggleAutoMode(isAuto) {
    if (!this.currentDevice) return;
    
    // Show loading
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Use the REST API endpoint first
    fetch(`/api/devices/device/${this.currentDevice.deviceId}/mode`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...Auth.getAuthHeader()
      },
      body: JSON.stringify({
        autoMode: isAuto
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to toggle auto mode');
      }
      return response.json();
    })
    .then(data => {
      console.log('Auto mode toggle success:', data);
      // Hide loading
      document.getElementById('loading-overlay').style.display = 'none';
    })
    .catch(error => {
      console.error('Error toggling auto mode:', error);
      // Hide loading
      document.getElementById('loading-overlay').style.display = 'none';
      
      // Fall back to socket if the REST API fails
      this.socket.emit('controlPump', {
        deviceId: this.currentDevice.deviceId,
        pumpStatus: false, // Default to off when toggling auto mode
        autoMode: isAuto
      });
    });
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Auto mode switch
    const autoModeSwitch = document.getElementById('auto-mode-switch');
    if (autoModeSwitch) {
      autoModeSwitch.addEventListener('change', (e) => {
        console.log('Auto mode changed:', e.target.checked);
        this.toggleAutoMode(e.target.checked);
        
        // Directly update UI to ensure it changes immediately
        this.updateAutoMode(e.target.checked);
      });
    } else {
      console.error('Auto mode switch element not found');
    }
    
    // Manual pump controls - make sure they exist and get events attached
    const pumpOnBtn = document.getElementById('pump-on-btn');
    const pumpOffBtn = document.getElementById('pump-off-btn');
    
    if (pumpOnBtn) {
      pumpOnBtn.addEventListener('click', () => {
        console.log('Pump ON button clicked');
        this.sendPumpControl(true);
      });
    } else {
      console.error('Pump ON button not found');
    }
    
    if (pumpOffBtn) {
      pumpOffBtn.addEventListener('click', () => {
        console.log('Pump OFF button clicked');
        this.sendPumpControl(false);
      });
    } else {
      console.error('Pump OFF button not found');
    }
    
    // Time period buttons
    const periodButtons = document.querySelectorAll('[data-period]');
    console.log('Period buttons found:', periodButtons.length);
    
    periodButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update active button
        const btnGroup = e.target.closest('.btn-group');
        if (btnGroup) {
          btnGroup.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        } else {
          // Fallback to all period buttons
          periodButtons.forEach(b => b.classList.remove('active'));
        }
        
        // Add active class to clicked button
        e.target.classList.add('active');
        
        // Debug to confirm click is working
        console.log('Period changed to:', e.target.dataset.period);
        
        // Update selected period and reload data
        this.selectedPeriod = e.target.dataset.period;
        this.loadHistoricalData();
      });
    });
  },
  
  // Update threshold display with current device's thresholds
  updateThresholdDisplay() {
    // Get thresholds - either from device or system defaults
    let lowThreshold, highThreshold;
    
    if (this.currentDevice && this.currentDevice.settings) {
      // Use device specific thresholds
      lowThreshold = this.currentDevice.settings.moistureThresholdLow;
      highThreshold = this.currentDevice.settings.moistureThresholdHigh;
    } else {
      // Fall back to system defaults
      lowThreshold = this.systemDefaults.lowThreshold;
      highThreshold = this.systemDefaults.highThreshold;
    }
    
    // Update the thresholds display
    const thresholdsDisplay = document.getElementById('thresholds-display');
    if (thresholdsDisplay) {
      thresholdsDisplay.innerHTML = `Thresholds: <span class="text-danger">Dry &lt; ${lowThreshold}%</span> | <span class="text-success">${lowThreshold}-${highThreshold}% Optimal</span> | <span class="text-primary">&gt; ${highThreshold}% Wet</span>`;
    }
  },
  
  // Refresh system defaults and update the display
  async refreshSystemDefaults() {
    await this.loadSystemDefaults();
    
    // If no device is selected, update with system defaults
    if (!this.currentDevice) {
      this.updateThresholdDisplayWithDefaults();
    } else {
      // Otherwise update with current device settings which may use the defaults
      this.updateThresholdDisplay();
    }
  }
};

// Initialize dashboard when auth state changes
window.addEventListener('authStateChanged', async (e) => {
  if (e.detail.isLoggedIn) {
    await Dashboard.init();
  }
}); 