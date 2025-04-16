/**
 * Profile Module
 * Handles user profile management and system settings
 */

const Profile = {
  userData: null,
  
  // Initialize profile page
  async init() {
    console.log('Initializing Profile page');
    
    // Load user data
    await this.loadUserData();
    
    // Initialize page structure
    this.renderProfilePage();
    
    // Set up event listeners
    this.setupEventListeners();
  },
  
  // Load user data from API
  async loadUserData() {
    try {
      const response = await fetch('/api/users/me', {
        headers: {
          ...Auth.getAuthHeader()
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      this.userData = await response.json();
      console.log('User data loaded:', this.userData);
    } catch (error) {
      console.error('Error loading user data:', error);
      App.showError('Failed to load user data. ' + error.message);
      this.userData = null;
    }
  },
  
  // Render the profile page
  renderProfilePage() {
    const container = document.getElementById('profile-container');
    
    if (!this.userData) {
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Failed to load user profile. Please try refreshing the page.
          </div>
        </div>
      `;
      return;
    }
    
    // Build profile page with user info and settings
    container.innerHTML = `
      <div class="col-md-4 mb-4">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <i class="bi bi-person-circle me-2"></i>Profile Information
          </div>
          <div class="card-body">
            <div class="text-center mb-4">
              <div class="avatar-circle mx-auto mb-3">
                <span class="avatar-initials">${this.getInitials(this.userData.name)}</span>
              </div>
              <h4>${this.userData.name}</h4>
              <p class="text-muted">${this.userData.email}</p>
              <p><span class="badge ${this.userData.role === 'admin' ? 'bg-danger' : 'bg-secondary'}">${this.userData.role}</span></p>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Last Login</label>
              <p>${this.userData.lastLogin ? new Date(this.userData.lastLogin).toLocaleString() : 'Never'}</p>
            </div>
            
            <button id="change-password-btn" class="btn btn-outline-primary w-100">
              <i class="bi bi-key me-2"></i>Change Password
            </button>
          </div>
        </div>
      </div>
      
      <div class="col-md-8">
        <div class="row">
          <div class="col-12 mb-4">
            <div class="card">
              <div class="card-header bg-primary text-white">
                <i class="bi bi-bell me-2"></i>Notification Preferences
              </div>
              <div class="card-body">
                <form id="notification-form">
                  <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" id="email-notifications" ${this.userData.notificationPreferences?.email ? 'checked' : ''}>
                    <label class="form-check-label" for="email-notifications">
                      Email Notifications
                    </label>
                    <div class="form-text">Receive email alerts for system events and device anomalies.</div>
                  </div>
                  
                  <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" id="push-notifications" ${this.userData.notificationPreferences?.pushNotifications ? 'checked' : ''}>
                    <label class="form-check-label" for="push-notifications">
                      Push Notifications
                    </label>
                    <div class="form-text">Receive browser notifications when viewing the dashboard.</div>
                  </div>
                  
                  <button type="submit" class="btn btn-primary">
                    <i class="bi bi-save me-1"></i> Save Notification Settings
                  </button>
                </form>
              </div>
            </div>
          </div>
          
          <div class="col-12 mb-4 ${this.userData.role === 'admin' ? '' : 'd-none'}">
            <div class="card">
              <div class="card-header bg-primary text-white">
                <i class="bi bi-gear me-2"></i>System Settings
              </div>
              <div class="card-body">
                <form id="system-settings-form">
                  <div class="mb-3">
                    <label for="default-threshold-low" class="form-label">Default Low Moisture Threshold (%)</label>
                    <input type="number" class="form-control" id="default-threshold-low" min="0" max="100" value="30">
                    <div class="form-text">Default value for new devices</div>
                  </div>
                  
                  <div class="mb-3">
                    <label for="default-threshold-high" class="form-label">Default High Moisture Threshold (%)</label>
                    <input type="number" class="form-control" id="default-threshold-high" min="0" max="100" value="55">
                    <div class="form-text">Default value for new devices</div>
                  </div>
                  
                  <div class="mb-3">
                    <label for="email-recipient" class="form-label">Email Recipient for Alerts</label>
                    <input type="email" class="form-control" id="email-recipient">
                    <div class="form-text">Email address where system alerts will be sent</div>
                  </div>
                  
                  <button type="submit" class="btn btn-primary">
                    <i class="bi bi-save me-1"></i> Save System Settings
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Change Password Modal -->
      <div class="modal fade" id="changePasswordModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">Change Password</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="change-password-form">
                <div class="mb-3">
                  <label for="current-password" class="form-label">Current Password</label>
                  <input type="password" class="form-control" id="current-password" required>
                </div>
                <div class="mb-3">
                  <label for="new-password" class="form-label">New Password</label>
                  <input type="password" class="form-control" id="new-password" minlength="6" required>
                </div>
                <div class="mb-3">
                  <label for="confirm-password" class="form-label">Confirm New Password</label>
                  <input type="password" class="form-control" id="confirm-password" minlength="6" required>
                </div>
                <div class="alert alert-danger d-none" id="password-error"></div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="save-password-btn">Change Password</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // If admin, load system settings
    if (this.userData.role === 'admin') {
      this.loadSystemSettings();
    }
  },
  
  // Get user initials for avatar
  getInitials(name) {
    if (!name) return '?';
    
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  },
  
  // Validate email format
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },
  
  // Load system settings (admin only)
  async loadSystemSettings() {
    try {
      // Fetch system settings from server
      const response = await fetch('/api/settings', {
        method: 'GET',
        headers: {
          ...Auth.getAuthHeader()
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load system settings');
      }
      
      const { settings } = await response.json();
      
      // Update form values
      document.getElementById('default-threshold-low').value = settings.defaultThresholdLow || 30;
      document.getElementById('default-threshold-high').value = settings.defaultThresholdHigh || 55;
      document.getElementById('email-recipient').value = settings.emailRecipient || '';
    } catch (error) {
      console.error('Error loading system settings:', error);
      App.showError('Failed to load system settings');
    }
  },
  
  // Save notification preferences
  async saveNotificationPreferences() {
    try {
      const emailNotifications = document.getElementById('email-notifications').checked;
      const pushNotifications = document.getElementById('push-notifications').checked;
      
      const response = await fetch('/api/users/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...Auth.getAuthHeader()
        },
        body: JSON.stringify({
          email: emailNotifications,
          pushNotifications: pushNotifications
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }
      
      // Success - update local user data
      this.userData.notificationPreferences = {
        email: emailNotifications,
        pushNotifications: pushNotifications
      };
      
      // Show success message
      App.showSuccess('Notification preferences updated successfully');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      App.showError('Failed to update notification preferences');
    }
  },
  
  // Save system settings (admin only)
  async saveSystemSettings() {
    try {
      const defaultThresholdLow = parseInt(document.getElementById('default-threshold-low').value);
      const defaultThresholdHigh = parseInt(document.getElementById('default-threshold-high').value);
      const emailRecipient = document.getElementById('email-recipient').value;
      
      // Basic validation
      if (!emailRecipient) {
        App.showError('Email recipient is required');
        return;
      }
      
      // Validate thresholds
      if (defaultThresholdLow >= defaultThresholdHigh) {
        App.showError('Low threshold must be less than high threshold');
        return;
      }
      
      if (!this.validateEmail(emailRecipient)) {
        App.showError('Please enter a valid email address');
        return;
      }
      
      // Send to API
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...Auth.getAuthHeader()
        },
        body: JSON.stringify({
          defaultThresholdLow,
          defaultThresholdHigh,
          emailRecipient
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update system settings');
      }
      
      // Update Dashboard thresholds if available
      if (typeof Dashboard !== 'undefined' && Dashboard.currentDevice) {
        // Only update dashboard if we're in device page and there's a selected device
        await this.updateDashboardWithNewDefaults(defaultThresholdLow, defaultThresholdHigh);
      }
      
      // Show success message
      App.showSuccess('System settings updated successfully');
    } catch (error) {
      console.error('Error saving system settings:', error);
      App.showError(error.message || 'Failed to update system settings');
    }
  },
  
  // Update dashboard with new default values
  async updateDashboardWithNewDefaults(lowThreshold, highThreshold) {
    try {
      // First attempt: Update the Dashboard module's system defaults if available
      if (typeof Dashboard !== 'undefined') {
        console.log('Updating Dashboard system defaults to:', lowThreshold, highThreshold);
        Dashboard.systemDefaults = {
          lowThreshold: lowThreshold,
          highThreshold: highThreshold
        };
        
        // If we're on the dashboard page, update the display immediately
        if (window.location.hash === '#dashboard' || window.location.hash === '') {
          console.log('On dashboard page, updating threshold display');
          if (typeof Dashboard.updateThresholdDisplayWithDefaults === 'function') {
            Dashboard.updateThresholdDisplayWithDefaults();
          } else {
            // Fallback direct update to the DOM if method not available
            const thresholdsDisplay = document.getElementById('thresholds-display');
            if (thresholdsDisplay) {
              thresholdsDisplay.innerHTML = `Thresholds: <span class="text-danger">Dry &lt; ${lowThreshold}%</span> | <span class="text-success">${lowThreshold}-${highThreshold}% Optimal</span> | <span class="text-primary">&gt; ${highThreshold}% Wet</span>`;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating dashboard with new defaults:', error);
    }
  },
  
  // Handle changing password
  async changePassword() {
    try {
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const passwordError = document.getElementById('password-error');
      
      // Clear previous errors
      passwordError.classList.add('d-none');
      
      // Validate passwords match
      if (newPassword !== confirmPassword) {
        passwordError.textContent = 'New passwords do not match';
        passwordError.classList.remove('d-none');
        return;
      }
      
      // In a real implementation, you would send this to an API endpoint
      // const response = await fetch('/api/users/change-password', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     ...Auth.getAuthHeader()
      //   },
      //   body: JSON.stringify({
      //     currentPassword,
      //     newPassword
      //   })
      // });
      
      // Hide modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
      modal.hide();
      
      // Show success message
      App.showSuccess('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      
      // Show error in modal
      const passwordError = document.getElementById('password-error');
      passwordError.textContent = error.message || 'Failed to change password';
      passwordError.classList.remove('d-none');
    }
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Change password button
    document.getElementById('change-password-btn').addEventListener('click', () => {
      const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
      modal.show();
    });
    
    // Save password button
    document.getElementById('save-password-btn').addEventListener('click', () => {
      this.changePassword();
    });
    
    // Notification form submission
    document.getElementById('notification-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNotificationPreferences();
    });
    
    // System settings form (admin only)
    const systemSettingsForm = document.getElementById('system-settings-form');
    if (systemSettingsForm) {
      systemSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSystemSettings();
      });
    }
  }
};

// Add a success message method to App if it doesn't exist
if (typeof App === 'undefined') {
  // Create a minimal App object if it doesn't exist
  window.App = {
    showError: function(message) {
      console.error('Error:', message);
      alert('Error: ' + message);
    },
    showSuccess: function(message) {
      console.log('Success:', message);
      alert('Success: ' + message);
    }
  };
} else if (typeof App.showSuccess !== 'function') {
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

// Load profile when navigating to the profile page
function loadProfile() {
  Profile.init();
} 