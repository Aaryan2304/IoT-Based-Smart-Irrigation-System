/**
 * Statistics Module
 * Handles displaying analytics and statistics about irrigation devices
 */

const Statistics = {
  devicesList: [],
  selectedDeviceId: null,
  statsData: null,
  aggregatedData: null,
  
  // Initialize statistics page
  async init() {
    console.log('Initializing Statistics page');
    
    // Load devices
    await this.loadDevices();
    
    // Render device selector
    this.renderDeviceSelector();
    
    // Initialize page structure
    this.initializePageStructure();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // If there's at least one device, load its stats
    if (this.devicesList.length > 0) {
      this.selectedDeviceId = this.devicesList[0].deviceId;
      await this.loadStatistics();
      this.updateDeviceSelector();
    }
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
    } catch (error) {
      console.error('Error loading devices:', error);
      App.showError('Failed to load devices. ' + error.message);
      this.devicesList = [];
    }
  },
  
  // Render device selector
  renderDeviceSelector() {
    const container = document.getElementById('statistics-container');
    
    // Clear existing content
    container.innerHTML = `
      <div class="col-12 mb-4">
        <div class="d-flex justify-content-between align-items-center">
          <h2><i class="bi bi-graph-up me-2"></i>Device Statistics</h2>
          <div class="d-flex">
            <select id="device-selector" class="form-select me-2" ${this.devicesList.length === 0 ? 'disabled' : ''}>
              ${this.devicesList.length === 0 ? 
                '<option value="">No devices</option>' : 
                this.devicesList.map(device => 
                  `<option value="${device.deviceId}">${device.name}</option>`
                ).join('')
              }
            </select>
            <div class="btn-group ms-2">
              <button class="btn btn-outline-primary active" data-period="30d">30 Days</button>
              <button class="btn btn-outline-primary" data-period="90d">90 Days</button>
              <button class="btn btn-outline-primary" data-period="all">All Time</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add message if no devices
    if (this.devicesList.length === 0) {
      container.innerHTML += `
        <div class="col-12">
          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            No devices found. Add devices to view statistics.
          </div>
        </div>
      `;
    }
  },
  
  // Initialize page structure
  initializePageStructure() {
    if (this.devicesList.length === 0) return;
    
    const container = document.getElementById('statistics-container');
    
    // Add chart containers
    container.innerHTML += `
      <div class="col-md-6 mb-4">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <i class="bi bi-moisture me-2"></i>Soil Moisture Trends
          </div>
          <div class="card-body">
            <canvas id="moisture-trend-chart" height="300"></canvas>
          </div>
        </div>
      </div>
      
      <div class="col-md-6 mb-4">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <i class="bi bi-thermometer-half me-2"></i>Temperature & Humidity Trends
          </div>
          <div class="card-body">
            <canvas id="temp-humidity-chart" height="300"></canvas>
          </div>
        </div>
      </div>
      
      <div class="col-md-12 mb-4">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <i class="bi bi-water me-2"></i>Irrigation Activity
          </div>
          <div class="card-body">
            <canvas id="pump-activity-chart" height="200"></canvas>
          </div>
        </div>
      </div>
      
      <div class="col-md-12 mb-4">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <i class="bi bi-clipboard-data me-2"></i>Summary Statistics
          </div>
          <div class="card-body">
            <div class="row" id="statistics-summary">
              <div class="col-md-4 mb-3">
                <div class="card">
                  <div class="card-body text-center">
                    <h3 class="stat-value" id="avg-moisture">--</h3>
                    <div class="stat-label">Average Soil Moisture</div>
                  </div>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <div class="card">
                  <div class="card-body text-center">
                    <h3 class="stat-value" id="irrigation-count">--</h3>
                    <div class="stat-label">Irrigation Events</div>
                  </div>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <div class="card">
                  <div class="card-body text-center">
                    <h3 class="stat-value" id="avg-temp">--</h3>
                    <div class="stat-label">Average Temperature</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="row mt-3">
              <div class="col-md-3 mb-3">
                <div class="d-flex justify-content-between">
                  <div><strong>Min Moisture:</strong></div>
                  <div id="min-moisture">--</div>
                </div>
              </div>
              <div class="col-md-3 mb-3">
                <div class="d-flex justify-content-between">
                  <div><strong>Max Moisture:</strong></div>
                  <div id="max-moisture">--</div>
                </div>
              </div>
              <div class="col-md-3 mb-3">
                <div class="d-flex justify-content-between">
                  <div><strong>Min Temp:</strong></div>
                  <div id="min-temp">--</div>
                </div>
              </div>
              <div class="col-md-3 mb-3">
                <div class="d-flex justify-content-between">
                  <div><strong>Max Temp:</strong></div>
                  <div id="max-temp">--</div>
                </div>
              </div>
            </div>
            
            <div class="row">
              <div class="col-md-3 mb-3">
                <div class="d-flex justify-content-between">
                  <div><strong>Min Humidity:</strong></div>
                  <div id="min-humidity">--</div>
                </div>
              </div>
              <div class="col-md-3 mb-3">
                <div class="d-flex justify-content-between">
                  <div><strong>Max Humidity:</strong></div>
                  <div id="max-humidity">--</div>
                </div>
              </div>
              <div class="col-md-3 mb-3">
                <div class="d-flex justify-content-between">
                  <div><strong>First Reading:</strong></div>
                  <div id="first-reading">--</div>
                </div>
              </div>
              <div class="col-md-3 mb-3">
                <div class="d-flex justify-content-between">
                  <div><strong>Last Reading:</strong></div>
                  <div id="last-reading">--</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  
  // Load statistics for selected device
  async loadStatistics() {
    if (!this.selectedDeviceId) return;
    
    try {
      // Show loading
      document.getElementById('loading-overlay').style.display = 'flex';
      
      // Get period from active button
      const periodBtn = document.querySelector('.btn-group .btn.active');
      const days = periodBtn ? periodBtn.dataset.period : '30d';
      
      // Load stats data
      const statsResponse = await fetch(`/api/sensor-data/stats/${this.selectedDeviceId}?days=${days === 'all' ? 365 : days.replace('d', '')}`, {
        headers: {
          ...Auth.getAuthHeader()
        }
      });
      
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch statistics');
      }
      
      this.statsData = await statsResponse.ok ? await statsResponse.json() : null;
      
      // Load aggregated data for charts
      const aggregatedResponse = await fetch(`/api/sensor-data/aggregated/${this.selectedDeviceId}?days=${days === 'all' ? 365 : days.replace('d', '')}`, {
        headers: {
          ...Auth.getAuthHeader()
        }
      });
      
      if (!aggregatedResponse.ok) {
        throw new Error('Failed to fetch aggregated data');
      }
      
      this.aggregatedData = await aggregatedResponse.json();
      
      // Update UI with the loaded data
      this.updateStatisticsUI();
      
      // Hide loading
      document.getElementById('loading-overlay').style.display = 'none';
    } catch (error) {
      console.error('Error loading statistics:', error);
      App.showError('Failed to load statistics. ' + error.message);
      document.getElementById('loading-overlay').style.display = 'none';
    }
  },
  
  // Update the device selector to show the selected device
  updateDeviceSelector() {
    if (!this.selectedDeviceId) return;
    
    const deviceSelector = document.getElementById('device-selector');
    if (deviceSelector) {
      deviceSelector.value = this.selectedDeviceId;
    }
  },
  
  // Update UI with statistics data
  updateStatisticsUI() {
    if (!this.statsData) return;
    
    // Update summary statistics
    document.getElementById('avg-moisture').textContent = `${this.statsData.avgSoilMoisture.toFixed(1)}%`;
    document.getElementById('irrigation-count').textContent = this.statsData.pumpOnCount;
    document.getElementById('avg-temp').textContent = `${this.statsData.avgTemperature.toFixed(1)}°C`;
    
    document.getElementById('min-moisture').textContent = `${this.statsData.minSoilMoisture.toFixed(1)}%`;
    document.getElementById('max-moisture').textContent = `${this.statsData.maxSoilMoisture.toFixed(1)}%`;
    document.getElementById('min-temp').textContent = `${this.statsData.minTemperature.toFixed(1)}°C`;
    document.getElementById('max-temp').textContent = `${this.statsData.maxTemperature.toFixed(1)}°C`;
    document.getElementById('min-humidity').textContent = `${this.statsData.minHumidity.toFixed(1)}%`;
    document.getElementById('max-humidity').textContent = `${this.statsData.maxHumidity.toFixed(1)}%`;
    
    if (this.statsData.firstReading) {
      document.getElementById('first-reading').textContent = new Date(this.statsData.firstReading).toLocaleDateString();
    }
    if (this.statsData.lastReading) {
      document.getElementById('last-reading').textContent = new Date(this.statsData.lastReading).toLocaleDateString();
    }
    
    // Create charts
    this.createCharts();
  },
  
  // Create charts from aggregated data
  createCharts() {
    if (!this.aggregatedData || this.aggregatedData.length === 0) return;
    
    // Prepare data for charts
    const labels = this.aggregatedData.map(item => {
      const date = new Date(item.timestamp);
      return date.toLocaleDateString();
    });
    
    const moistureData = this.aggregatedData.map(item => item.avgSoilMoisture);
    const temperatureData = this.aggregatedData.map(item => item.avgTemperature);
    const humidityData = this.aggregatedData.map(item => item.avgHumidity);
    const pumpData = this.aggregatedData.map(item => item.pumpRunning);
    
    // Soil Moisture Trend Chart
    const moistureCtx = document.getElementById('moisture-trend-chart').getContext('2d');
    if (window.moistureTrendChart) {
      window.moistureTrendChart.destroy();
    }
    
    window.moistureTrendChart = new Chart(moistureCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Soil Moisture (%)',
          data: moistureData,
          borderColor: 'rgba(40, 167, 69, 1)',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Moisture (%)'
            }
          }
        }
      }
    });
    
    // Temperature & Humidity Chart
    const tempHumidityCtx = document.getElementById('temp-humidity-chart').getContext('2d');
    if (window.tempHumidityChart) {
      window.tempHumidityChart.destroy();
    }
    
    window.tempHumidityChart = new Chart(tempHumidityCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: temperatureData,
            borderColor: 'rgba(220, 53, 69, 1)',
            backgroundColor: 'transparent',
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Humidity (%)',
            data: humidityData,
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
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Temperature (°C)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Humidity (%)'
            },
            grid: {
              drawOnChartArea: false,
            }
          }
        }
      }
    });
    
    // Pump Activity Chart
    const pumpCtx = document.getElementById('pump-activity-chart').getContext('2d');
    if (window.pumpActivityChart) {
      window.pumpActivityChart.destroy();
    }
    
    window.pumpActivityChart = new Chart(pumpCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Irrigation Activity',
          data: pumpData.map(val => val ? 1 : 0),
          backgroundColor: 'rgba(13, 110, 253, 0.8)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            min: 0,
            max: 1,
            ticks: {
              stepSize: 1,
              callback: function(value) {
                return value === 0 ? 'Off' : 'On';
              }
            },
            title: {
              display: true,
              text: 'Pump Status'
            }
          }
        }
      }
    });
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Device selector change
    const deviceSelector = document.getElementById('device-selector');
    if (deviceSelector) {
      deviceSelector.addEventListener('change', (e) => {
        this.selectedDeviceId = e.target.value;
        this.loadStatistics();
      });
    }
    
    // Period buttons
    const periodButtons = document.querySelectorAll('.btn-group .btn[data-period]');
    periodButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Update active button
        periodButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Reload statistics
        this.loadStatistics();
      });
    });
  }
};

// Load statistics when navigating to the statistics page
function loadStatistics() {
  Statistics.init();
} 