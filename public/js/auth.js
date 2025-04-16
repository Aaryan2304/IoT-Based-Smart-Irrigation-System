/**
 * Authentication Module
 * Handles user login, registration, and session management
 */

// Auth state
const Auth = {
  token: null,
  user: null,
  isLoggedIn: false,
  
  // Initialize auth from session storage
  init() {
    const token = sessionStorage.getItem('token');
    const user = sessionStorage.getItem('user');
    
    if (token && user) {
      this.token = token;
      this.user = JSON.parse(user);
      this.isLoggedIn = true;
      return true;
    }
    
    return false;
  },
  
  // Save auth data to session storage
  saveSession() {
    sessionStorage.setItem('token', this.token);
    sessionStorage.setItem('user', JSON.stringify(this.user));
  },
  
  // Clear auth data
  clearSession() {
    this.token = null;
    this.user = null;
    this.isLoggedIn = false;
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  },
  
  // Check if user is admin
  isAdmin() {
    return this.user && this.user.role === 'admin';
  },
  
  // Login user
  async login(email, password) {
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      this.token = data.token;
      this.user = data.user;
      this.isLoggedIn = true;
      this.saveSession();
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Register user
  async register(name, email, password) {
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      this.token = data.token;
      this.user = data.user;
      this.isLoggedIn = true;
      this.saveSession();
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Logout user
  logout() {
    this.clearSession();
  },
  
  // Get auth header for API requests
  getAuthHeader() {
    return {
      'Authorization': `Bearer ${this.token}`
    };
  }
};

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const logoutBtn = document.querySelector('.logout-btn');
const userNameSpan = document.querySelector('.user-name');
const adminElements = document.querySelectorAll('.admin-only');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');

// Initialize tab functionality
document.addEventListener('DOMContentLoaded', () => {
  // Set up tab switching
  loginTab.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login').classList.add('show', 'active');
    document.getElementById('register').classList.remove('show', 'active');
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  });
  
  registerTab.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login').classList.remove('show', 'active');
    document.getElementById('register').classList.add('show', 'active');
    loginTab.classList.remove('active');
    registerTab.classList.add('active');
  });
});

// Event Listeners
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get form values
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  // Show loading
  document.getElementById('loading-overlay').style.display = 'flex';
  
  // Attempt login
  const result = await Auth.login(email, password);
  
  // Hide loading
  document.getElementById('loading-overlay').style.display = 'none';
  
  if (result.success) {
    // Update UI for logged in state
    showApp();
  } else {
    // Show error
    loginError.textContent = result.error;
    loginError.classList.remove('d-none');
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get form values
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  
  // Show loading
  document.getElementById('loading-overlay').style.display = 'flex';
  
  // Attempt registration
  const result = await Auth.register(name, email, password);
  
  // Hide loading
  document.getElementById('loading-overlay').style.display = 'none';
  
  if (result.success) {
    // Update UI for logged in state
    showApp();
  } else {
    // Show error
    registerError.textContent = result.error;
    registerError.classList.remove('d-none');
  }
});

logoutBtn.addEventListener('click', (e) => {
  e.preventDefault();
  
  // Logout user
  Auth.logout();
  
  // Update UI for logged out state
  hideApp();
});

// Show app UI and hide auth UI
function showApp() {
  authContainer.style.display = 'none';
  appContainer.style.display = 'block';
  
  // Update user name
  userNameSpan.textContent = Auth.user.name;
  
  // Show/hide admin elements
  if (Auth.isAdmin()) {
    adminElements.forEach(el => el.style.display = 'block');
  } else {
    adminElements.forEach(el => el.style.display = 'none');
  }
  
  // Trigger app initialization
  window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { isLoggedIn: true } }));
}

// Hide app UI and show auth UI
function hideApp() {
  appContainer.style.display = 'none';
  authContainer.style.display = 'flex';
  
  // Reset forms
  loginForm.reset();
  registerForm.reset();
  loginError.classList.add('d-none');
  registerError.classList.add('d-none');
  
  // Trigger auth state change event
  window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { isLoggedIn: false } }));
}

// Initialize auth
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Bootstrap tabs
  try {
    // Check if Bootstrap is loaded
    if (typeof bootstrap !== 'undefined') {
      // Try using Bootstrap's Tab API first
      const tabElms = document.querySelectorAll('#auth-tabs a[data-bs-toggle="tab"]');
      tabElms.forEach(tabEl => {
        new bootstrap.Tab(tabEl);
      });
      
      // Initialize all dropdowns explicitly
      const dropdownElementList = document.querySelectorAll('.dropdown-toggle');
      dropdownElementList.forEach(dropdownToggleEl => {
        new bootstrap.Dropdown(dropdownToggleEl);
      });

      // Add direct click handlers for all dropdown elements
      document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
          if (item.classList.contains('logout-btn')) {
            e.preventDefault();
            console.log('Logout clicked');
            Auth.logout();
            hideApp();
          }
        });
      });
    }
  } catch (error) {
    console.error('Error initializing Bootstrap components:', error);
  }

  // Initialize authentication
  if (Auth.init()) {
    showApp();
  } else {
    hideApp();
  }
}); 