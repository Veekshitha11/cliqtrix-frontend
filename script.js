// ============================================
// TASKFLOW AI - FRONTEND LOGIC
// ============================================

// Configuration
const API_BASE_URL = "https://cliqtrix-backend.onrender.com";

// State Management
const state = {
  currentTab: 'inbox',
  tasks: [],
  crmContacts: [],
  dailyPlan: null,
  timeDebt: null,
  isDarkMode: true
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  setupEventListeners();
  loadInitialData();
  updatePlanDate();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Tab navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.addEventListener('click', toggleTheme);
  
  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  refreshBtn.addEventListener('click', refreshAllData);
  
  // CRM search
  const crmSearch = document.getElementById('crm-search');
  crmSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchCRM(e.target.value);
    }
  });
  
  // Task filter
  const taskFilter = document.getElementById('task-filter');
  taskFilter.addEventListener('change', (e) => {
    filterTasks(e.target.value);
  });
  
  // CRM refresh
  const refreshCRM = document.getElementById('refresh-crm');
  refreshCRM.addEventListener('click', () => {
    const email = document.getElementById('crm-search').value;
    if (email) searchCRM(email);
  });
}

// ============================================
// TAB NAVIGATION
// ============================================

function switchTab(tabName) {
  state.currentTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update panels
  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `${tabName}-panel`);
  });
  
  // Load data for specific tabs
  if (tabName === 'plan' && !state.dailyPlan) {
    loadDailyPlan();
  }
  if (tabName === 'debt' && !state.timeDebt) {
    loadTimeDebt();
  }
}

// ============================================
// THEME TOGGLE
// ============================================

function toggleTheme() {
  state.isDarkMode = !state.isDarkMode;
  document.body.classList.toggle('light-mode', !state.isDarkMode);
  
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');
  
  sunIcon.classList.toggle('hidden', !state.isDarkMode);
  moonIcon.classList.toggle('hidden', state.isDarkMode);
  
  showToast(state.isDarkMode ? 'Dark mode enabled' : 'Light mode enabled');
}

// ============================================
// DATA LOADING
// ============================================

async function loadInitialData() {
  await loadTasks();
  renderInbox();
}

async function refreshAllData() {
  showToast('Refreshing data...');
  const refreshIcon = document.querySelector('#refresh-btn svg');
  refreshIcon.style.animation = 'spin 1s linear infinite';
  
  await Promise.all([
    loadTasks(),
    state.currentTab === 'plan' ? loadDailyPlan() : Promise.resolve(),
    state.currentTab === 'debt' ? loadTimeDebt() : Promise.resolve()
  ]);
  
  refreshIcon.style.animation = '';
  showToast('Data refreshed successfully!');
}

// ============================================
// TASKS API
// ============================================

async function loadTasks() {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks`);
    const data = await response.json();
    
    if (data.success) {
      state.tasks = data.tasks;
      renderTasks();
      updateInboxCount();
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
    showToast('Failed to load tasks', 'error');
  }
}

function renderTasks() {
  const tasksList = document.getElementById('tasks-list');
  
  if (state.tasks.length === 0) {
    tasksList.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2"/>
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="2"/>
        </svg>
        <p>No tasks yet. Create one from an email!</p>
      </div>
    `;
    return;
  }
  
  tasksList.innerHTML = state.tasks.map(task => `
    <div class="task-card" data-id="${task.id}">
      <div class="task-header">
        <h3 class="task-title">${task.title}</h3>
        <span class="priority-badge ${task.priority}">${task.priority}</span>
      </div>
      <p class="task-description">${task.description}</p>
      <div class="task-meta">
        <span class="task-time">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
            <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2"/>
          </svg>
          ${task.estimatedTime} min
        </span>
        <span class="task-date">Due: ${formatDate(task.dueDate)}</span>
      </div>
    </div>
  `).join('');
}

