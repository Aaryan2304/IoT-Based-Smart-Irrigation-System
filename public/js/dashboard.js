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
  
  // Initialize dashboard
  async init() {
    try {
      // Connect to Socket.io
      this.connectSocket();
      
      // Initialize gauge
      this.initMoistureGauge();
      
      // Get devices
      const devices = await this.fetchDevices();
      if (devices.length > 0) {
        // Select first device by default
        this.selectDevice(devices[0]);
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      return true;
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      return false;
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
      
      // Update color based on moisture level
      if (value < 30) {
        // Dry - red
        this.charts.moistureGauge.data.datasets[0].backgroundColor[0] = 'rgba(220, 53, 69, 0.8)';
      } else if (value > 55) {
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
    
    // Update device info in UI
    document.getElementById('device-name').textContent = device.name;
    document.getElementById('device-id').textContent = device.deviceId;
    document.getElementById('device-location').textContent = device.location || 'Not specified';
    document.getElementById('moisture-thresholds').textContent = 
      `${device.settings.moistureThresholdLow}% - ${device.settings.moistureThresholdHigh}%`;
    
    // Update device status
    this.updateDeviceStatus(device.isOnline);
    
    // Update auto mode
    this.updateAutoMode(device.autoMode);
    
    // Get latest data
    try {
      const response = await fetch(`/api/sensor-data/device/${device.deviceId}?limit=1`, {
        headers: {
          ...Auth.getAuthHeader()
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          // Update sensor display with latest data
          this.updateSensorDisplay(data[0]);
          
          // Store device data
          this.deviceData[device.deviceId] = data[0];
        }
      }
    } catch (error) {
      console.error('Error fetching latest data:', error);
    }
    
    // Initialize history chart if not already
    if (!this.charts.historyChart) {
      this.initHistoryChart();
    }
    
    // Load historical data
    this.loadHistoricalData();
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
    
    // Update moisture status
    const moistureStatus = document.getElementById('moisture-status');
    if (data.soilMoisture < 30) {
      moistureStatus.textContent = 'Dry';
      moistureStatus.className = 'badge rounded-pill status-dry';
    } else if (data.soilMoisture > 55) {
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
    document.getElementById('manual-controls').style.display = 
      isAuto ? 'none' : 'block';
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
    fetch(`/api/devices/${this.currentDevice.deviceId}/mode`, {
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
  
  // Setup event listeners
  setupEventListeners() {
    // Auto mode switch
    document.getElementById('auto-mode-switch').addEventListener('change', (e) => {
      this.toggleAutoMode(e.target.checked);
    });
    
    // Manual pump controls
    document.getElementById('pump-on-btn').addEventListener('click', () => {
      this.sendPumpControl(true);
    });
    
    document.getElementById('pump-off-btn').addEventListener('click', () => {
      this.sendPumpControl(false);
    });
    
    // Time period buttons
    document.querySelectorAll('.btn-group .btn[data-period]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Update active button
        document.querySelectorAll('.btn-group .btn').forEach(b => 
          b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Update selected period and reload data
        this.selectedPeriod = e.target.dataset.period;
        this.loadHistoricalData();
      });
    });
  }
};

// Initialize dashboard when auth state changes
window.addEventListener('authStateChanged', async (e) => {
  if (e.detail.isLoggedIn) {
    await Dashboard.init();
  }
}); 