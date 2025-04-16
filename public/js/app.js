/**
 * Main Application Module
 * Handles routing and coordinates other modules
 */

// App state
const App = {
  currentView: 'dashboard',
  viewContainers: {
    dashboard: document.getElementById('dashboard-container'),
    devices: document.getElementById('devices-container'),
    statistics: document.getElementById('statistics-container'),
    settings: document.getElementById('settings-container'),
    profile: document.getElementById('profile-container'),
    notifications: document.getElementById('notifications-container')
  },
  
  // Initialize app
  init() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Check for hash in URL for routing
    this.handleHashChange();
    
    // Establish custom event for sensor data updates
    window.addEventListener('sensorDataReceived', (e) => {
      if (e.detail && e.detail.sensorData) {
        // Forward to visualizations and other components
        window.dispatchEvent(new CustomEvent('sensorDataUpdated', {
          detail: { sensorData: e.detail.sensorData }
        }));
      }
    });
    
    console.log('App initialized');
    return true;
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Listen for hash changes for routing
    window.addEventListener('hashchange', () => this.handleHashChange());
    
    // Add click event to navigation links
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        // Remove active class from all nav links
        document.querySelectorAll('.navbar-nav .nav-link').forEach(el => {
          el.classList.remove('active');
        });
        
        // Add active class to current link
        e.target.classList.add('active');
      });
    });
  },
  
  // Handle hash changes for routing
  handleHashChange() {
    // Get the hash without the # symbol
    let hash = window.location.hash.substring(1) || 'dashboard';
    
    console.log('Navigation hash changed to:', hash);
    
    // Check if this is a valid view
    if (!this.viewContainers[hash]) {
      hash = 'dashboard';
      window.location.hash = '#dashboard';
    }
    
    // Update current view
    this.showView(hash);
    
    // Update active nav link
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${hash}`) {
        link.classList.add('active');
      }
    });
    
    // Special handling for certain views
    switch (hash) {
      case 'dashboard':
        console.log('Loading dashboard view');
        // If Dashboard exists and has a refreshSystemDefaults method, call it
        if (typeof Dashboard !== 'undefined') {
          if (typeof Dashboard.refreshSystemDefaults === 'function') {
            Dashboard.refreshSystemDefaults();
          } else if (typeof Dashboard.init === 'function') {
            Dashboard.init();
          }
        }
        break;
      case 'devices':
        console.log('Loading devices view');
        if (typeof loadDevices === 'function') {
          loadDevices();
        } else {
          console.error('loadDevices function not found');
        }
        break;
      case 'statistics':
        console.log('Loading statistics view');
        if (typeof loadStatistics === 'function') {
          loadStatistics();
        } else {
          console.error('loadStatistics function not found');
        }
        break;
      case 'profile':
        console.log('Loading profile view');
        if (typeof loadProfile === 'function') {
          loadProfile();
        } else {
          console.error('loadProfile function not found');
          // Fallback to direct initialization
          if (typeof Profile !== 'undefined' && Profile.init) {
            Profile.init();
          }
        }
        break;
      case 'notifications':
        console.log('Loading notifications view');
        if (typeof loadNotifications === 'function') {
          loadNotifications();
        } else {
          console.error('loadNotifications function not found');
          // Fallback to direct initialization
          if (typeof Notifications !== 'undefined' && Notifications.init) {
            Notifications.init();
          }
        }
        break;
      case 'settings':
        console.log('Loading settings view');
        if (typeof loadSettings === 'function') {
          loadSettings();
        } else {
          console.error('loadSettings function not found');
        }
        break;
    }
  },
  
  // Show a specific view and hide others
  showView(viewName) {
    console.log('Showing view:', viewName);
    
    // Hide all views
    Object.values(this.viewContainers).forEach(container => {
      if (container) {
        container.style.display = 'none';
      }
    });
    
    // Show selected view
    if (this.viewContainers[viewName]) {
      this.viewContainers[viewName].style.display = 'flex';
      this.currentView = viewName;
    } else {
      console.error('View container not found:', viewName);
    }
  },
  
  // Show loading overlay
  showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
  },
  
  // Hide loading overlay
  hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
  },
  
  // Show an error message
  showError(message, duration = 5000) {
    // Create error toast if it doesn't exist
    let errorToast = document.getElementById('error-toast');
    
    if (!errorToast) {
      errorToast = document.createElement('div');
      errorToast.id = 'error-toast';
      errorToast.className = 'toast position-fixed top-0 end-0 m-3';
      errorToast.setAttribute('role', 'alert');
      errorToast.setAttribute('aria-live', 'assertive');
      errorToast.setAttribute('aria-atomic', 'true');
      
      errorToast.innerHTML = `
        <div class="toast-header bg-danger text-white">
          <i class="bi bi-exclamation-circle-fill me-2"></i>
          <strong class="me-auto">Error</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body"></div>
      `;
      
      document.body.appendChild(errorToast);
    }
    
    // Set the error message
    errorToast.querySelector('.toast-body').textContent = message;
    
    // Show the toast
    const bsToast = new bootstrap.Toast(errorToast, {
      autohide: true,
      delay: duration
    });
    
    bsToast.show();
  }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // App will be initialized by Auth module when user logs in
  // However, we can initialize navigation and other non-auth-dependent parts
  App.init();
});

// Initialize app when auth state changes to logged in
window.addEventListener('authStateChanged', (e) => {
  if (e.detail && e.detail.isLoggedIn) {
    App.init();
  }
}); 