function filterTasks(priority) {
  const allTasks = document.querySelectorAll('.task-card');
  
  allTasks.forEach(card => {
    const taskPriority = card.querySelector('.priority-badge').textContent.toLowerCase();
    
    if (priority === 'all' || taskPriority === priority) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// ============================================
// INBOX RENDERING
// ============================================

function renderInbox() {
  const inboxList = document.getElementById('inbox-list');
  const pendingTasks = state.tasks.filter(t => t.status === 'pending');
  
  if (pendingTasks.length === 0) {
    inboxList.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M3 7L12 13L21 7" stroke="currentColor" stroke-width="2"/>
        </svg>
        <p>Inbox is empty. Great job!</p>
      </div>
    `;
    return;
  }
  
  inboxList.innerHTML = pendingTasks.map(task => `
    <div class="inbox-item" data-id="${task.id}">
      <div class="inbox-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M3 7L12 13L21 7" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
      <div class="inbox-content">
        <div class="inbox-header">
          <span class="inbox-sender">${task.fromEmail}</span>
          <span class="priority-badge ${task.priority}">${task.priority}</span>
        </div>
        <h4 class="inbox-subject">${task.title}</h4>
        <p class="inbox-preview">${task.description.substring(0, 100)}...</p>
      </div>
    </div>
  `).join('');
}

function updateInboxCount() {
  const inboxCount = document.getElementById('inbox-count');
  const pendingCount = state.tasks.filter(t => t.status === 'pending').length;
  inboxCount.textContent = pendingCount;
}

// ============================================
// CRM SEARCH
// ============================================

async function searchCRM(email) {
  const crmContent = document.getElementById('crm-content');
  
  crmContent.innerHTML = `
    <div class="loading-state">
      <div class="loader"></div>
      <p>Searching for ${email}...</p>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_BASE_URL}/crm/${encodeURIComponent(email)}`);
    const data = await response.json();
    
    if (data.success) {
      renderCRMContact(data.contact);
    } else {
      crmContent.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5"/>
            <path d="M6 21V19C6 16.79 7.79 15 10 15H14C16.21 15 18 16.79 18 19V21" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <p>Contact not found</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error searching CRM:', error);
    showToast('Failed to search contact', 'error');
  }
}

function renderCRMContact(contact) {
  const crmContent = document.getElementById('crm-content');
  
  crmContent.innerHTML = `
    <div class="crm-card">
      <div class="crm-header">
        <div class="crm-avatar">
          ${contact.name.charAt(0).toUpperCase()}
        </div>
        <div class="crm-info">
          <h3 class="crm-name">${contact.name}</h3>
          <p class="crm-email">${contact.email}</p>
        </div>
      </div>
      
      <div class="crm-details">
        <div class="crm-detail-item">
          <span class="detail-label">Company</span>
          <span class="detail-value">${contact.company}</span>
        </div>
        <div class="crm-detail-item">
          <span class="detail-label">Position</span>
          <span class="detail-value">${contact.position}</span>
        </div>
        <div class="crm-detail-item">
          <span class="detail-label">Engagement Score</span>
          <span class="detail-value">
            <span class="score-badge">${contact.engagementScore}/100</span>
          </span>
        </div>
        <div class="crm-detail-item">
          <span class="detail-label">Deal Value</span>
          <span class="detail-value">$${contact.dealValue.toLocaleString()}</span>
        </div>
        <div class="crm-detail-item">
          <span class="detail-label">Last Contact</span>
          <span class="detail-value">${formatDate(contact.lastContact)}</span>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// DAILY PLAN
// ============================================

async function loadDailyPlan() {
  const planContent = document.getElementById('plan-content');
  
  try {
    const response = await fetch(`${API_BASE_URL}/ai/plan-day`);
    const data = await response.json();
    
    if (data.success) {
      state.dailyPlan = data.plan;
      renderDailyPlan(data.plan);
    }
  } catch (error) {
    console.error('Error loading daily plan:', error);
    planContent.innerHTML = `
      <div class="empty-state">
        <p>Failed to generate daily plan</p>
      </div>
    `;
  }
}

function renderDailyPlan(plan) {
  const planContent = document.getElementById('plan-content');
  
  planContent.innerHTML = `
    <div class="plan-summary">
      <div class="plan-stat">
        <span class="stat-value">${plan.totalTasks}</span>
        <span class="stat-label">Tasks Today</span>
      </div>
      <div class="plan-stat">
        <span class="stat-value">${Math.round(plan.totalMinutes / 60)}h</span>
        <span class="stat-label">Total Time</span>
      </div>
    </div>
    
    <div class="plan-recommendation">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>${plan.recommendation}</p>
    </div>
    
    <div class="plan-schedule">
      ${plan.schedule.map(item => `
        <div class="schedule-item">
          <div class="schedule-time">${item.startTime}</div>
          <div class="schedule-task">
            <h4>${item.task}</h4>
            <span class="priority-badge ${item.priority}">${item.priority}</span>
            <span class="schedule-duration">${item.duration} min</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================
// TIME DEBT SCORE
// ============================================

async function loadTimeDebt() {
  const debtContent = document.getElementById('debt-content');
  
  try {
    const response = await fetch(`${API_BASE_URL}/ai/time-debt`);
    const data = await response.json();
    
    if (data.success) {
      state.timeDebt = data.timeDebt;
      renderTimeDebt(data.timeDebt);
    }
  } catch (error) {
    console.error('Error loading time debt:', error);
    debtContent.innerHTML = `
      <div class="empty-state">
        <p>Failed to calculate time debt</p>
      </div>
    `;
  }
}

function renderTimeDebt(debt) {
  const debtContent = document.getElementById('debt-content');
  
  const scoreColor = debt.score >= 80 ? 'success' : debt.score >= 60 ? 'warning' : 'danger';
  
  debtContent.innerHTML = `
    <div class="debt-score-container">
      <div class="debt-gauge">
        <svg viewBox="0 0 200 120">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--border)" stroke-width="20"/>
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--accent-${scoreColor === 'success' ? 'blue' : scoreColor === 'warning' ? 'warning' : 'danger'})" stroke-width="20" stroke-dasharray="${(debt.score / 100) * 251.2} 251.2"/>
        </svg>
        <div class="gauge-value">
          <span class="score-number">${debt.score}</span>
          <span class="score-status">${debt.status}</span>
        </div>
      </div>
      
      <div class="debt-stats">
        <div class="debt-stat">
          <span class="stat-label">Pending Tasks</span>
          <span class="stat-value">${debt.totalPendingHours}h</span>
        </div>
        <div class="debt-stat">
          <span class="stat-label">Overdue</span>
          <span class="stat-value ${debt.totalOverdueHours > 0 ? 'text-danger' : ''}">${debt.totalOverdueHours}h</span>
        </div>
      </div>
    </div>
    
    <div class="debt-recommendation">
      <h4>Recommendation</h4>
      <p>${debt.recommendation}</p>
    </div>
    
    <div class="debt-breakdown">
      <h4>Task Breakdown</h4>
      <div class="breakdown-list">
        <div class="breakdown-item">
          <span>Overdue</span>
          <span class="breakdown-count">${debt.breakdown.overdue}</span>
        </div>
        <div class="breakdown-item">
          <span>Due Today</span>
          <span class="breakdown-count">${debt.breakdown.dueToday}</span>
        </div>
        <div class="breakdown-item">
          <span>Due This Week</span>
          <span class="breakdown-count">${debt.breakdown.dueThisWeek}</span>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((date - now) / (1000 * 60 * 60 * 24));
  
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function updatePlanDate() {
  const planDate = document.getElementById('plan-date');
  const today = new Date();
  planDate.textContent = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);

}
