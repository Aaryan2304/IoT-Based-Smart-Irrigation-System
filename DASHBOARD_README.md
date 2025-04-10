# Smart Irrigation System - Web Dashboard

A responsive web dashboard for monitoring and controlling an IoT-based Smart Irrigation System.

## Features

- **Real-Time Monitoring**: View current soil moisture, temperature, and humidity readings
- **Historical Data Visualization**: Interactive line charts of sensor data over time (24h, 7d, 30d)
- **Automatic Irrigation Control**: System automatically waters plants based on soil moisture thresholds
  - Pump turns ON when moisture falls below 30%
  - Pump turns OFF when moisture rises above 55%
- **Manual Control**: Option to override automatic mode and manually control the pump
- **3D Visualization**: Interactive 3D representation of the plant and irrigation system
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5 for responsive design
- **Visualization Libraries**:
  - Chart.js for time-series charts
  - Three.js for 3D visualization
- **Real-Time Updates**: Socket.io for live data updates
- **API Communication**: Fetch API for REST endpoints

## Dashboard Sections

### 1. Current Status Panel

Displays the most recent sensor readings:
- Soil moisture percentage with color-coded gauge
- Temperature and humidity readings
- Pump status indicator (ON/OFF)

### 2. Pump Control Panel

Allows controlling the irrigation system:
- Toggle switch for Automatic/Manual mode
- Manual control buttons (visible in manual mode)
- Current pump status indicator

### 3. Historical Data Chart

Interactive time-series chart showing:
- Soil moisture percentage
- Temperature
- Humidity
- Time period selectors (24h, 7d, 30d)

### 4. 3D Visualization

Interactive 3D model showing:
- Plant health based on moisture levels
- Soil color reflecting moisture content
- Animated water droplets when pump is active
- Water ripple effects on the soil surface

### 5. System Information

Displays device details:
- Device name and ID
- Location information
- Last update timestamp
- Current moisture threshold settings
- Connection status

## Usage

### Automatic Mode

By default, the system operates in automatic mode:
1. The pump automatically turns ON when soil moisture falls below 30%
2. The pump automatically turns OFF when soil moisture rises above 55%
3. The dashboard displays the current status in real-time

### Manual Mode

To override the automatic control:
1. Toggle the "Automatic Mode" switch to OFF
2. Use the "Turn Pump ON" and "Turn Pump OFF" buttons to control the pump manually
3. Toggle back to "Automatic Mode" to resume automatic control

### Viewing Historical Data

1. The dashboard shows the last 24 hours of data by default
2. Click on "7d" or "30d" buttons to view longer periods
3. Hover over the chart to see specific values at any point in time

## Mobile View

On mobile devices:
- The dashboard rearranges into a single column layout
- All controls remain accessible
- The 3D visualization adjusts to fit smaller screens
- Charts become scrollable for better data exploration 