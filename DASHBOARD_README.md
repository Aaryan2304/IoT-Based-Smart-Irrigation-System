# Smart Irrigation System - Web Dashboard

A responsive web dashboard application for monitoring and controlling the IoT-based Smart Irrigation System. It provides user authentication, real-time data visualization, device management, and configuration options.

## Features

- **User Authentication**: Secure login and registration for users.
- **Role-Based Access**: Differentiates between regular users and administrators (admins have access to system settings).
- **Real-Time Monitoring**: Displays current soil moisture (gauge), temperature, humidity, and pump status for selected devices.
- **Historical Data Visualization**: Interactive line charts (Chart.js) showing sensor data history (soil moisture, temp, humidity) over selectable periods (24h, 7d, 30d).
- **Automatic/Manual Pump Control**: Toggle between automatic irrigation (based on thresholds) and manual pump operation directly from the dashboard.
- **Device Management**: View a list of devices, add new devices, edit device details (name, location, thresholds), and delete devices.
- **Statistics View**: Display aggregated statistics (min/max/avg) for selected devices over time.
- **Profile Management**: Users can view and update their name/email and change their password.
- **System Settings (Admin)**: Administrators can configure system-wide default moisture thresholds and the notification email recipient.
- **Notifications View**: Display system notifications and alerts.
- **3D Visualization**: Interactive 3D representation (Three.js) of the plant and soil, reflecting moisture levels and pump activity.
- **Responsive Design**: Adapts to various screen sizes (desktop, tablet, mobile) using Bootstrap 5.

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5.3.0
- **Visualization Libraries**:
  - Chart.js 3.8.0 (for time-series charts)
  - Three.js r149 (for 3D visualization)
- **Real-Time Updates**: Socket.io Client 4.6.1 (for potential real-time communication, although primary data might come via API polling or initial load)
- **Utility Libraries**: Moment.js 2.29.4 (for date/time formatting)
- **API Communication**: Native Fetch API for interacting with the backend REST endpoints.
- **Authentication**: Session storage for storing JWT tokens.

## Application Structure & Views

The application is a Single Page Application (SPA) managed by `public/js/app.js`, which handles routing based on URL hash fragments (`#`).

### Main Views (Accessible via Navbar):

1.  **`#dashboard` (Dashboard)**:
    *   Displays the main monitoring interface for a selected device.
    *   Includes: Moisture gauge, current temperature/humidity, pump control panel (auto/manual switch, status), historical data chart, 3D visualization, and device information panel.
    *   Allows editing moisture thresholds for the *currently selected* device via a modal.
2.  **`#devices` (Devices)**:
    *   Lists all registered irrigation devices in cards or a table.
    *   Provides options to Add a new device, Edit existing device details (name, location), configure device-specific Thresholds, and Delete devices.
3.  **`#statistics` (Statistics)**:
    *   Allows selecting a device.
    *   Displays aggregated statistical data (e.g., min/max/average sensor readings, pump run times) for the selected device over a specified period.
    *   May include charts for visualizing statistical trends.
4.  **`#profile` (Profile - via User Dropdown)**:
    *   Displays the current user's information (name, email).
    *   Allows users to update their name/email.
    *   Provides a form to change the user's password.
    *   May include user-specific notification preferences.
5.  **`#notifications` (Notifications - via User Dropdown)**:
    *   Displays a list of system notifications and alerts relevant to the user or their devices.
    *   Provides functionality to mark notifications as read.
6.  **`#settings` (Settings - Admin Only, potentially via Profile or dedicated link)**:
    *   Accessible only to users with the 'admin' role.
    *   Allows configuration of system-wide default moisture thresholds for new devices.
    *   Allows setting the primary email recipient for system alerts.

### Authentication View:

*   **Login/Register Forms**: Presented initially if the user is not logged in. Handled by `public/js/auth.js`.

## Usage

1.  **Login/Register**: Access the application URL (e.g., `http://localhost:3000`). If not logged in, use the login form or register a new account.
2.  **Navigate**: Use the main navigation bar to switch between Dashboard, Devices, and Statistics views. Access Profile and Notifications via the user dropdown menu in the top-right.
3.  **Dashboard Interaction**:
    *   The dashboard typically displays data for one device at a time (selection mechanism might be implicit or via a dropdown).
    *   View real-time sensor data.
    *   Switch between **Automatic Mode** (system controls pump based on thresholds) and **Manual Mode** using the toggle.
    *   In Manual Mode, use the "Turn Pump ON" / "Turn Pump OFF" buttons.
    *   Select different time ranges (24h, 7d, 30d) for the historical chart.
    *   Interact with the 3D visualization (rotate/zoom).
4.  **Device Management (`#devices`)**: Add new devices, modify settings (like name, location, specific moisture thresholds) for existing ones, or remove devices.
5.  **Statistics (`#statistics`)**: Select a device and view its performance summary.
6.  **Profile (`#profile`)**: Update your account details or change your password.
7.  **Settings (`#settings`, Admin only)**: Adjust global defaults if you have admin privileges.

## Mobile View

-   The interface uses Bootstrap's responsive grid system to adapt to smaller screens.
-   Navigation might collapse into a hamburger menu.
-   Content reflows into a single column layout where necessary.
-   Charts and visualizations adjust or become scrollable for usability. 