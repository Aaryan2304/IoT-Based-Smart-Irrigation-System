/**
 * Notifications Module
 * Handles displaying system and device notifications
 */

const Notifications = {
  notificationsList: [],
  
  // Initialize notifications page
  async init() {
    console.log('Initializing Notifications page');
    
    // Create page structure
    this.renderNotificationsPage();
    
    // Load notifications
    await this.loadNotifications();
    
    // Display notifications
    this.displayNotifications();
    
    // Set up event listeners
    this.setupEventListeners();
  },
  
  // Render the notifications page structure
  renderNotificationsPage() {
    const container = document.getElementById('notifications-container');
    
    container.innerHTML = `
      <div class="col-md-12 mb-4">
        <div class="d-flex justify-content-between align-items-center">
          <h2><i class="bi bi-bell-fill me-2"></i>Notifications</h2>
          <div>
            <button id="mark-all-read-btn" class="btn btn-outline-primary">
              <i class="bi bi-check-all me-1"></i>Mark All as Read
            </button>
            <div class="btn-group ms-2">
              <button type="button" class="btn btn-outline-primary active" data-filter="all">All</button>
              <button type="button" class="btn btn-outline-primary" data-filter="alert">Alerts</button>
              <button type="button" class="btn btn-outline-primary" data-filter="info">Info</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-12">
        <div class="card">
          <div class="card-body p-0">
            <div id="notifications-list" class="list-group list-group-flush">
              <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  
  // Load notifications from server
  async loadNotifications() {
    try {
      const response = await fetch('/api/notifications', {
        headers: Auth.getAuthHeader()
      });
      
      if (!response.ok) {
        throw new Error('Failed to load notifications');
      }
      
      const notifications = await response.json();
      this.notificationsList = notifications;
      
      // Display empty message if no notifications
      if (this.notificationsList.length === 0) {
        const container = document.querySelector('#notifications-list');
        container.innerHTML = `
          <div class="text-center py-5">
            <i class="bi bi-bell text-muted" style="font-size: 3rem;"></i>
            <p class="mt-3 text-muted">No notifications yet</p>
          </div>
        `;
        
        // Update badge count
        this.updateBadgeCount();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Show empty notifications state
      const container = document.querySelector('#notifications-list');
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-exclamation-circle text-danger" style="font-size: 3rem;"></i>
          <p class="mt-3 text-muted">Failed to load notifications</p>
        </div>
      `;
    }
  },
  
  // Update notification badge count
  updateBadgeCount() {
    // Count unread notifications
    const unreadCount = this.notificationsList.filter(n => !n.read).length;
    
    // Update badge if it exists
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  },
  
  // Display notifications in the list
  displayNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    
    if (this.notificationsList.length === 0) {
      notificationsList.innerHTML = `
        <div class="list-group-item text-center py-5">
          <i class="bi bi-bell-slash fs-1 text-muted"></i>
          <p class="mt-3 text-muted">No notifications available</p>
        </div>
      `;
      return;
    }
    
    // Sort notifications by timestamp (newest first)
    const sortedNotifications = [...this.notificationsList].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Build HTML for notifications
    let notificationsHTML = '';
    
    sortedNotifications.forEach(notification => {
      const isUnread = !notification.read;
      const formattedTime = this.getTimeAgo(notification.timestamp);
      const icon = notification.type === 'alert' 
        ? '<i class="bi bi-exclamation-triangle-fill text-danger fs-4"></i>' 
        : '<i class="bi bi-info-circle-fill text-primary fs-4"></i>';
      
      notificationsHTML += `
        <div class="list-group-item ${isUnread ? 'fw-bold bg-light' : ''}" data-id="${notification.id}" data-type="${notification.type}">
          <div class="d-flex">
            <div class="me-3 pt-1">
              ${icon}
            </div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-1">${notification.deviceName}</h6>
                <small class="text-muted">${formattedTime}</small>
              </div>
              <p class="mb-1">${notification.message}</p>
              <small class="text-muted">${notification.deviceId}</small>
            </div>
            ${isUnread ? `
              <div class="ms-2">
                <button class="btn btn-sm btn-outline-secondary mark-read-btn" data-id="${notification.id}">
                  <i class="bi bi-check"></i>
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    notificationsList.innerHTML = notificationsHTML;
    
    // Add event listeners to mark as read buttons
    document.querySelectorAll('.mark-read-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.id;
        this.markAsRead(id);
      });
    });
  },
  
  // Format timestamp as relative time (e.g., "2 hours ago")
  getTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
      return interval === 1 ? '1 year ago' : `${interval} years ago`;
    }
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      return interval === 1 ? '1 month ago' : `${interval} months ago`;
    }
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
      return interval === 1 ? '1 day ago' : `${interval} days ago`;
    }
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
      return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
    }
    
    return 'Just now';
  },
  
  // Mark a notification as read
  markAsRead(id) {
    // Find the notification
    const notification = this.notificationsList.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      
      // In a real app, we would update the server
      // fetch(`/api/notifications/${id}/read`, {
      //   method: 'PATCH',
      //   headers: {
      //     ...Auth.getAuthHeader()
      //   }
      // });
      
      // Update the UI
      this.displayNotifications();
    }
  },
  
  // Mark all notifications as read
  markAllAsRead() {
    // Update all notifications
    this.notificationsList.forEach(notification => {
      notification.read = true;
    });
    
    // In a real app, we would update the server
    // fetch('/api/notifications/read-all', {
    //   method: 'PATCH',
    //   headers: {
    //     ...Auth.getAuthHeader()
    //   }
    // });
    
    // Update the UI
    this.displayNotifications();
  },
  
  // Filter notifications by type
  filterNotifications(type) {
    const notificationItems = document.querySelectorAll('#notifications-list .list-group-item');
    
    if (type === 'all') {
      notificationItems.forEach(item => {
        item.style.display = 'block';
      });
    } else {
      notificationItems.forEach(item => {
        if (item.dataset.type === type) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    }
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Mark all as read button
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', () => {
        this.markAllAsRead();
      });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Update active button
        filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Filter notifications
        const filterType = e.target.dataset.filter;
        this.filterNotifications(filterType);
      });
    });
  }
};

// Load notifications when navigating to the notifications page
function loadNotifications() {
  Notifications.init();
} 