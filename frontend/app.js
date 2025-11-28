/* ============================================
   AI Code Executor - Utilities
   ============================================ */

/**
 * DOM helper - querySelector shorthand
 */
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format file size
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format duration
 */
function formatDuration(seconds) {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(0);
  return `${mins}m ${secs}s`;
}

/**
 * Format relative time
 */
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

/**
 * Format date
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Debounce function
 */
function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
function throttle(fn, delay = 100) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Sleep/delay helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get file extension
 */
function getFileExtension(filename) {
  return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
}

/**
 * Get file icon based on extension
 */
function getFileIcon(filename, isDirectory = false) {
  if (isDirectory) return '📁';
  
  const ext = getFileExtension(filename);
  const icons = {
    py: '🐍',
    js: '📜',
    ts: '📘',
    html: '🌐',
    css: '🎨',
    json: '📋',
    txt: '📄',
    md: '📝',
    sh: '⚙️',
    yml: '⚙️',
    yaml: '⚙️',
    xml: '📋',
    csv: '📊',
    sql: '🗄️',
    zip: '📦',
    tar: '📦',
    gz: '📦',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    pdf: '📕',
    doc: '📘',
    docx: '📘'
  };
  
  return icons[ext] || '📄';
}

/**
 * Get language from file extension
 */
function getLanguageFromExtension(ext) {
  const languages = {
    py: 'python',
    js: 'javascript',
    ts: 'typescript',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    sh: 'bash',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml',
    sql: 'sql'
  };
  return languages[ext] || 'plaintext';
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * Download content as file
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Scroll element to bottom
 */
function scrollToBottom(element, smooth = true) {
  if (!element) return;
  
  const behavior = smooth ? 'smooth' : 'auto';
  
  // On mobile, scroll the body
  if (window.innerWidth <= 768) {
    window.scrollTo({ top: document.body.scrollHeight, behavior });
  } else {
    element.scrollTo({ top: element.scrollHeight, behavior });
  }
}

/**
 * Check if element is scrolled to bottom
 */
function isScrolledToBottom(element, threshold = 100) {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
}

/**
 * Local storage helpers
 */
const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  remove(key) {
    localStorage.removeItem(key);
  }
};

/**
 * Create DOM element from HTML string
 */
function createElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

/**
 * Toggle class on element
 */
function toggleClass(element, className, force) {
  if (!element) return;
  element.classList.toggle(className, force);
}

/**
 * Add event listener with cleanup
 */
function on(element, event, handler, options) {
  if (!element) return () => {};
  element.addEventListener(event, handler, options);
  return () => element.removeEventListener(event, handler, options);
}

/**
 * Event delegation helper
 */
function delegate(element, selector, event, handler) {
  if (!element) return () => {};
  
  const delegatedHandler = (e) => {
    const target = e.target.closest(selector);
    if (target && element.contains(target)) {
      handler.call(target, e, target);
    }
  };
  
  element.addEventListener(event, delegatedHandler);
  return () => element.removeEventListener(event, delegatedHandler);
}

/**
 * Simple event emitter
 */
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, handler) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(handler);
    return () => this.off(event, handler);
  }
  
  off(event, handler) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(h => h !== handler);
  }
  
  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(handler => handler(...args));
  }
}

/**
 * Extract code blocks from markdown
 */
function extractCodeBlocks(text) {
  const pattern = /```(\w+)\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    blocks.push({
      language: match[1],
      code: match[2]
    });
  }
  
  return blocks;
}

/**
 * Configure marked.js
 */
function configureMarked() {
  marked.setOptions({
    highlight: (code, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
  });
}

// Initialize marked configuration
if (typeof marked !== 'undefined') {
  configureMarked();
}

/**
 * Generate unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Clamp number between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Export for use
window.utils = {
  $,
  $$,
  escapeHtml,
  formatBytes,
  formatDuration,
  formatTimeAgo,
  formatDate,
  debounce,
  throttle,
  sleep,
  getFileExtension,
  getFileIcon,
  getLanguageFromExtension,
  copyToClipboard,
  downloadFile,
  scrollToBottom,
  isScrolledToBottom,
  storage,
  createElement,
  toggleClass,
  on,
  delegate,
  EventEmitter,
  extractCodeBlocks,
  generateId,
  clamp
};
/* ============================================
   AI Code Executor - State Management
   ============================================ */

/**
 * Application state with reactive updates
 */
const State = {
  // Current state
  data: {
    // Conversations
    conversations: [],
    currentConversationId: null,
    currentConversation: null,
    
    // UI State
    isProcessing: false,
    isSidebarOpen: false,
    activePanel: null, // 'files', 'stats', null
    
    // Models
    providers: [],
    currentProvider: 'anthropic',
    currentModel: 'claude-sonnet-4-20250514',
    ollamaModels: [],
    lmstudioModels: [],
    
    // Settings
    settings: {
      dockerCpus: '2',
      dockerMemory: '8g',
      dockerStorage: '10g',
      dockerTimeout: '30',
      voiceEnabled: true,
      viewMode: 'auto',
      autoFixPrompt: ''
    },
    
    // Voice
    isRecording: false,
    isTranscribing: false,
    
    // Abort controller for stopping generation
    abortController: null
  },
  
  // Listeners for state changes
  listeners: new Map(),
  
  /**
   * Get state value
   */
  get(key) {
    return key ? this.data[key] : this.data;
  },
  
  /**
   * Set state value and notify listeners
   */
  set(key, value) {
    const oldValue = this.data[key];
    this.data[key] = value;
    
    // Notify listeners
    this.notify(key, value, oldValue);
    
    return value;
  },
  
  /**
   * Update nested state
   */
  update(key, updates) {
    const current = this.data[key] || {};
    const newValue = { ...current, ...updates };
    return this.set(key, newValue);
  },
  
  /**
   * Subscribe to state changes
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(callback);
      }
    };
  },
  
  /**
   * Notify listeners of state change
   */
  notify(key, newValue, oldValue) {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error('State listener error:', error);
        }
      });
    }
    
    // Also notify global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(callback => {
        try {
          callback(key, newValue, oldValue);
        } catch (error) {
          console.error('Global state listener error:', error);
        }
      });
    }
  },
  
  /**
   * Reset to initial state
   */
  reset() {
    this.data = {
      conversations: [],
      currentConversationId: null,
      currentConversation: null,
      isProcessing: false,
      isSidebarOpen: false,
      activePanel: null,
      providers: [],
      currentProvider: 'anthropic',
      currentModel: 'claude-sonnet-4-20250514',
      ollamaModels: [],
      lmstudioModels: [],
      settings: {
        dockerCpus: '2',
        dockerMemory: '8g',
        dockerStorage: '10g',
        dockerTimeout: '30',
        voiceEnabled: true,
        viewMode: 'auto',
        autoFixPrompt: ''
      },
      isRecording: false,
      isTranscribing: false,
      abortController: null
    };
  }
};

/**
 * Provider models configuration
 */
const ProviderModels = {
  anthropic: {
    name: 'Anthropic (Claude)',
    icon: '🤖',
    models: {
      'claude-sonnet-4-20250514': 'Claude Sonnet 4',
      'claude-opus-4-20250514': 'Claude Opus 4',
      'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
      'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku'
    },
    default: 'claude-sonnet-4-20250514'
  },
  openai: {
    name: 'OpenAI (GPT)',
    icon: '🧠',
    models: {
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4': 'GPT-4',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo'
    },
    default: 'gpt-4-turbo'
  },
  gemini: {
    name: 'Google (Gemini)',
    icon: '✨',
    models: {
      'gemini-pro': 'Gemini Pro',
      'gemini-pro-vision': 'Gemini Pro Vision'
    },
    default: 'gemini-pro'
  },
  ollama: {
    name: 'Local (Ollama)',
    icon: '🏠',
    models: {},
    default: null
  },
  lmstudio: {
    name: 'LM Studio',
    icon: '💻',
    models: {},
    default: null
  }
};

/**
 * Get display name for model
 */
function getModelDisplayName(modelId) {
  for (const provider of Object.values(ProviderModels)) {
    if (provider.models[modelId]) {
      return provider.models[modelId];
    }
  }
  
  // Handle Ollama models
  if (modelId.startsWith('ollama:')) {
    return modelId.replace('ollama:', '').replace(':latest', '');
  }
  
  // Handle LM Studio models
  if (modelId.startsWith('lmstudio:')) {
    return modelId.replace('lmstudio:', '');
  }
  
  return modelId;
}

/**
 * Get provider for model
 */
function getProviderForModel(modelId) {
  if (modelId.startsWith('claude-')) return 'anthropic';
  if (modelId.startsWith('gpt-')) return 'openai';
  if (modelId.startsWith('gemini-')) return 'gemini';
  if (modelId.startsWith('ollama:')) return 'ollama';
  if (modelId.startsWith('lmstudio:')) return 'lmstudio';
  return 'anthropic';
}

// Export for global use
window.State = State;
window.ProviderModels = ProviderModels;
window.getModelDisplayName = getModelDisplayName;
window.getProviderForModel = getProviderForModel;
/* ============================================
   AI Code Executor - API Module
   ============================================ */

const API = {
  baseUrl: '',
  
  /**
   * Generic fetch wrapper with error handling
   */
  async request(endpoint, options = {}) {
    const url = this.baseUrl + endpoint;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };
    
    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },
  
  // -------------------------
  // Conversations
  // -------------------------
  
  async getConversations() {
    return this.request('/api/conversations');
  },
  
  async getConversation(id) {
    return this.request(`/api/conversations/${id}`);
  },
  
  async createConversation(data = {}) {
    return this.request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title || 'New Conversation',
        model: data.model || 'claude-sonnet-4-20250514'
      })
    });
  },
  
  async updateConversation(id, data) {
    return this.request(`/api/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  
  async renameConversation(id, title) {
    return this.request(`/api/conversations/${id}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ title })
    });
  },
  
  async deleteConversation(id) {
    return this.request(`/api/conversations/${id}`, {
      method: 'DELETE'
    });
  },
  
  // -------------------------
  // Messages (Streaming)
  // -------------------------
  
  async *streamMessage(data, signal) {
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data;
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
  
  // -------------------------
  // Providers & Models
  // -------------------------
  
  async getProviders() {
    return this.request('/api/providers');
  },
  
  async getModels() {
    return this.request('/api/models');
  },
  
  async getOllamaModels() {
    return this.request('/api/models/ollama');
  },
  
  async getLmstudioModels() {
    return this.request('/api/models/lmstudio');
  },
  
  // -------------------------
  // Files
  // -------------------------
  
  async getConversationFiles(conversationId) {
    return this.request(`/api/conversations/${conversationId}/files`);
  },
  
  async getFileContent(conversationId, filePath) {
    return this.request(`/api/conversations/${conversationId}/files/${encodeURIComponent(filePath)}`);
  },
  
  async uploadFile(conversationId, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request(`/api/conversations/${conversationId}/upload`, {
      method: 'POST',
      body: formData
    });
  },
  
  async downloadFile(fileId) {
    return this.request(`/api/files/${fileId}`);
  },
  
  async downloadAllFiles(conversationId) {
    const response = await fetch(`/api/conversations/${conversationId}/download-all-files`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No files found');
      }
      throw new Error('Download failed');
    }
    return response.blob();
  },
  
  async downloadExecutionCode(executionId) {
    return fetch(`/api/executions/${executionId}/code`).then(r => r.blob());
  },
  
  async downloadExecutionOutput(executionId) {
    return fetch(`/api/executions/${executionId}/output`).then(r => r.blob());
  },
  
  // -------------------------
  // Settings
  // -------------------------
  
  async getSettings() {
    return this.request('/api/settings');
  },
  
  async updateSettings(settings) {
    return this.request('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  },
  
  // -------------------------
  // Containers
  // -------------------------
  
  async getContainers() {
    return this.request('/api/containers');
  },
  
  async getConversationContainer(conversationId) {
    return this.request(`/api/conversations/${conversationId}/container`);
  },
  
  async getContainerStats(conversationId) {
    return this.request(`/api/conversations/${conversationId}/stats`);
  },
  
  async stopContainer(containerId) {
    return this.request(`/api/containers/${containerId}`, {
      method: 'DELETE'
    });
  },
  
  async cleanupContainers() {
    return this.request('/api/containers/cleanup', {
      method: 'POST'
    });
  },
  
  // -------------------------
  // Docker Images Export
  // -------------------------
  
  async exportContainer(conversationId) {
    return this.request(`/api/conversations/${conversationId}/export-container`, {
      method: 'POST'
    });
  },
  
  async listDockerImages() {
    return this.request('/api/docker-images');
  },
  
  async deleteDockerImage(filename) {
    return this.request(`/api/docker-images/${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    });
  },
  
  getDockerImageDownloadUrl(filename) {
    return `/api/docker-images/${encodeURIComponent(filename)}/download`;
  },

  // -------------------------
  // Stats (SSE)
  // -------------------------
  
  createStatsStream(conversationId) {
    return new EventSource(`/api/stats/${conversationId}`);
  },
  
  async getExecutionHistory(conversationId) {
    return this.request(`/api/execution-history/${conversationId}`);
  },
  
  // -------------------------
  // Voice / Whisper
  // -------------------------
  
  async transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    return this.request('/api/transcribe', {
      method: 'POST',
      body: formData
    });
  },
  
  async getWhisperStatus() {
    return this.request('/api/whisper/status');
  },
  
  // -------------------------
  // WebSocket for Terminal
  // -------------------------
  
  createTerminalSocket(conversationId) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return new WebSocket(`${protocol}//${window.location.host}/ws/terminal/${conversationId}`);
  }
};

// Export for global use
window.API = API;
/* ============================================
   AI Code Executor - Sidebar Component
   ============================================ */

const Sidebar = {
  elements: {},
  
  /**
   * Initialize sidebar
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadConversations();
    
    // Subscribe to state changes
    State.subscribe('conversations', () => this.render());
    State.subscribe('currentConversationId', () => this.updateActiveItem());
    State.subscribe('isSidebarOpen', (isOpen) => this.toggleMobile(isOpen));
  },
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      sidebar: $('#sidebar'),
      overlay: $('#sidebarOverlay'),
      convList: $('#convList'),
      newChatBtn: $('#newChatBtn'),
      deleteChatBtn: $('#deleteChatBtn'),
      closeBtn: $('#closeSidebarBtn'),
      menuBtn: $('#menuBtn')
    };
  },
  
  /**
   * Bind events
   */
  bindEvents() {
    const { newChatBtn, deleteChatBtn, closeBtn, menuBtn, convList, overlay } = this.elements;
    
    // New chat
    newChatBtn?.addEventListener('click', () => this.createNewChat());
    
    // Delete chat
    deleteChatBtn?.addEventListener('click', () => this.deleteCurrentChat());
    
    // Mobile toggle
    menuBtn?.addEventListener('click', () => this.toggleMobile(true));
    closeBtn?.addEventListener('click', () => this.toggleMobile(false));
    
    // Close sidebar when clicking overlay
    overlay?.addEventListener('click', () => this.toggleMobile(false));
    
    // Conversation clicks (event delegation)
    utils.delegate(convList, '.conv-item', 'click', (e, item) => {
      const id = parseInt(item.dataset.id);
      if (id) this.selectConversation(id);
    });
    
    // Rename button
    utils.delegate(convList, '.conv-item__rename', 'click', (e, btn) => {
      e.stopPropagation();
      const id = parseInt(btn.closest('.conv-item').dataset.id);
      if (id) this.renameConversation(id);
    });
    
    // Export container button
    utils.delegate(convList, '.conv-item__export', 'click', (e, btn) => {
      e.stopPropagation();
      const item = btn.closest('.conv-item');
      const id = parseInt(item.dataset.id);
      const title = item.querySelector('.conv-item__title')?.textContent || '';
      if (id) DockerImages.showExportConfirmation(id, title);
    });
  },
  
  /**
   * Load conversations from API
   */
  async loadConversations() {
    try {
      const conversations = await API.getConversations();
      State.set('conversations', conversations);
      
      // Auto-select first conversation if none selected
      if (!State.get('currentConversationId') && conversations.length > 0) {
        await this.selectConversation(conversations[0].id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      Toast.error('Failed to load conversations');
    }
  },
  
  /**
   * Render conversation list
   */
  render() {
    const conversations = State.get('conversations');
    const currentId = State.get('currentConversationId');
    
    if (!this.elements.convList) return;
    
    if (conversations.length === 0) {
      this.elements.convList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">💬</div>
          <div class="empty-state__title">No conversations</div>
          <div class="empty-state__text">Start a new chat to begin</div>
        </div>
      `;
      return;
    }
    
    this.elements.convList.innerHTML = conversations.map(conv => `
      <div class="conv-item ${conv.id === currentId ? 'is-active' : ''}" data-id="${conv.id}">
        <div class="conv-item__id">#${conv.id}</div>
        <div class="conv-item__content">
          <div class="conv-item__title">${utils.escapeHtml(conv.title)}</div>
          <div class="conv-item__meta">
            ${getModelDisplayName(conv.model)} • ${utils.formatTimeAgo(conv.created_at)}
          </div>
        </div>
        <div class="conv-item__actions">
          <button class="btn-icon btn-icon--sm btn--ghost conv-item__export" title="Export Container">🐳</button>
          <button class="btn-icon btn-icon--sm btn--ghost conv-item__rename" title="Rename">✏️</button>
        </div>
      </div>
    `).join('');
  },
  
  /**
   * Update active conversation highlight
   */
  updateActiveItem() {
    const currentId = State.get('currentConversationId');
    
    $$('.conv-item').forEach(item => {
      const isActive = parseInt(item.dataset.id) === currentId;
      item.classList.toggle('is-active', isActive);
    });
    
    // Show/hide delete button
    if (this.elements.deleteChatBtn) {
      this.elements.deleteChatBtn.style.display = currentId ? 'flex' : 'none';
    }
  },
  
  /**
   * Select a conversation
   */
  async selectConversation(id) {
    try {
      const conversation = await API.getConversation(id);
      
      State.set('currentConversationId', id);
      State.set('currentConversation', conversation);
      
      // Update header (model selector, auto-fix toggle)
      Header.setFromConversation(conversation);
      
      // Render chat
      Chat.renderConversation(conversation);
      
      // Update sidebar selection
      this.render();
      
      // Close mobile sidebar
      this.toggleMobile(false);
      
      // Show terminal button
      const terminalBtn = $('#terminalBtn');
      if (terminalBtn) terminalBtn.style.display = 'flex';
      
      // Emit event
      window.dispatchEvent(new CustomEvent('conversationLoaded', { 
        detail: { conversationId: id }
      }));
      
    } catch (error) {
      console.error('Failed to load conversation:', error);
      Toast.error('Failed to load conversation');
    }
  },
  
  /**
   * Create new conversation
   */
  async createNewChat() {
    try {
      const model = State.get('currentModel') || 'claude-sonnet-4-20250514';
      console.log('[createNewChat] Creating with model:', model);
      
      const conversation = await API.createConversation({ model });
      console.log('[createNewChat] Created conversation:', conversation);
      
      if (!conversation || !conversation.id) {
        throw new Error('Invalid conversation response');
      }
      
      // Add to list
      const conversations = [conversation, ...State.get('conversations')];
      State.set('conversations', conversations);
      
      // Select it
      State.set('currentConversationId', conversation.id);
      State.set('currentConversation', conversation);
      
      // Reset auto-fix toggle (always off for new chats)
      Header.resetAutoFixToggle();
      
      // Clear chat and show welcome (renderConversation fully clears everything)
      Chat.renderConversation({ messages: [] });
      
      // Update sidebar list
      this.render();
      
      // Close mobile sidebar
      this.toggleMobile(false);
      
      // Show terminal button
      const terminalBtn = $('#terminalBtn');
      if (terminalBtn) terminalBtn.style.display = 'flex';
      
      // Emit event
      window.dispatchEvent(new CustomEvent('conversationLoaded', { 
        detail: { conversationId: conversation.id }
      }));
      
      console.log('[createNewChat] Success');
      
    } catch (error) {
      console.error('Failed to create conversation:', error);
      Toast.error('Failed to create conversation');
    }
  },
  
  /**
   * Delete current conversation
   */
  async deleteCurrentChat() {
    const id = State.get('currentConversationId');
    if (!id) return;
    
    if (!confirm('Delete this conversation? This cannot be undone.')) {
      return;
    }
    
    try {
      console.log('[deleteCurrentChat] Deleting conversation:', id);
      
      await API.deleteConversation(id);
      console.log('[deleteCurrentChat] API call successful');
      
      // Remove from list
      const conversations = State.get('conversations').filter(c => c.id !== id);
      State.set('conversations', conversations);
      
      // Clear current
      State.set('currentConversationId', null);
      State.set('currentConversation', null);
      
      // Update sidebar list
      this.render();
      
      // Show welcome or select another
      if (conversations.length > 0) {
        await this.selectConversation(conversations[0].id);
      } else {
        // No conversations left - fully clear chat area
        Chat.renderConversation({ messages: [] });
      }
      
      Toast.success('Conversation deleted');
      console.log('[deleteCurrentChat] Success');
      
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      Toast.error('Failed to delete conversation');
    }
  },
  
  /**
   * Rename conversation
   */
  async renameConversation(id) {
    const conv = State.get('conversations').find(c => c.id === id);
    if (!conv) return;
    
    const newTitle = prompt('Enter new title:', conv.title);
    if (!newTitle || newTitle.trim() === '' || newTitle === conv.title) return;
    
    try {
      await API.renameConversation(id, newTitle.trim());
      
      // Update in list
      const conversations = State.get('conversations').map(c => 
        c.id === id ? { ...c, title: newTitle.trim() } : c
      );
      State.set('conversations', conversations);
      
      Toast.success('Conversation renamed');
      
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      Toast.error('Failed to rename conversation');
    }
  },
  
  /**
   * Toggle mobile sidebar
   */
  toggleMobile(show) {
    State.set('isSidebarOpen', show);
    
    const { sidebar, overlay } = this.elements;
    
    if (sidebar) {
      sidebar.classList.toggle('is-open', show);
    }
    
    if (overlay) {
      overlay.classList.toggle('is-visible', show);
    }
    
    // Lock body scroll when open
    document.body.style.overflow = show ? 'hidden' : '';
  }
};

// Export
window.Sidebar = Sidebar;
/* ============================================
   AI Code Executor - Header Component
   ============================================ */

const Header = {
  elements: {},
  ollamaModels: [],
  lmstudioModels: [],
  
  /**
   * Initialize header
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    
    // Show terminal button
    if (this.elements.terminalBtn) {
      this.elements.terminalBtn.style.display = 'flex';
    }
    
    // Ensure auto-fix toggle starts OFF
    this.resetAutoFixToggle();
    
    // Initialize model selector with default provider
    this.onProviderChange('anthropic');
    
    // Try to load Ollama models in background
    this.loadOllamaModels();
    
    // Try to load LM Studio models in background
    this.loadLmstudioModels();
    
    // Check whisper status
    this.checkWhisperStatus();
  },
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      providerSelect: document.getElementById('providerSelect'),
      modelSelect: document.getElementById('modelSelect'),
      autoFixToggle: document.getElementById('autoFixInput'),
      whisperStatus: document.getElementById('whisperStatus'),
      filesBtn: document.getElementById('filesBtn'),
      statsBtn: document.getElementById('statsBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      terminalBtn: document.getElementById('terminalBtn')
    };
  },
  
  /**
   * Bind events
   */
  bindEvents() {
    const { providerSelect, modelSelect, autoFixToggle, filesBtn, statsBtn, settingsBtn, terminalBtn } = this.elements;
    
    // Provider change
    if (providerSelect) {
      providerSelect.addEventListener('change', (e) => {
        this.onProviderChange(e.target.value);
      });
    }
    
    // Model change
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        this.onModelChange(e.target.value);
      });
    }
    
    // Auto-fix toggle - per conversation, updates backend
    if (autoFixToggle) {
      autoFixToggle.addEventListener('change', async (e) => {
        const currentConvId = State.get('currentConversationId');
        if (currentConvId) {
          try {
            // Update backend - this is what triggers auto-fix in the backend!
            await API.updateConversation(currentConvId, { auto_fix_enabled: e.target.checked });
            console.log('Auto-fix toggled for conv', currentConvId, ':', e.target.checked);
            Toast.success(`Auto-fix ${e.target.checked ? 'enabled' : 'disabled'}`);
          } catch (error) {
            console.error('Failed to update auto-fix:', error);
            Toast.error('Failed to update auto-fix setting');
            // Revert toggle on error
            e.target.checked = !e.target.checked;
          }
        } else {
          // No conversation yet, just prevent it from staying on
          e.target.checked = false;
          Toast.info('Create or select a conversation first');
        }
      });
    } else {
      console.warn('Auto-fix toggle element not found!');
    }
    
    // Panel buttons
    filesBtn?.addEventListener('click', () => Files.toggle());
    statsBtn?.addEventListener('click', () => Stats.toggle());
    settingsBtn?.addEventListener('click', () => Settings.show());
    terminalBtn?.addEventListener('click', () => Terminal.toggle());
  },
  
  /**
   * Handle provider change
   */
  onProviderChange(provider) {
    const { providerSelect, modelSelect } = this.elements;
    
    // Update provider select
    if (providerSelect) {
      providerSelect.value = provider;
    }
    
    // Update state
    State.set('currentProvider', provider);
    
    // Clear model select
    if (!modelSelect) return;
    modelSelect.innerHTML = '';
    
    // Get models for provider
    const models = this.getModelsForProvider(provider);
    
    if (models.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = (provider === 'ollama' || provider === 'lmstudio') ? 'Loading models...' : 'No models available';
      modelSelect.appendChild(option);
      return;
    }
    
    // Add options
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      modelSelect.appendChild(option);
    });
    
    // Select first model
    const firstModel = models[0].id;
    modelSelect.value = firstModel;
    State.set('currentModel', firstModel);
    
    // Update conversation if exists
    this.updateConversationModel();
  },
  
  /**
   * Handle model change
   */
  onModelChange(modelId) {
    State.set('currentModel', modelId);
    this.updateConversationModel();
  },
  
  /**
   * Get models for a provider
   */
  getModelsForProvider(provider) {
    switch (provider) {
      case 'anthropic':
        return [
          { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
          { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
        ];
      
      case 'openai':
        return [
          { id: 'gpt-5.1', name: 'GPT-5.1' },
          { id: 'gpt-5', name: 'GPT-5' },
          { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
          { id: 'gpt-4.1', name: 'GPT-4.1' },
          { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
          { id: 'gpt-4o', name: 'GPT-4o' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
        ];
      
      case 'gemini':
        return [
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
          { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
        ];
      
      case 'ollama':
        return this.ollamaModels.map(m => {
          // Handle both string and object formats
          const modelName = typeof m === 'string' ? m : m.name;
          return {
            id: `ollama:${modelName}`,
            name: modelName.replace(':latest', '')
          };
        });
      
      case 'lmstudio':
        return this.lmstudioModels.map(m => {
          // Handle both string and object formats
          const modelName = typeof m === 'string' ? m : (m.id || m.name);
          return {
            id: `lmstudio:${modelName}`,
            name: modelName
          };
        });
      
      default:
        return [];
    }
  },
  
  /**
   * Load Ollama models from API
   */
  async loadOllamaModels() {
    try {
      const response = await API.getOllamaModels();
      
      // Handle different response formats
      if (Array.isArray(response)) {
        this.ollamaModels = response;
      } else if (response && response.models) {
        this.ollamaModels = response.models;
      } else {
        this.ollamaModels = [];
      }
      
      console.log('Ollama models loaded:', this.ollamaModels.length);
      
      // If currently on Ollama, refresh the dropdown
      if (State.get('currentProvider') === 'ollama') {
        this.onProviderChange('ollama');
      }
      
    } catch (error) {
      console.warn('Ollama not available:', error.message);
      this.ollamaModels = [];
    }
  },
  
  /**
   * Load LM Studio models from API
   */
  async loadLmstudioModels() {
    try {
      const response = await API.getLmstudioModels();
      
      // Handle different response formats
      if (Array.isArray(response)) {
        this.lmstudioModels = response;
      } else if (response && response.models) {
        this.lmstudioModels = response.models;
      } else {
        this.lmstudioModels = [];
      }
      
      console.log('LM Studio models loaded:', this.lmstudioModels.length);
      
      // If currently on LM Studio, refresh the dropdown
      if (State.get('currentProvider') === 'lmstudio') {
        this.onProviderChange('lmstudio');
      }
      
    } catch (error) {
      console.warn('LM Studio not available:', error.message);
      this.lmstudioModels = [];
    }
  },
  
  /**
   * Update conversation model in backend
   */
  async updateConversationModel() {
    const conversationId = State.get('currentConversationId');
    const model = State.get('currentModel');
    
    if (!conversationId || !model) return;
    
    try {
      await API.updateConversation(conversationId, { model });
      
      // Update in local state
      const conversations = State.get('conversations').map(c =>
        c.id === conversationId ? { ...c, model } : c
      );
      State.set('conversations', conversations);
      
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  },
  
  /**
   * Set provider and model from conversation
   */
  setFromConversation(conversation) {
    if (!conversation?.model) return;
    
    const model = conversation.model;
    let provider = 'anthropic';
    
    // Detect provider from model ID
    if (model.startsWith('gpt-')) {
      provider = 'openai';
    } else if (model.startsWith('gemini-')) {
      provider = 'gemini';
    } else if (model.startsWith('ollama:')) {
      provider = 'ollama';
    } else if (model.startsWith('lmstudio:')) {
      provider = 'lmstudio';
    }
    
    // Set provider (this populates models)
    this.onProviderChange(provider);
    
    // Set specific model
    const { modelSelect } = this.elements;
    if (modelSelect) {
      modelSelect.value = model;
      State.set('currentModel', model);
    }
    
    // Set auto-fix toggle from conversation's backend state
    this.updateAutoFixToggle(conversation.auto_fix_enabled);
  },
  
  /**
   * Update auto-fix toggle state
   */
  updateAutoFixToggle(isEnabled) {
    const { autoFixToggle } = this.elements;
    if (!autoFixToggle) return;
    
    // isEnabled comes from conversation.auto_fix_enabled (from backend)
    autoFixToggle.checked = !!isEnabled;
    console.log('Auto-fix updated:', !!isEnabled);
  },
  
  /**
   * Reset auto-fix toggle for new conversation (always off)
   */
  resetAutoFixToggle() {
    const { autoFixToggle } = this.elements;
    if (autoFixToggle) {
      autoFixToggle.checked = false;
    }
  },
  
  /**
   * Check whisper GPU status
   */
  async checkWhisperStatus() {
    const { whisperStatus } = this.elements;
    if (!whisperStatus) return;
    
    try {
      const status = await API.getWhisperStatus();
      
      if (status && status.available) {
        whisperStatus.style.display = 'flex';
        const label = whisperStatus.querySelector('span:last-child');
        if (label) label.textContent = status.gpu ? 'GPU' : 'CPU';
        whisperStatus.classList.toggle('badge--success', status.gpu);
        whisperStatus.classList.toggle('badge--warning', !status.gpu);
      } else {
        whisperStatus.style.display = 'none';
      }
    } catch (error) {
      whisperStatus.style.display = 'none';
    }
  }
};

// Export
window.Header = Header;
/* ============================================
   AI Code Executor - Chat Component
   ============================================ */

const Chat = {
  elements: {},
  autoScroll: true,
  
  /**
   * Initialize chat
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.setupAutoResize();
    
    // Subscribe to state changes
    State.subscribe('isProcessing', (isProcessing) => this.updateProcessingState(isProcessing));
  },
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      container: $('#messagesContainer'),
      welcome: $('#welcomeMessage'),
      input: $('#messageInput'),
      sendBtn: $('#sendBtn'),
      stopBtn: $('#stopBtn'),
      micBtn: $('#micBtn')
    };
  },
  
  /**
   * Bind events
   */
  bindEvents() {
    const { input, sendBtn, stopBtn, container } = this.elements;
    
    // Send message
    sendBtn?.addEventListener('click', () => this.sendMessage());
    
    // Stop generation
    stopBtn?.addEventListener('click', () => this.stopGeneration());
    
    // Enter to send (Shift+Enter for newline)
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Track scroll for auto-scroll
    container?.addEventListener('scroll', utils.throttle(() => {
      this.autoScroll = utils.isScrolledToBottom(container);
    }, 100));
    
    // Copy code button (event delegation)
    utils.delegate(container, '.code-block__copy', 'click', (e, btn) => {
      const codeBlock = btn.closest('.code-block');
      const code = codeBlock?.querySelector('code')?.textContent;
      if (code) {
        utils.copyToClipboard(code);
        btn.textContent = '✓';
        setTimeout(() => btn.textContent = '📋', 1500);
      }
    });
    
    // Execution toggle
    utils.delegate(container, '.execution__toggle', 'click', (e, btn) => {
      const execution = btn.closest('.execution');
      execution?.classList.toggle('is-collapsed');
      btn.textContent = execution?.classList.contains('is-collapsed') ? '▶' : '▼';
    });
  },
  
  /**
   * Setup auto-resize for textarea
   */
  setupAutoResize() {
    const { input } = this.elements;
    if (!input) return;
    
    const resize = () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    };
    
    input.addEventListener('input', resize);
  },
  
  /**
   * Show welcome screen
   */
  showWelcome() {
    if (this.elements.welcome) {
      this.elements.welcome.style.display = 'flex';
    }
    
    // Clear ALL chat content (messages, executions, feedback, status, etc.)
    const elementsToRemove = this.elements.container?.querySelectorAll(
      '.message, .execution, .console-block, .feedback-message, .auto-fix-prompt, .container-status, .auto-fix-status, .execution-indicator'
    );
    elementsToRemove?.forEach(el => el.remove());
  },
  
  /**
   * Hide welcome screen
   */
  hideWelcome() {
    if (this.elements.welcome) {
      this.elements.welcome.style.display = 'none';
    }
  },
  
  /**
   * Render full conversation
   */
  renderConversation(conversation) {
    const { container } = this.elements;
    if (!container) return;
    
    // Clear existing
    container.innerHTML = '';
    
    // Add welcome back
    container.innerHTML = `
      <div class="welcome" id="welcomeMessage" style="display: none;">
        <h1 class="welcome__title">AI Code Executor</h1>
        <p class="welcome__subtitle">Execute code with AI assistance in Docker containers</p>
        <div class="welcome__features">
          <div class="welcome__feature">
            <span class="welcome__feature-icon">🐍</span>
            <div>
              <div class="welcome__feature-title">Multi-Language</div>
              <div class="welcome__feature-text">Python, JavaScript, Bash</div>
            </div>
          </div>
          <div class="welcome__feature">
            <span class="welcome__feature-icon">🐳</span>
            <div>
              <div class="welcome__feature-title">Isolated</div>
              <div class="welcome__feature-text">Docker containers per chat</div>
            </div>
          </div>
          <div class="welcome__feature">
            <span class="welcome__feature-icon">⚡</span>
            <div>
              <div class="welcome__feature-title">Powerful</div>
              <div class="welcome__feature-text">2 CPU cores, 8GB RAM</div>
            </div>
          </div>
          <div class="welcome__feature">
            <span class="welcome__feature-icon">🌐</span>
            <div>
              <div class="welcome__feature-title">Connected</div>
              <div class="welcome__feature-text">Internet access enabled</div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.elements.welcome = $('#welcomeMessage');
    
    // Render messages
    if (conversation.messages && conversation.messages.length > 0) {
      this.hideWelcome();
      
      conversation.messages.forEach(msg => {
        this.appendMessage(msg.role, msg.content, msg.id);
        
        // Render execution logs (feedback messages like "🐳 Creating Docker container...") before executions
        if (msg.execution_logs && msg.execution_logs.length > 0) {
          msg.execution_logs.forEach(log => {
            this.appendFeedback(log.message, log.level);
          });
        }
        
        // Render associated executions
        if (msg.executions) {
          msg.executions.forEach(exec => {
            this.appendExecution(exec);
          });
        }
      });
      
      // Scroll to bottom
      utils.scrollToBottom(container, false);
    } else {
      this.showWelcome();
    }
  },
  
  /**
   * Append a message to chat
   */
  appendMessage(role, content, id = null) {
    const { container } = this.elements;
    if (!container) return null;
    
    this.hideWelcome();
    
    const messageId = id || `msg-${Date.now()}`;
    const isUser = role === 'user';
    
    // Get current model for assistant messages
    let roleLabel = 'You';
    if (!isUser) {
      const currentModel = State.get('currentModel') || 'Assistant';
      roleLabel = getModelDisplayName(currentModel);
    }
    
    const messageEl = utils.createElement(`
      <div class="message message--${role}" data-id="${messageId}">
        <div class="message__avatar">${isUser ? '👤' : '🤖'}</div>
        <div class="message__body">
          <div class="message__header">
            <span class="message__role">${roleLabel}</span>
          </div>
          <div class="message__content">${isUser ? utils.escapeHtml(content) : this.renderMarkdown(content)}</div>
        </div>
      </div>
    `);
    
    container.appendChild(messageEl);
    
    // Always scroll on mobile
    this.scrollToLatest();
    
    return messageEl;
  },
  
  /**
   * Scroll to latest message
   */
  scrollToLatest() {
    const { container } = this.elements;
    if (!container) return;
    
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  },
  
  /**
   * Update message content (for streaming)
   */
  updateMessage(messageEl, content) {
    if (!messageEl) return;
    
    const contentEl = messageEl.querySelector('.message__content');
    if (contentEl) {
      contentEl.innerHTML = this.renderMarkdown(content);
    }
    
    // Always scroll during streaming
    this.scrollToLatest();
  },
  
  /**
   * Show container status
   */
  showContainerStatus(message, status = 'starting') {
    const { container } = this.elements;
    if (!container) return;
    
    // Remove existing
    container.querySelector('.container-status')?.remove();
    
    const statusEl = utils.createElement(`
      <div class="container-status container-status--${status}">
        <div class="container-status__icon">
          ${status === 'starting' ? '<span class="spinner"></span>' : '🐳'}
        </div>
        <div class="container-status__text">${message}</div>
      </div>
    `);
    
    container.appendChild(statusEl);
    
    if (this.autoScroll) {
      utils.scrollToBottom(container);
    }
  },
  
  /**
   * Hide container status
   */
  hideContainerStatus() {
    this.elements.container?.querySelector('.container-status')?.remove();
  },
  
  /**
   * Append auto-fix prompt message (shows what's being sent to AI)
   */
  appendAutoFixPrompt(content) {
    const { container } = this.elements;
    if (!container || !content) return null;
    
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    // Truncate if very long, but show key parts
    let displayContent = content;
    if (content.length > 500) {
      // Show first 300 chars and last 150 chars
      displayContent = content.slice(0, 300) + '\n\n... [truncated] ...\n\n' + content.slice(-150);
    }
    
    const promptEl = utils.createElement(`
      <div class="auto-fix-prompt">
        <div class="auto-fix-prompt__header">
          <span class="auto-fix-prompt__icon">🔄</span>
          <span class="auto-fix-prompt__title">Auto-Fix Request</span>
          <span class="auto-fix-prompt__time">${timestamp}</span>
        </div>
        <div class="auto-fix-prompt__content">
          <pre>${utils.escapeHtml(displayContent)}</pre>
        </div>
      </div>
    `);
    
    container.appendChild(promptEl);
    
    if (this.autoScroll) {
      utils.scrollToBottom(container);
    }
    
    return promptEl;
  },
  
  /**
   * Append feedback/status message that persists in chat
   */
  appendFeedback(message, level = 'info') {
    const { container } = this.elements;
    if (!container || !message) return null;
    
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    // Determine icon and color based on level/content
    let icon = 'ℹ️';
    let colorClass = 'feedback--info';
    
    if (level === 'success' || message.includes('✓') || message.includes('✅')) {
      icon = '✓';
      colorClass = 'feedback--success';
    } else if (level === 'error' || message.includes('❌') || message.includes('⚠️')) {
      icon = '⚠️';
      colorClass = 'feedback--error';
    } else if (message.includes('🐳') || message.includes('Container')) {
      icon = '🐳';
      colorClass = 'feedback--docker';
    } else if (message.includes('⚡') || message.includes('Executing')) {
      icon = '⚡';
      colorClass = 'feedback--executing';
    } else if (message.includes('📝') || message.includes('Writing')) {
      icon = '📝';
      colorClass = 'feedback--writing';
    }
    
    const feedbackEl = utils.createElement(`
      <div class="feedback-message ${colorClass}">
        <span class="feedback-message__icon">${icon}</span>
        <span class="feedback-message__text">${utils.escapeHtml(message)}</span>
        <span class="feedback-message__time">${timestamp}</span>
      </div>
    `);
    
    container.appendChild(feedbackEl);
    
    if (this.autoScroll) {
      utils.scrollToBottom(container);
    }
    
    return feedbackEl;
  },
  
  /**
   * Append code preview showing what's being executed
   */
  appendCodePreview(content) {
    const { container } = this.elements;
    if (!container || !content) return null;
    
    // Parse the content - it's in format ```language\ncode\n```
    const match = content.match(/```(\w+)?\n([\s\S]*?)\n```/);
    if (!match) return null;
    
    const language = match[1] || 'code';
    const code = match[2] || '';
    
    const previewEl = utils.createElement(`
      <div class="code-preview">
        <div class="code-preview__header">
          <span class="code-preview__icon">📋</span>
          <span class="code-preview__label">Code to execute (${language})</span>
        </div>
        <pre class="code-preview__code"><code class="language-${language}">${utils.escapeHtml(code)}</code></pre>
      </div>
    `);
    
    container.appendChild(previewEl);
    
    // Apply syntax highlighting
    previewEl.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
    
    if (this.autoScroll) {
      utils.scrollToBottom(container);
    }
    
    return previewEl;
  },

  /**
   * Append execution block - Console style
   */
  appendExecution(execution) {
    const { container } = this.elements;
    if (!container || !execution) return null;
    
    // Safely get values with defaults
    const exitCode = execution.exit_code ?? execution.exitCode ?? 0;
    const isError = exitCode !== 0;
    const language = execution.language || 'python';
    const code = execution.code || '';
    const output = execution.output || '';
    const error = execution.error || '';
    const execTime = execution.execution_time || execution.duration || null;
    const execId = execution.id || Date.now();
    const files = execution.files || [];
    
    // Format execution time
    const timeStr = execTime ? `${execTime.toFixed(2)}s` : '';
    
    // Get timestamp
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { hour12: false });
    
    // Build the error/output content for reuse button
    const reuseContent = error || output;
    
    const execEl = utils.createElement(`
      <div class="console-block ${isError ? 'console-block--error' : 'console-block--success'}" data-id="${execId}">
        <div class="console-block__header">
          <div class="console-block__left">
            <span class="console-block__toggle" title="Toggle">▼</span>
            <span class="console-block__title">
              ${this.getLanguageIcon(language)} ${language}
            </span>
          </div>
          <div class="console-block__right">
            ${timeStr ? `<span class="console-block__time">⏱ ${timeStr}</span>` : ''}
            <span class="console-block__status ${isError ? 'console-block__status--error' : 'console-block__status--success'}">
              ${isError ? `✗ Exit ${exitCode}` : '✓ Success'}
            </span>
            <span class="console-block__timestamp">${timestamp}</span>
          </div>
        </div>
        
        <div class="console-block__body">
          ${code ? `
            <div class="console-block__section">
              <div class="console-block__section-header">
                <span class="console-block__prompt">$</span>
                <span class="console-block__label">Code</span>
                <button class="console-block__copy" data-type="code" title="Copy code">📋</button>
              </div>
              <pre class="console-block__code"><code class="language-${language}">${utils.escapeHtml(code)}</code></pre>
            </div>
          ` : ''}
          
          ${output ? `
            <div class="console-block__section console-block__section--output">
              <div class="console-block__section-header">
                <span class="console-block__prompt">→</span>
                <span class="console-block__label">Output</span>
                <button class="console-block__reuse" data-type="output" title="Send to input">↩️ Send to Input</button>
              </div>
              <pre class="console-block__output">${utils.escapeHtml(output)}</pre>
            </div>
          ` : ''}
          
          ${error ? `
            <div class="console-block__section console-block__section--error">
              <div class="console-block__section-header">
                <span class="console-block__prompt">!</span>
                <span class="console-block__label">Error</span>
                <button class="console-block__reuse" data-type="error" title="Send to input">↩️ Send to Input</button>
              </div>
              <pre class="console-block__error">${this.formatErrorWithLinks(error)}</pre>
            </div>
          ` : ''}
          
          ${files.length > 0 ? `
            <div class="console-block__section console-block__section--files">
              <div class="console-block__section-header">
                <span class="console-block__prompt">📁</span>
                <span class="console-block__label">Files (${files.length})</span>
              </div>
              <div class="console-block__files">
                ${files.map(f => `
                  <a href="/api/files/${f.id}" class="console-block__file" download="${f.filename}">
                    📄 ${f.filename} <span class="console-block__file-size">(${utils.formatBytes(f.size)})</span>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `);
    
    container.appendChild(execEl);
    
    // Highlight code
    execEl.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
    
    // Bind toggle
    const toggle = execEl.querySelector('.console-block__toggle');
    toggle?.addEventListener('click', () => {
      execEl.classList.toggle('is-collapsed');
      toggle.textContent = execEl.classList.contains('is-collapsed') ? '▶' : '▼';
    });
    
    // Bind copy code button
    const copyBtn = execEl.querySelector('.console-block__copy');
    copyBtn?.addEventListener('click', () => {
      utils.copyToClipboard(code);
      copyBtn.textContent = '✓';
      setTimeout(() => copyBtn.textContent = '📋', 1500);
    });
    
    // Bind reuse buttons (for error/output)
    execEl.querySelectorAll('.console-block__reuse').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const content = type === 'error' ? error : output;
        this.reuseInInput(content);
        btn.textContent = '✓ Sent!';
        setTimeout(() => btn.textContent = '↩️ Send to Input', 1500);
      });
    });
    
    if (this.autoScroll) {
      utils.scrollToBottom(container);
    }
    
    return execEl;
  },
  
  /**
   * Format error message with clickable links (e.g., Settings link for timeout)
   */
  formatErrorWithLinks(error) {
    let escaped = utils.escapeHtml(error);
    
    // Replace "Settings → Features" with a clickable link
    escaped = escaped.replace(
      /Settings → Features/g,
      '<a href="#" class="error-settings-link" onclick="Settings.show(); Settings.switchTab(\'features\'); return false;">Settings → Features</a>'
    );
    
    return escaped;
  },
  
  /**
   * Put content in input with cursor at the beginning
   */
  reuseInInput(content) {
    const { input } = this.elements;
    if (!input || !content) return;
    
    // Put content in input
    input.value = content;
    
    // Focus and put cursor at the beginning
    input.focus();
    input.setSelectionRange(0, 0);
    
    // Scroll to input
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Trigger resize
    input.dispatchEvent(new Event('input'));
    
    Toast.success('Content added to input');
  },
  
  /**
   * Show execution indicator
   */
  showExecutionIndicator() {
    const { container } = this.elements;
    if (!container) return;
    
    // Clear any existing interval first
    if (this.execStatsInterval) {
      clearInterval(this.execStatsInterval);
      this.execStatsInterval = null;
    }
    
    // Remove existing indicator
    container.querySelector('.execution-indicator')?.remove();
    
    // Get timeout from settings (default 30s, add 5s buffer for network)
    const settings = State.get('settings') || {};
    const configuredTimeout = parseInt(settings.docker_timeout || '30', 10);
    // Max tracking time: configured timeout + 10s buffer, or 5 minutes for unlimited (0)
    this.maxTrackingTime = configuredTimeout > 0 ? (configuredTimeout + 10) * 1000 : 300000;
    
    const indicator = utils.createElement(`
      <div class="execution-indicator">
        <div class="execution-indicator__header">
          <span class="spinner"></span>
          <span>⚡ Executing code in container...</span>
        </div>
        <div class="execution-indicator__stats">
          <span class="execution-indicator__stat" id="execTime">⏱️ 0.0s</span>
          <span class="execution-indicator__stat" id="execCpu">💻 ---%</span>
          <span class="execution-indicator__stat" id="execMem">🧠 ---</span>
        </div>
      </div>
    `);
    
    container.appendChild(indicator);
    
    // Start updating stats
    this.execStartTime = Date.now();
    this.execStatsInterval = setInterval(() => {
      this.updateExecutionStats();
    }, 500);
    
    if (this.autoScroll) {
      utils.scrollToBottom(container);
    }
  },
  
  /**
   * Update execution stats in indicator
   */
  async updateExecutionStats() {
    // Prevent concurrent updates
    if (this.updatingStats) return;
    this.updatingStats = true;
    
    try {
      const timeEl = document.getElementById('execTime');
      const cpuEl = document.getElementById('execCpu');
      const memEl = document.getElementById('execMem');
      
      // If indicator is gone or no interval, stop tracking
      if (!timeEl || !this.execStatsInterval) {
        this.hideExecutionIndicator();
        return;
      }
      
      const elapsed = Date.now() - this.execStartTime;
      const elapsedSec = (elapsed / 1000).toFixed(1);
      
      // Update elapsed time
      timeEl.textContent = `⏱️ ${elapsedSec}s`;
      
      // Safety check: stop tracking if exceeded max time (timeout + buffer)
      if (elapsed > this.maxTrackingTime) {
        console.log('Execution tracking timeout - stopping stats');
        timeEl.textContent = `⏱️ ${elapsedSec}s (stopped)`;
        if (cpuEl) cpuEl.textContent = '💻 ---';
        if (memEl) memEl.textContent = '🧠 ---';
        
        // Stop the interval
        if (this.execStatsInterval) {
          clearInterval(this.execStatsInterval);
          this.execStatsInterval = null;
        }
        return;
      }
      
      // Try to get container stats
      const conversationId = State.get('currentConversationId');
      if (conversationId && cpuEl && memEl) {
        try {
          const stats = await API.getContainerStats(conversationId);
          if (stats && stats.container_id) {
            cpuEl.textContent = `💻 ${stats.cpu_percent?.toFixed(1) || 0}%`;
            memEl.textContent = `🧠 ${utils.formatBytes(stats.memory_used || 0)}`;
          } else {
            cpuEl.textContent = `💻 ---`;
            memEl.textContent = `🧠 ---`;
          }
        } catch (e) {
          cpuEl.textContent = `💻 ---`;
          memEl.textContent = `🧠 ---`;
        }
      }
    } finally {
      this.updatingStats = false;
    }
  },
  
  /**
   * Hide execution indicator
   */
  hideExecutionIndicator() {
    // Always clear interval first
    if (this.execStatsInterval) {
      clearInterval(this.execStatsInterval);
      this.execStatsInterval = null;
    }
    
    // Remove the indicator element
    this.elements.container?.querySelector('.execution-indicator')?.remove();
    
    // Reset tracking variables
    this.execStartTime = null;
    this.maxTrackingTime = null;
    this.updatingStats = false;
  },
  
  /**
   * Show auto-fix status
   */
  showAutoFixStatus(attempt, maxAttempts, customMessage = null) {
    const { container } = this.elements;
    if (!container) return;
    
    // Remove existing
    container.querySelector('.auto-fix-status')?.remove();
    
    const message = customMessage || `🔧 Auto-fixing errors (attempt ${attempt}/${maxAttempts})...`;
    
    const status = utils.createElement(`
      <div class="auto-fix-status">
        <span class="spinner"></span>
        <span class="auto-fix-status__text">${message}</span>
      </div>
    `);
    
    container.appendChild(status);
    
    if (this.autoScroll) {
      utils.scrollToBottom(container);
    }
  },
  
  /**
   * Hide auto-fix status
   */
  hideAutoFixStatus() {
    this.elements.container?.querySelector('.auto-fix-status')?.remove();
  },
  
  /**
   * Send message
   */
  async sendMessage() {
    const { input } = this.elements;
    if (!input) return;
    
    const content = input.value.trim();
    if (!content) return;
    
    const conversationId = State.get('currentConversationId');
    if (!conversationId) {
      // Create new conversation first
      await Sidebar.createNewChat();
    }
    
    // Clear input
    input.value = '';
    input.style.height = 'auto';
    
    // Add user message
    this.appendMessage('user', content);
    
    // Start processing
    await this.processMessage(content);
  },
  
  /**
   * Process message with streaming
   */
  async processMessage(content, isAutoFix = false) {
    const conversationId = State.get('currentConversationId');
    if (!conversationId) return;
    
    State.set('isProcessing', true);
    
    // Create abort controller
    const abortController = new AbortController();
    State.set('abortController', abortController);
    
    // Create assistant message placeholder
    let messageEl = this.appendMessage('assistant', '');
    messageEl?.classList.add('message--loading');
    
    let fullContent = '';
    let currentExecution = null;
    
    // Auto-fix state
    let isInAutoFix = false;
    let autoFixMessageEl = null;
    let autoFixContent = '';
    let autoFixStartTime = null;
    let lastScrollTime = 0;
    const scrollThrottle = 50; // Scroll every 50ms during streaming for smooth experience
    
    // Force auto-scroll during processing - always scroll
    const scrollDuringStream = () => {
      const now = Date.now();
      if (now - lastScrollTime > scrollThrottle) {
        lastScrollTime = now;
        this.scrollToLatest();
      }
    };
    
    try {
      // Get auto-fix state from checkbox
      const autoFixCheckbox = document.getElementById('autoFixInput');
      const autoFixEnabled = autoFixCheckbox?.checked ?? false;
      
      console.log('Auto-fix sending for conv', conversationId, ':', autoFixEnabled);
      
      const stream = API.streamMessage({
        conversation_id: conversationId,
        message: content,
        model: State.get('currentModel'),
        auto_fix: autoFixEnabled && !isAutoFix
      }, abortController.signal);
      
      for await (const event of stream) {
        console.log('SSE Event:', event.type, event);
        
        switch (event.type) {
          case 'conversation_id':
            if (event.id) {
              State.set('currentConversationId', event.id);
              Sidebar.loadConversations();
            }
            break;
            
          case 'text':
            // If in auto-fix mode, append to auto-fix message
            if (isInAutoFix && autoFixMessageEl) {
              autoFixContent += event.content;
              this.updateMessage(autoFixMessageEl, autoFixContent, false);
            } else {
              fullContent += event.content;
              this.updateMessage(messageEl, fullContent, false);
            }
            // Always scroll during text streaming
            scrollDuringStream();
            break;
          
          // Feedback events from code_executor
          case 'feedback':
            const msg = event.message || '';
            const level = event.level || 'info';
            
            // Append feedback as persistent message
            this.appendFeedback(msg, level);
            scrollDuringStream();
            
            // Show temporary indicators
            if (msg.includes('Creating Docker container') || msg.includes('🐳')) {
              this.showContainerStatus(msg, 'starting');
            } else if (msg.includes('Container started') || msg.includes('✓ Container')) {
              this.showContainerStatus(msg, 'running');
              setTimeout(() => this.hideContainerStatus(), 2500);
            } else if (msg.includes('Executing') || msg.includes('⚡')) {
              this.hideContainerStatus();
              this.showExecutionIndicator();
            } else if (msg.includes('✓ Code executed') || msg.includes('❌ Execution failed') || msg.includes('Execution timeout')) {
              // Execution finished - hide indicator
              this.hideExecutionIndicator();
            }
            break;
          
          case 'code_preview':
            // Show the code being executed
            this.appendCodePreview(event.message || event.content || '');
            scrollDuringStream();
            break;
          
          case 'container_started':
          case 'container_starting':
          case 'container_creating':
            this.showContainerStatus('🐳 Starting Docker container...', 'starting');
            scrollDuringStream();
            break;
          
          case 'container_ready':
          case 'container_running':
            this.showContainerStatus('🐳 Container ready', 'running');
            setTimeout(() => this.hideContainerStatus(), 2000);
            scrollDuringStream();
            break;
            
          case 'execution_start':
            messageEl?.classList.remove('message--loading');
            this.showExecutionIndicator();
            scrollDuringStream();
            break;
          
          case 'execution_end':
            // Execution of current code block finished
            this.hideExecutionIndicator();
            scrollDuringStream();
            break;
            
          case 'execution':
          case 'execution_complete':
            this.hideExecutionIndicator();
            const execSource = event.execution || event;
            const exitCode = execSource.exit_code ?? execSource.exitCode ?? 0;
            const execOutput = execSource.output || '';
            
            // If exit code is non-zero, treat output as error
            const execData = {
              id: execSource.id || event.block_index || Date.now(),
              exit_code: exitCode,
              language: execSource.language || 'python',
              code: execSource.code || '',
              output: exitCode === 0 ? execOutput : '',
              error: exitCode !== 0 ? execOutput : '',
              execution_time: execSource.duration || execSource.execution_time,
              files: execSource.files || []
            };
            currentExecution = execData;
            this.appendExecution(execData);
            scrollDuringStream();
            break;
          
          // Auto-fix: Show the prompt being sent back to AI
          case 'auto_fix_prompt':
            autoFixStartTime = Date.now();
            // Show the auto-fix prompt as a system/user message
            this.appendAutoFixPrompt(event.content);
            scrollDuringStream();
            break;
          
          // Auto-fix status changes
          case 'auto_fix':
            if (event.status === 'analyzing') {
              const attempt = event.attempt || 1;
              const maxAttempts = event.max_attempts || 5;
              this.showAutoFixStatus(attempt, maxAttempts, `🔍 Analyzing error (attempt ${attempt}/${maxAttempts})...`);
            } else if (event.status === 'fixing') {
              const attempt = event.attempt || 1;
              const maxAttempts = event.max_attempts || 5;
              // Create NEW message for the auto-fix AI response
              isInAutoFix = true;
              autoFixContent = '';
              autoFixMessageEl = this.appendMessage('assistant', '');
              scrollDuringStream();
              autoFixMessageEl?.classList.add('message--autofix', 'message--loading');
              this.showAutoFixStatus(attempt, maxAttempts, `🔧 Generating fix (attempt ${attempt}/${maxAttempts})...`);
            }
            break;
          
          // Auto-fix retry (still has errors, trying again)
          case 'auto_fix_retry':
            const retryAttempt = event.attempt || 1;
            const retryMax = event.max_attempts || 5;
            this.appendFeedback(`🔄 Fix attempt ${retryAttempt} still has errors, trying again...`, 'warning');
            break;
          
          // Auto-fix completed
          case 'auto_fix_complete':
            this.hideAutoFixStatus();
            isInAutoFix = false;
            if (autoFixMessageEl) {
              autoFixMessageEl.classList.remove('message--loading');
            }
            
            // Calculate total time
            const totalTime = autoFixStartTime ? ((Date.now() - autoFixStartTime) / 1000).toFixed(1) : '?';
            const attempts = event.attempt || 1;
            
            if (event.success) {
              this.appendFeedback(`✅ Auto-Fix Completed Successfully in ${totalTime}s (${attempts} attempt${attempts > 1 ? 's' : ''})`, 'success');
              Toast.success(`Auto-fix completed in ${totalTime}s`);
            } else {
              const reason = event.reason || 'errors remain';
              this.appendFeedback(`⚠️ Auto-Fix Failed after ${attempts} attempts: ${reason}`, 'error');
              Toast.error(`Auto-fix failed: ${reason}`);
            }
            
            if (this.autoScroll) {
              utils.scrollToBottom(this.elements.container);
            }
            break;
            
          case 'error':
            console.error('Stream error:', event.message);
            Toast.error(event.message || 'An error occurred');
            this.hideExecutionIndicator();
            break;
            
          case 'done':
          case 'complete':
            messageEl?.classList.remove('message--loading');
            if (autoFixMessageEl) {
              autoFixMessageEl.classList.remove('message--loading');
            }
            this.hideContainerStatus();
            this.hideAutoFixStatus();
            this.hideExecutionIndicator();
            
            if (event.is_new_conversation) {
              this.generateTitle(conversationId, content);
            }
            break;
            
          default:
            console.log('Unknown event type:', event.type, event);
        }
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        fullContent += '\n\n*[Generation stopped]*';
        this.updateMessage(messageEl, fullContent);
      } else {
        console.error('Message processing error:', error);
        Toast.error('Failed to process message');
        fullContent += `\n\n**Error:** ${error.message}`;
        this.updateMessage(messageEl, fullContent);
      }
    } finally {
      messageEl?.classList.remove('message--loading');
      if (autoFixMessageEl) {
        autoFixMessageEl.classList.remove('message--loading');
      }
      this.hideExecutionIndicator();
      this.hideAutoFixStatus();
      State.set('isProcessing', false);
      State.set('abortController', null);
    }
  },
  
  /**
   * Stop generation
   */
  stopGeneration() {
    const abortController = State.get('abortController');
    if (abortController) {
      abortController.abort();
    }
  },
  
  /**
   * Generate conversation title
   */
  async generateTitle(conversationId, firstMessage) {
    try {
      // Simple title from first message
      let title = firstMessage.slice(0, 50);
      if (firstMessage.length > 50) title += '...';
      
      await API.renameConversation(conversationId, title);
      
      // Update in state
      const conversations = State.get('conversations').map(c =>
        c.id === conversationId ? { ...c, title } : c
      );
      State.set('conversations', conversations);
      
    } catch (error) {
      console.error('Failed to generate title:', error);
    }
  },
  
  /**
   * Update processing state UI
   */
  updateProcessingState(isProcessing) {
    const { sendBtn, stopBtn, input } = this.elements;
    
    if (sendBtn) sendBtn.style.display = isProcessing ? 'none' : 'flex';
    if (stopBtn) stopBtn.style.display = isProcessing ? 'flex' : 'none';
    if (input) input.disabled = isProcessing;
  },
  
  /**
   * Render markdown content
   */
  renderMarkdown(content) {
    if (!content) return '';
    
    try {
      return marked.parse(content);
    } catch (error) {
      console.error('Markdown parse error:', error);
      return utils.escapeHtml(content);
    }
  },
  
  /**
   * Get language icon
   */
  getLanguageIcon(language) {
    const icons = {
      python: '🐍',
      javascript: '📜',
      js: '📜',
      bash: '⚙️',
      shell: '⚙️',
      sh: '⚙️'
    };
    return icons[language?.toLowerCase()] || '📝';
  },
  
  /**
   * Insert text at cursor position
   */
  insertText(text) {
    const { input } = this.elements;
    if (!input) return;
    
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const before = input.value.substring(0, start);
    const after = input.value.substring(end);
    
    input.value = before + text + after;
    input.selectionStart = input.selectionEnd = start + text.length;
    input.focus();
    
    // Trigger resize
    input.dispatchEvent(new Event('input'));
  }
};

// Export
window.Chat = Chat;
/* ============================================
   AI Code Executor - Files Component
   ============================================ */

const Files = {
  elements: {},
  isOpen: false,
  
  /**
   * Initialize files panel
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    
    // Listen for conversation changes
    window.addEventListener('conversationLoaded', (e) => {
      if (this.isOpen) {
        this.loadFiles(e.detail.conversationId);
      }
    });
  },
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      panel: $('#filesPanel'),
      fileList: $('#fileList'),
      closeBtn: $('#closeFilesBtn'),
      refreshBtn: $('#refreshFilesBtn'),
      uploadBtn: $('#uploadFileBtn'),
      uploadInput: $('#fileUploadInput'),
      
      // File viewer modal
      viewerModal: $('#fileViewerModal'),
      viewerBackdrop: $('#fileViewerBackdrop'),
      viewerTitle: $('#fileViewerTitle'),
      viewerContent: $('#fileViewerContent'),
      downloadBtn: $('#downloadFileBtn'),
      closeViewerBtn: $('#closeFileViewerBtn')
    };
  },
  
  /**
   * Bind events
   */
  bindEvents() {
    const { closeBtn, refreshBtn, uploadBtn, uploadInput, fileList,
            viewerBackdrop, closeViewerBtn, downloadBtn } = this.elements;
    
    // Panel controls
    closeBtn?.addEventListener('click', () => this.hide());
    refreshBtn?.addEventListener('click', () => this.refresh());
    uploadBtn?.addEventListener('click', () => uploadInput?.click());
    
    // File upload
    uploadInput?.addEventListener('change', (e) => this.handleUpload(e.target.files));
    
    // File click (event delegation)
    utils.delegate(fileList, '.file-item', 'click', (e, item) => {
      // Ignore if clicking download button
      if (e.target.closest('.file-item__download')) return;
      
      const path = item.dataset.path;
      const isDir = item.dataset.isDir === 'true';
      const size = parseInt(item.dataset.size || '0', 10);
      
      // Max file size for viewing: 1MB
      const MAX_VIEW_SIZE = 1024 * 1024;
      
      if (!isDir && path) {
        if (size > MAX_VIEW_SIZE) {
          Toast.warning(`File too large to preview (${utils.formatBytes(size)}). Use download instead.`);
          return;
        }
        this.viewFile(path);
      }
    });
    
    // Download button click (event delegation)
    utils.delegate(fileList, '.file-item__download', 'click', (e, btn) => {
      e.stopPropagation();
      const path = btn.dataset.path;
      if (path) {
        this.downloadFile(path);
      }
    });
    
    // Viewer modal
    closeViewerBtn?.addEventListener('click', () => this.hideViewer());
    viewerBackdrop?.addEventListener('click', () => this.hideViewer());
    downloadBtn?.addEventListener('click', () => this.downloadCurrentFile());
  },
  
  /**
   * Toggle panel
   */
  toggle() {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  },
  
  /**
   * Show panel
   */
  show() {
    const { panel } = this.elements;
    const conversationId = State.get('currentConversationId');
    
    // Hide other panels
    Stats.hide();
    
    panel?.classList.add('is-open');
    this.isOpen = true;
    State.set('activePanel', 'files');
    
    if (conversationId) {
      this.loadFiles(conversationId);
    }
  },
  
  /**
   * Hide panel
   */
  hide() {
    const { panel } = this.elements;
    
    panel?.classList.remove('is-open');
    this.isOpen = false;
    State.set('activePanel', null);
  },
  
  /**
   * Refresh files
   */
  refresh() {
    const conversationId = State.get('currentConversationId');
    if (conversationId) {
      this.loadFiles(conversationId);
    }
  },
  
  /**
   * Load files for conversation
   */
  async loadFiles(conversationId) {
    const { fileList } = this.elements;
    if (!fileList) return;
    
    fileList.innerHTML = `
      <div class="loading-state">
        <span class="spinner"></span>
        <span>Loading files...</span>
      </div>
    `;
    
    try {
      const response = await API.getConversationFiles(conversationId);
      console.log('Files API response:', response);
      
      // Handle various response formats
      let files = [];
      if (Array.isArray(response)) {
        files = response;
      } else if (response && Array.isArray(response.files)) {
        files = response.files;
      } else if (response && typeof response === 'object') {
        // Maybe it's an object with file data directly
        files = [];
      }
      
      this.renderFiles(files);
    } catch (error) {
      console.error('Failed to load files:', error);
      fileList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">❌</div>
          <div class="empty-state__title">Failed to load files</div>
          <div class="empty-state__text">${error.message}</div>
        </div>
      `;
    }
  },
  
  /**
   * Render file list
   */
  renderFiles(files) {
    const { fileList } = this.elements;
    if (!fileList) return;
    
    // Ensure files is an array
    if (!files || !Array.isArray(files) || files.length === 0) {
      fileList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📂</div>
          <div class="empty-state__title">No files yet</div>
          <div class="empty-state__text">Files created by code will appear here</div>
        </div>
      `;
      return;
    }
    
    // Normalize files - backend returns type: 'directory', frontend uses is_directory
    const normalizedFiles = files.map(f => ({
      ...f,
      is_directory: f.is_directory ?? (f.type === 'directory')
    }));
    
    // Sort: directories first, then by name
    const sorted = Array.from(normalizedFiles).sort((a, b) => {
      if (a.is_directory !== b.is_directory) {
        return a.is_directory ? -1 : 1;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    
    fileList.innerHTML = sorted.map(file => `
      <div class="file-item ${file.is_directory ? 'file-item--dir' : ''}" 
           data-path="${utils.escapeHtml(file.path || '')}"
           data-is-dir="${file.is_directory}"
           data-size="${file.size || 0}">
        <span class="file-item__icon">${utils.getFileIcon(file.name, file.is_directory)}</span>
        <div class="file-item__info">
          <div class="file-item__name">${utils.escapeHtml(file.name || 'unknown')}</div>
          ${!file.is_directory ? `
            <div class="file-item__meta">${utils.formatBytes(file.size || 0)}</div>
          ` : ''}
        </div>
        ${!file.is_directory ? `
          <button class="file-item__download btn-icon btn-icon--sm" data-path="${utils.escapeHtml(file.path || '')}" title="Download">⬇️</button>
        ` : ''}
      </div>
    `).join('');
  },
  
  /**
   * Handle file upload
   */
  async handleUpload(files) {
    if (!files || files.length === 0) return;
    
    const conversationId = State.get('currentConversationId');
    if (!conversationId) {
      Toast.error('Please select a conversation first');
      return;
    }
    
    for (const file of files) {
      try {
        await API.uploadFile(conversationId, file);
        Toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        console.error('Upload failed:', error);
        Toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    // Refresh file list
    this.loadFiles(conversationId);
    
    // Clear input
    this.elements.uploadInput.value = '';
  },
  
  /**
   * View file content
   */
  async viewFile(path) {
    const conversationId = State.get('currentConversationId');
    if (!conversationId) return;
    
    const { viewerModal, viewerBackdrop, viewerTitle, viewerContent } = this.elements;
    
    // Store current file path for download
    this.currentFilePath = path;
    
    // Show modal with loading state
    viewerTitle.textContent = path.split('/').pop();
    viewerContent.textContent = 'Loading...';
    viewerModal?.classList.add('is-open');
    viewerBackdrop?.classList.add('is-visible');
    
    try {
      const result = await API.getFileContent(conversationId, path);
      
      // Check if truncated
      let content = result.content || result;
      if (result.truncated) {
        viewerContent.parentElement.insertAdjacentHTML('beforebegin', `
          <div class="file-truncation-warning">
            ⚠️ File truncated to first ${utils.formatBytes(result.size_shown)} of ${utils.formatBytes(result.total_size)}
          </div>
        `);
      }
      
      viewerContent.textContent = content;
      
      // Apply syntax highlighting
      const ext = utils.getFileExtension(path);
      const lang = utils.getLanguageFromExtension(ext);
      if (lang !== 'plaintext') {
        viewerContent.className = `language-${lang}`;
        hljs.highlightElement(viewerContent);
      }
      
    } catch (error) {
      console.error('Failed to load file:', error);
      viewerContent.textContent = `Error loading file: ${error.message}`;
    }
  },
  
  /**
   * Hide file viewer
   */
  hideViewer() {
    const { viewerModal, viewerBackdrop } = this.elements;
    
    viewerModal?.classList.remove('is-open');
    viewerBackdrop?.classList.remove('is-visible');
    
    // Remove truncation warning if present
    viewerModal?.querySelector('.file-truncation-warning')?.remove();
    
    this.currentFilePath = null;
  },
  
  /**
   * Download a specific file by path
   */
  async downloadFile(path) {
    const conversationId = State.get('currentConversationId');
    if (!conversationId || !path) return;
    
    try {
      const result = await API.getFileContent(conversationId, path);
      const content = result.content || result;
      const filename = path.split('/').pop();
      
      utils.downloadFile(content, filename);
      Toast.success(`Downloaded ${filename}`);
      
    } catch (error) {
      console.error('Download failed:', error);
      Toast.error('Failed to download file');
    }
  },
  
  /**
   * Download current file
   */
  async downloadCurrentFile() {
    if (!this.currentFilePath) return;
    
    const conversationId = State.get('currentConversationId');
    if (!conversationId) return;
    
    try {
      const result = await API.getFileContent(conversationId, this.currentFilePath);
      const content = result.content || result;
      const filename = this.currentFilePath.split('/').pop();
      
      utils.downloadFile(content, filename);
      Toast.success(`Downloaded ${filename}`);
      
    } catch (error) {
      console.error('Download failed:', error);
      Toast.error('Failed to download file');
    }
  },
  
  /**
   * Download all files as zip
   */
  async downloadAll() {
    const conversationId = State.get('currentConversationId');
    if (!conversationId) return;
    
    try {
      const blob = await API.downloadAllFiles(conversationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${conversationId}-files.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      Toast.success('Files downloaded');
      
    } catch (error) {
      console.error('Download failed:', error);
      Toast.error(error.message || 'Failed to download files');
    }
  }
};

// Export
window.Files = Files;

/* ============================================
   AI Code Executor - Docker Images Component
   ============================================ */

const DockerImages = {
  elements: {},
  isOpen: false,
  exportConversationId: null,
  
  /**
   * Initialize Docker Images panel
   */
  init() {
    this.cacheElements();
    this.bindEvents();
  },
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      btn: $('#dockerImagesBtn'),
      panel: $('#dockerImagesPanel'),
      closeBtn: $('#closeDockerImagesBtn'),
      refreshBtn: $('#refreshDockerImagesBtn'),
      list: $('#dockerImagesList'),
      // Export confirmation modal
      exportBackdrop: $('#exportContainerBackdrop'),
      exportModal: $('#exportContainerModal'),
      exportMessage: $('#exportContainerMessage'),
      closeExportBtn: $('#closeExportContainerBtn'),
      cancelExportBtn: $('#cancelExportContainerBtn'),
      confirmExportBtn: $('#confirmExportContainerBtn')
    };
  },
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    const { btn, closeBtn, refreshBtn, exportBackdrop, closeExportBtn, cancelExportBtn, confirmExportBtn } = this.elements;
    
    // Toggle panel
    btn?.addEventListener('click', () => this.toggle());
    closeBtn?.addEventListener('click', () => this.hide());
    refreshBtn?.addEventListener('click', () => this.loadImages());
    
    // Export confirmation modal events
    exportBackdrop?.addEventListener('click', () => this.hideExportConfirmation());
    closeExportBtn?.addEventListener('click', () => this.hideExportConfirmation());
    cancelExportBtn?.addEventListener('click', () => this.hideExportConfirmation());
    confirmExportBtn?.addEventListener('click', () => this.confirmExport());
    
    // Delegate events for download/delete buttons
    this.elements.list?.addEventListener('click', async (e) => {
      const downloadBtn = e.target.closest('.docker-image__download');
      const deleteBtn = e.target.closest('.docker-image__delete');
      
      if (downloadBtn) {
        const filename = downloadBtn.dataset.filename;
        this.downloadImage(filename);
      }
      
      if (deleteBtn) {
        const filename = deleteBtn.dataset.filename;
        if (confirm(`Delete ${filename}?`)) {
          await this.deleteImage(filename);
        }
      }
    });
  },
  
  /**
   * Toggle panel visibility
   */
  toggle() {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  },
  
  /**
   * Show panel
   */
  show() {
    const { panel, btn } = this.elements;
    
    panel?.classList.add('is-open');
    btn?.classList.add('is-active');
    this.isOpen = true;
    
    this.loadImages();
  },
  
  /**
   * Hide panel
   */
  hide() {
    const { panel, btn } = this.elements;
    
    panel?.classList.remove('is-open');
    btn?.classList.remove('is-active');
    this.isOpen = false;
  },
  
  /**
   * Load exported Docker images
   */
  async loadImages() {
    const { list } = this.elements;
    if (!list) return;
    
    try {
      const data = await API.listDockerImages();
      const images = data.images || [];
      
      if (images.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">🐳</div>
            <div class="empty-state__title">No exported images</div>
            <div class="empty-state__text">Export a container from the conversation menu</div>
          </div>
        `;
        return;
      }
      
      list.innerHTML = images.map(img => `
        <div class="docker-image-item">
          <div class="docker-image-item__icon">🐳</div>
          <div class="docker-image-item__info">
            <div class="docker-image-item__name">${utils.escapeHtml(img.filename)}</div>
            <div class="docker-image-item__meta">
              ${utils.formatBytes(img.size)} • ${utils.formatTimeAgo(img.created)}
            </div>
          </div>
          <div class="docker-image-item__actions">
            <button class="btn-icon btn-icon--sm docker-image__download" data-filename="${utils.escapeHtml(img.filename)}" title="Download">⬇️</button>
            <button class="btn-icon btn-icon--sm docker-image__delete" data-filename="${utils.escapeHtml(img.filename)}" title="Delete">🗑️</button>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Failed to load Docker images:', error);
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">❌</div>
          <div class="empty-state__title">Failed to load images</div>
          <div class="empty-state__text">${utils.escapeHtml(error.message)}</div>
        </div>
      `;
    }
  },
  
  /**
   * Show export confirmation modal
   */
  showExportConfirmation(conversationId, title) {
    const { exportBackdrop, exportModal, exportMessage } = this.elements;
    
    this.exportConversationId = conversationId;
    
    const displayTitle = title && title !== 'New Conversation' ? title : `Conversation #${conversationId}`;
    exportMessage.textContent = `Export container for "${displayTitle}"?`;
    
    exportBackdrop?.classList.add('is-open');
    exportModal?.classList.add('is-open');
  },
  
  /**
   * Hide export confirmation modal
   */
  hideExportConfirmation() {
    const { exportBackdrop, exportModal } = this.elements;
    
    exportBackdrop?.classList.remove('is-open');
    exportModal?.classList.remove('is-open');
    this.exportConversationId = null;
  },
  
  /**
   * Confirm and perform export
   */
  async confirmExport() {
    if (!this.exportConversationId) return;
    
    const conversationId = this.exportConversationId;
    this.hideExportConfirmation();
    
    // Show progress bar with estimated time (docker export can take 30-60s for large images)
    GlobalProgress.showWithEstimate('🐳 Exporting container...', 30);
    
    try {
      const result = await API.exportContainer(conversationId);
      
      if (result.success) {
        GlobalProgress.complete(`✓ Exported ${result.filename}`);
        Toast.success(`Exported to ${result.filename}`);
        
        // Refresh the list if panel is open
        if (this.isOpen) {
          this.loadImages();
        }
      } else {
        GlobalProgress.hide();
        Toast.error(result.message || 'Export failed');
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      GlobalProgress.hide();
      Toast.error(`Export failed: ${error.message}`);
    }
  },
  
  /**
   * Download an exported image
   */
  downloadImage(filename) {
    const url = API.getDockerImageDownloadUrl(filename);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
  
  /**
   * Delete an exported image
   */
  async deleteImage(filename) {
    try {
      await API.deleteDockerImage(filename);
      Toast.success(`Deleted ${filename}`);
      this.loadImages();
    } catch (error) {
      console.error('Delete failed:', error);
      Toast.error(`Delete failed: ${error.message}`);
    }
  }
};

// Export
window.DockerImages = DockerImages;

/* ============================================
   AI Code Executor - Stats Component
   ============================================ */

const Stats = {
  elements: {},
  isOpen: false,
  statsInterval: null,
  
  /**
   * Initialize stats panel
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    
    // Listen for conversation changes
    window.addEventListener('conversationLoaded', (e) => {
      if (this.isOpen) {
        this.startStats(e.detail.conversationId);
      }
    });
  },
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      panel: $('#statsPanel'),
      content: $('#statsGrid'),
      closeBtn: $('#closeStatsBtn')
    };
  },
  
  /**
   * Bind events
   */
  bindEvents() {
    const { closeBtn } = this.elements;
    
    closeBtn?.addEventListener('click', () => this.hide());
  },
  
  /**
   * Toggle panel
   */
  toggle() {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  },
  
  /**
   * Show panel
   */
  show() {
    const { panel } = this.elements;
    const conversationId = State.get('currentConversationId');
    
    // Hide other panels
    Files.hide();
    
    panel?.classList.add('is-open');
    this.isOpen = true;
    State.set('activePanel', 'stats');
    
    if (conversationId) {
      this.startStats(conversationId);
    }
  },
  
  /**
   * Hide panel
   */
  hide() {
    const { panel } = this.elements;
    
    panel?.classList.remove('is-open');
    this.isOpen = false;
    State.set('activePanel', null);
    
    this.stopStats();
  },
  
  /**
   * Refresh stats
   */
  refresh() {
    const conversationId = State.get('currentConversationId');
    if (conversationId) {
      this.loadStats(conversationId);
    }
  },
  
  /**
   * Start stats polling
   */
  startStats(conversationId) {
    this.stopStats();
    this.loadStats(conversationId);
    
    // Poll every 5 seconds
    this.statsInterval = setInterval(() => {
      this.loadStats(conversationId);
    }, 5000);
  },
  
  /**
   * Stop stats polling
   */
  stopStats() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  },
  
  /**
   * Load stats for conversation
   */
  async loadStats(conversationId) {
    const { content } = this.elements;
    if (!content) return;
    
    try {
      const stats = await API.getContainerStats(conversationId);
      this.renderStats(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📊</div>
          <div class="empty-state__title">No Container</div>
          <div class="empty-state__text">Start a conversation to see container stats</div>
        </div>
      `;
    }
  },
  
  /**
   * Render stats
   */
  renderStats(stats) {
    const { content } = this.elements;
    if (!content) return;
    
    if (!stats || !stats.container_id) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📊</div>
          <div class="empty-state__title">No Container</div>
          <div class="empty-state__text">Start a conversation to see container stats</div>
        </div>
      `;
      return;
    }
    
    const cpuPercent = stats.cpu_percent?.toFixed(1) || '0.0';
    const memUsed = this.formatBytes(stats.memory_used || 0);
    const memLimit = this.formatBytes(stats.memory_limit || 0);
    const memPercent = stats.memory_percent?.toFixed(1) || '0.0';
    
    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card__icon">🐳</div>
          <div class="stat-card__label">Container</div>
          <div class="stat-card__value">${stats.container_id?.substring(0, 12) || 'N/A'}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-card__icon">💻</div>
          <div class="stat-card__label">CPU Usage</div>
          <div class="stat-card__value">${cpuPercent}%</div>
          <div class="stat-card__bar">
            <div class="stat-card__bar-fill" style="width: ${Math.min(cpuPercent, 100)}%"></div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-card__icon">🧠</div>
          <div class="stat-card__label">Memory</div>
          <div class="stat-card__value">${memUsed} / ${memLimit}</div>
          <div class="stat-card__bar">
            <div class="stat-card__bar-fill" style="width: ${Math.min(memPercent, 100)}%"></div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-card__icon">📈</div>
          <div class="stat-card__label">Status</div>
          <div class="stat-card__value stat-card__value--success">Running</div>
        </div>
      </div>
    `;
  },
  
  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
};

// Export
window.Stats = Stats;
/* ============================================
   AI Code Executor - Voice Component
   ============================================ */

const Voice = {
  elements: {},
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  
  /**
   * Initialize voice
   */
  init() {
    this.cacheElements();
    this.bindEvents();
  },
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      micBtn: $('#micBtn'),
      preview: $('#transcriptionPreview'),
      originalText: $('#transcriptionOriginal'),
      englishText: $('#transcriptionEnglish'),
      langBadge: $('#transcriptionLang'),
      closePreviewBtn: $('#closeTranscriptionBtn')
    };
  },
  
  /**
   * Bind events
   */
  bindEvents() {
    const { micBtn, closePreviewBtn } = this.elements;
    
    micBtn?.addEventListener('click', () => this.toggleRecording());
    closePreviewBtn?.addEventListener('click', () => this.hidePreview());
  },
  
  /**
   * Toggle recording
   */
  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  },
  
  /**
   * Start recording
   */
  async startRecording() {
    const { micBtn } = this.elements;
    
    // Check if voice is enabled
    const settings = State.get('settings');
    if (settings.voice_enabled === false) {
      Toast.error('Voice input is disabled in settings');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      
      // Determine best format
      const mimeType = this.getSupportedMimeType();
      
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Process audio
        this.processAudio();
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      
      // Update UI
      micBtn?.classList.add('is-recording');
      State.set('isRecording', true);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      if (error.name === 'NotAllowedError') {
        Toast.error('Microphone permission denied');
      } else if (error.name === 'NotFoundError') {
        Toast.error('No microphone found');
      } else {
        Toast.error('Failed to start recording');
      }
    }
  },
  
  /**
   * Stop recording
   */
  stopRecording() {
    const { micBtn } = this.elements;
    
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Update UI
      micBtn?.classList.remove('is-recording');
      micBtn?.classList.add('is-processing');
      State.set('isRecording', false);
      State.set('isTranscribing', true);
    }
  },
  
  /**
   * Process recorded audio
   */
  async processAudio() {
    const { micBtn } = this.elements;
    
    if (this.audioChunks.length === 0) {
      micBtn?.classList.remove('is-processing');
      State.set('isTranscribing', false);
      return;
    }
    
    const audioBlob = new Blob(this.audioChunks, { 
      type: this.mediaRecorder?.mimeType || 'audio/webm' 
    });
    
    try {
      const result = await API.transcribeAudio(audioBlob);
      
      micBtn?.classList.remove('is-processing');
      State.set('isTranscribing', false);
      
      if (result.text) {
        // Show preview if there's a translation
        if (result.english && result.english !== result.text) {
          this.showPreview(result);
        } else {
          // Insert directly
          Chat.insertText(result.english || result.text);
        }
      } else {
        Toast.error('No speech detected');
      }
      
    } catch (error) {
      console.error('Transcription failed:', error);
      Toast.error('Transcription failed');
      
      micBtn?.classList.remove('is-processing');
      State.set('isTranscribing', false);
    }
  },
  
  /**
   * Show transcription preview
   */
  showPreview(result) {
    const { preview, originalText, englishText, langBadge } = this.elements;
    
    if (!preview) return;
    
    // Update content
    if (langBadge) {
      langBadge.textContent = result.language || 'Unknown';
    }
    
    if (originalText) {
      originalText.textContent = result.text;
    }
    
    if (englishText) {
      englishText.textContent = result.english || result.text;
      
      // Click to use
      englishText.style.cursor = 'pointer';
      englishText.onclick = () => {
        Chat.insertText(result.english || result.text);
        this.hidePreview();
      };
    }
    
    preview.style.display = 'block';
  },
  
  /**
   * Hide preview
   */
  hidePreview() {
    const { preview } = this.elements;
    if (preview) {
      preview.style.display = 'none';
    }
  },
  
  /**
   * Get supported MIME type
   */
  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm';
  }
};

// Export
window.Voice = Voice;
/* ============================================
   AI Code Executor - Settings Component
   ============================================ */

const Settings = {
  elements: {},
  
  /**
   * Initialize settings
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadSettings();
  },
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      modal: $('#settingsModal'),
      backdrop: $('#settingsBackdrop'),
      closeBtn: $('#closeSettingsBtn'),
      cancelBtn: $('#cancelSettingsBtn'),
      saveBtn: $('#saveSettingsBtn'),
      tabs: $$('#settingsTabs .tab'),
      tabPanels: $$('.tab-panel'),
      
      // API Keys
      anthropicKey: $('#anthropicKey'),
      openaiKey: $('#openaiKey'),
      geminiKey: $('#geminiKey'),
      ollamaHost: $('#ollamaHost'),
      lmstudioHost: $('#lmstudioHost'),
      toggleAnthropicKey: $('#toggleAnthropicKey'),
      toggleOpenaiKey: $('#toggleOpenaiKey'),
      toggleGeminiKey: $('#toggleGeminiKey'),
      
      // Features
      voiceEnabled: $('#voiceEnabled'),
      whisperUrl: $('#whisperUrl'),
      viewMode: $('#viewMode'),
      executionTimeout: $('#executionTimeout'),
      autoFixMaxAttempts: $('#autoFixMaxAttempts'),
      
      // Prompts
      systemPrompt: $('#systemPrompt'),
      autoFixPrompt: $('#autoFixPrompt'),
      
      // Docker
      dockerCpus: $('#dockerCpus'),
      dockerMemory: $('#dockerMemory'),
      dockerStorage: $('#dockerStorage'),
      dockerExportPath: $('#dockerExportPath'),
      dockerTimeout: $('#dockerTimeout'),
      containerList: $('#containerList'),
      cleanupContainersBtn: $('#cleanupContainersBtn')
    };
  },
  
  /**
   * Bind events
   */
  bindEvents() {
    const { modal, backdrop, closeBtn, cancelBtn, saveBtn, tabs, 
            toggleAnthropicKey, toggleOpenaiKey, toggleGeminiKey,
            cleanupContainersBtn, viewMode } = this.elements;
    
    // Close modal
    closeBtn?.addEventListener('click', () => this.hide());
    cancelBtn?.addEventListener('click', () => this.hide());
    backdrop?.addEventListener('click', () => this.hide());
    
    // Save settings
    saveBtn?.addEventListener('click', () => this.save());
    
    // Tab switching
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
    
    // Toggle password visibility
    toggleAnthropicKey?.addEventListener('click', () => this.togglePasswordVisibility('anthropicKey'));
    toggleOpenaiKey?.addEventListener('click', () => this.togglePasswordVisibility('openaiKey'));
    toggleGeminiKey?.addEventListener('click', () => this.togglePasswordVisibility('geminiKey'));
    
    // Cleanup containers
    cleanupContainersBtn?.addEventListener('click', () => this.cleanupContainers());
    
    // View mode change
    viewMode?.addEventListener('change', (e) => this.applyViewMode(e.target.value));
    
    // Keyboard close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal?.classList.contains('is-open')) {
        this.hide();
      }
    });
  },
  
  /**
   * Load settings from API and localStorage
   */
  async loadSettings() {
    try {
      const settings = await API.getSettings();
      State.update('settings', settings);
      this.populateForm(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Load from localStorage as fallback
      const localSettings = utils.storage.get('settings', {});
      this.populateForm(localSettings);
    }
  },
  
  /**
   * Populate form with settings
   */
  populateForm(settings) {
    const { anthropicKey, openaiKey, geminiKey, ollamaHost, lmstudioHost,
            voiceEnabled, whisperUrl, viewMode, executionTimeout, autoFixMaxAttempts, systemPrompt, autoFixPrompt,
            dockerCpus, dockerMemory, dockerStorage, dockerExportPath, dockerTimeout } = this.elements;
    
    // API Keys (masked)
    if (anthropicKey) anthropicKey.value = settings.anthropic_key || '';
    if (openaiKey) openaiKey.value = settings.openai_key || '';
    if (geminiKey) geminiKey.value = settings.gemini_key || '';
    if (ollamaHost) ollamaHost.value = settings.ollama_host || 'http://localhost:11434';
    if (lmstudioHost) lmstudioHost.value = settings.lmstudio_host || 'http://localhost:1234';
    
    // Features
    if (voiceEnabled) voiceEnabled.checked = settings.voice_enabled !== false;
    if (whisperUrl) whisperUrl.value = settings.whisper_url || '';
    if (viewMode) viewMode.value = settings.view_mode || 'auto';
    if (executionTimeout) executionTimeout.value = settings.execution_timeout || settings.docker_timeout || '30';
    if (autoFixMaxAttempts) autoFixMaxAttempts.value = settings.auto_fix_max_attempts || '10';
    
    // Prompts
    if (systemPrompt) systemPrompt.value = settings.system_prompt || this.getDefaultSystemPrompt();
    if (autoFixPrompt) autoFixPrompt.value = settings.auto_fix_prompt || this.getDefaultAutoFixPrompt();
    
    // Docker
    if (dockerCpus) dockerCpus.value = settings.docker_cpus || '2';
    if (dockerMemory) dockerMemory.value = settings.docker_memory || '8g';
    if (dockerStorage) dockerStorage.value = settings.docker_storage || '10g';
    if (dockerExportPath) dockerExportPath.value = settings.docker_export_path || './docker_images_exported';
    if (dockerTimeout) dockerTimeout.value = settings.docker_timeout || '30';
    
    // Apply view mode
    this.applyViewMode(settings.view_mode || 'auto');
    
    // Update mic button visibility
    this.updateMicButtonVisibility(settings.voice_enabled !== false);
  },
  
  /**
   * Get default system prompt
   */
  getDefaultSystemPrompt() {
    return `You are a professional coder who provides complete, executable code solutions. Present only code, no explanatory text or instructions on how to execute. Present code blocks in the order they should be executed. If dependencies are needed, install them first using a bash script. This approach gives the best results for automatic code execution.`;
  },
  
  /**
   * Get default auto-fix prompt
   */
  getDefaultAutoFixPrompt() {
    return `The code execution failed with the following errors:

{errors}

Please analyze the errors and provide a corrected version of the code. Focus on:
1. Fixing the specific error mentioned
2. Ensuring the code is complete and runnable
3. Adding any missing imports or dependencies

Provide the corrected code in a code block.`;
  },
  
  /**
   * Save settings
   */
  async save() {
    const { anthropicKey, openaiKey, geminiKey, ollamaHost, lmstudioHost,
            voiceEnabled, whisperUrl, viewMode, executionTimeout, autoFixMaxAttempts, systemPrompt, autoFixPrompt,
            dockerCpus, dockerMemory, dockerStorage, dockerExportPath, dockerTimeout } = this.elements;
    
    // Use executionTimeout for docker_timeout (they're the same setting now)
    const timeoutValue = executionTimeout?.value || dockerTimeout?.value || '30';
    
    const settings = {
      anthropic_key: anthropicKey?.value || '',
      openai_key: openaiKey?.value || '',
      gemini_key: geminiKey?.value || '',
      ollama_host: ollamaHost?.value || 'http://localhost:11434',
      lmstudio_host: lmstudioHost?.value || 'http://localhost:1234',
      voice_enabled: voiceEnabled?.checked ?? true,
      whisper_url: whisperUrl?.value || '',
      view_mode: viewMode?.value || 'auto',
      system_prompt: systemPrompt?.value || this.getDefaultSystemPrompt(),
      auto_fix_prompt: autoFixPrompt?.value || this.getDefaultAutoFixPrompt(),
      auto_fix_max_attempts: autoFixMaxAttempts?.value || '10',
      docker_cpus: dockerCpus?.value || '2',
      docker_memory: dockerMemory?.value || '8g',
      docker_storage: dockerStorage?.value || '10g',
      docker_export_path: dockerExportPath?.value || './docker_images_exported',
      docker_timeout: timeoutValue
    };
    
    try {
      await API.updateSettings(settings);
      State.update('settings', settings);
      utils.storage.set('settings', settings);
      
      // Update mic button visibility
      this.updateMicButtonVisibility(settings.voice_enabled);
      
      // Reload local model lists in case hosts changed
      Header.loadOllamaModels();
      Header.loadLmstudioModels();
      
      Toast.success('Settings saved');
      this.hide();
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      Toast.error('Failed to save settings');
    }
  },
  
  /**
   * Update mic button visibility based on voice enabled setting
   */
  updateMicButtonVisibility(enabled) {
    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
      micBtn.style.display = enabled ? '' : 'none';
    }
  },
  
  /**
   * Show settings modal
   */
  show() {
    const { modal, backdrop } = this.elements;
    
    modal?.classList.add('is-open');
    backdrop?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
    
    // Load containers when docker tab is shown
    this.loadContainers();
  },
  
  /**
   * Hide settings modal
   */
  hide() {
    const { modal, backdrop } = this.elements;
    
    modal?.classList.remove('is-open');
    backdrop?.classList.remove('is-visible');
    document.body.style.overflow = '';
  },
  
  /**
   * Switch tab
   */
  switchTab(tabId) {
    const { tabs, tabPanels } = this.elements;
    
    tabs.forEach(tab => {
      tab.classList.toggle('is-active', tab.dataset.tab === tabId);
    });
    
    tabPanels.forEach(panel => {
      panel.classList.toggle('is-active', panel.id === `${tabId}Tab`);
    });
    
    // Load containers when docker tab is shown
    if (tabId === 'docker') {
      this.loadContainers();
    }
  },
  
  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(inputId) {
    const input = this.elements[inputId];
    if (!input) return;
    
    input.type = input.type === 'password' ? 'text' : 'password';
  },
  
  /**
   * Apply view mode
   */
  applyViewMode(mode) {
    const app = $('#app');
    if (!app) return;
    
    app.classList.remove('force-mobile', 'force-desktop');
    
    if (mode === 'mobile') {
      app.classList.add('force-mobile');
    } else if (mode === 'desktop') {
      app.classList.add('force-desktop');
    }
  },
  
  /**
   * Load containers list
   */
  async loadContainers() {
    const { containerList } = this.elements;
    if (!containerList) return;
    
    try {
      const containers = await API.getContainers();
      
      if (containers.length === 0) {
        containerList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__text">No active containers</div>
          </div>
        `;
        return;
      }
      
      containerList.innerHTML = containers.map(container => `
        <div class="container-card">
          <div class="container-card__header">
            <div class="container-card__id">
              🐳 ${container.id.slice(0, 12)}
            </div>
            <span class="container-card__status container-card__status--${container.status}">
              ${container.status}
            </span>
          </div>
          <div class="container-card__body">
            <div class="container-card__row">
              <span class="container-card__label">Conversation</span>
              <span class="container-card__value">#${container.conversation_id || 'N/A'}</span>
            </div>
            <div class="container-card__row">
              <span class="container-card__label">Created</span>
              <span class="container-card__value">${utils.formatTimeAgo(container.created)}</span>
            </div>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Failed to load containers:', error);
      containerList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__text">Failed to load containers</div>
        </div>
      `;
    }
  },
  
  /**
   * Cleanup containers
   */
  async cleanupContainers() {
    if (!confirm('Stop and remove all containers? This will end all active sessions.')) {
      return;
    }
    
    try {
      await API.cleanupContainers();
      Toast.success('Containers cleaned up');
      this.loadContainers();
    } catch (error) {
      console.error('Failed to cleanup containers:', error);
      Toast.error('Failed to cleanup containers');
    }
  }
};

// Export
window.Settings = Settings;
/* ============================================
   AI Code Executor - Terminal Component
   ============================================ */

// Save reference to xterm.js Terminal before we potentially overwrite it
const XTerminal = window.Terminal;
const XFitAddon = window.FitAddon;

const TerminalManager = {
  elements: {},
  isOpen: false,
  isMinimized: false,
  isMaximized: false,
  terminals: new Map(), // conversationId -> { term, socket, fitAddon }
  activeTerminalId: null,
  
  // Dragging state
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  
  // Resizing state
  isResizing: false,
  resizeStart: { x: 0, y: 0, width: 0, height: 0 },
  
  /**
   * Initialize terminal
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    console.log('TerminalManager initialized, xterm available:', !!XTerminal);
  },
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      modal: $('#terminalModal'),
      container: $('#terminalContainer'),
      header: $('#terminalHeader'),
      tabs: $('#terminalTabs'),
      content: $('#terminalContent'),
      resize: $('#terminalResize'),
      minimizeBtn: $('#minimizeTermBtn'),
      maximizeBtn: $('#maximizeTermBtn'),
      closeBtn: $('#closeTermBtn')
    };
  },
  
  /**
   * Bind events
   */
  bindEvents() {
    const { header, resize, minimizeBtn, maximizeBtn, closeBtn, tabs } = this.elements;
    
    // Window controls
    minimizeBtn?.addEventListener('click', () => this.toggleMinimize());
    maximizeBtn?.addEventListener('click', () => this.toggleMaximize());
    closeBtn?.addEventListener('click', () => this.hide());
    
    // Dragging
    header?.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.stopDrag());
    
    // Resizing
    resize?.addEventListener('mousedown', (e) => this.startResize(e));
    document.addEventListener('mousemove', (e) => this.handleResize(e));
    document.addEventListener('mouseup', () => this.stopResize());
    
    // Tab clicks
    utils.delegate(tabs, '.terminal-tab', 'click', (e, tab) => {
      const id = parseInt(tab.dataset.id);
      if (id) this.switchTerminal(id);
    });
    
    // Tab close
    utils.delegate(tabs, '.terminal-tab__close', 'click', (e, btn) => {
      e.stopPropagation();
      const id = parseInt(btn.closest('.terminal-tab').dataset.id);
      if (id) this.closeTerminal(id);
    });
  },
  
  /**
   * Toggle terminal visibility
   */
  toggle() {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  },
  
  /**
   * Show terminal
   */
  show() {
    const { modal } = this.elements;
    const conversationId = State.get('currentConversationId');
    
    if (!conversationId) {
      Toast.error('Please select a conversation first');
      return;
    }
    
    modal?.classList.add('is-open');
    this.isOpen = true;
    
    // Create or activate terminal for current conversation
    if (!this.terminals.has(conversationId)) {
      this.createTerminal(conversationId);
    } else {
      this.switchTerminal(conversationId);
    }
  },
  
  /**
   * Hide terminal
   */
  hide() {
    const { modal } = this.elements;
    modal?.classList.remove('is-open');
    this.isOpen = false;
  },
  
  /**
   * Create terminal for conversation
   */
  createTerminal(conversationId) {
    const { content, tabs } = this.elements;
    if (!content) return;
    
    // Create terminal container
    const termContainer = document.createElement('div');
    termContainer.className = 'terminal-instance';
    termContainer.id = `terminal-${conversationId}`;
    content.appendChild(termContainer);
    
    // Create xterm instance
    if (!XTerminal) {
      console.error('xterm.js not loaded');
      Toast.error('Terminal not available - xterm.js not loaded');
      return;
    }
    
    const term = new XTerminal({
      theme: {
        background: '#0a0a0b',
        foreground: '#e4e4e7',
        cursor: '#22d3ee',
        cursorAccent: '#0a0a0b',
        selection: 'rgba(34, 211, 238, 0.3)',
        black: '#18181b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#22d3ee',
        white: '#e4e4e7',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#67e8f9',
        brightWhite: '#fafafa'
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000
    });
    
    // Create fit addon
    const fitAddon = new XFitAddon.FitAddon();
    term.loadAddon(fitAddon);
    
    // Open terminal
    term.open(termContainer);
    fitAddon.fit();
    
    // Connect WebSocket
    const socket = API.createTerminalSocket(conversationId);
    
    socket.onopen = () => {
      term.writeln('\x1b[32m● Connected to container\x1b[0m\r\n');
    };
    
    socket.onmessage = (event) => {
      term.write(event.data);
    };
    
    socket.onclose = () => {
      term.writeln('\r\n\x1b[31m● Disconnected\x1b[0m');
    };
    
    socket.onerror = (error) => {
      term.writeln(`\r\n\x1b[31m● Connection error\x1b[0m`);
      console.error('Terminal WebSocket error:', error);
    };
    
    // Send raw input to socket (not JSON!)
    term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    });
    
    // Store terminal
    this.terminals.set(conversationId, {
      term,
      socket,
      fitAddon,
      container: termContainer
    });
    
    // Add tab
    this.addTab(conversationId);
    
    // Switch to this terminal
    this.switchTerminal(conversationId);
  },
  
  /**
   * Add tab for terminal
   */
  addTab(conversationId) {
    const { tabs } = this.elements;
    if (!tabs) return;
    
    const tab = utils.createElement(`
      <div class="terminal-tab" data-id="${conversationId}">
        <span>Chat #${conversationId}</span>
        <button class="terminal-tab__close">×</button>
      </div>
    `);
    
    tabs.appendChild(tab);
  },
  
  /**
   * Switch to terminal
   */
  switchTerminal(conversationId) {
    const terminal = this.terminals.get(conversationId);
    if (!terminal) return;
    
    // Hide all terminals
    this.terminals.forEach((t, id) => {
      t.container.style.display = id === conversationId ? 'block' : 'none';
    });
    
    // Update tabs
    $$('.terminal-tab').forEach(tab => {
      tab.classList.toggle('is-active', parseInt(tab.dataset.id) === conversationId);
    });
    
    this.activeTerminalId = conversationId;
    
    // Fit terminal
    setTimeout(() => terminal.fitAddon.fit(), 0);
    terminal.term.focus();
  },
  
  /**
   * Close terminal
   */
  closeTerminal(conversationId) {
    const terminal = this.terminals.get(conversationId);
    if (!terminal) return;
    
    // Close socket
    terminal.socket.close();
    
    // Dispose terminal
    terminal.term.dispose();
    
    // Remove container
    terminal.container.remove();
    
    // Remove tab
    $(`.terminal-tab[data-id="${conversationId}"]`)?.remove();
    
    // Remove from map
    this.terminals.delete(conversationId);
    
    // Switch to another terminal or close
    if (this.terminals.size > 0) {
      const nextId = this.terminals.keys().next().value;
      this.switchTerminal(nextId);
    } else {
      this.hide();
    }
  },
  
  /**
   * Toggle minimize
   */
  toggleMinimize() {
    const { container } = this.elements;
    
    this.isMinimized = !this.isMinimized;
    container?.classList.toggle('is-minimized', this.isMinimized);
    
    if (!this.isMinimized && this.activeTerminalId) {
      const terminal = this.terminals.get(this.activeTerminalId);
      if (terminal) {
        setTimeout(() => terminal.fitAddon.fit(), 100);
      }
    }
  },
  
  /**
   * Toggle maximize
   */
  toggleMaximize() {
    const { container } = this.elements;
    
    this.isMaximized = !this.isMaximized;
    this.isMinimized = false;
    
    container?.classList.remove('is-minimized');
    container?.classList.toggle('is-maximized', this.isMaximized);
    
    if (this.activeTerminalId) {
      const terminal = this.terminals.get(this.activeTerminalId);
      if (terminal) {
        setTimeout(() => terminal.fitAddon.fit(), 100);
      }
    }
  },
  
  /**
   * Start dragging
   */
  startDrag(e) {
    // Don't drag from buttons or tabs
    if (e.target.closest('button') || e.target.closest('.terminal-tab')) {
      return;
    }
    
    const { container } = this.elements;
    if (!container || this.isMaximized) return;
    
    this.isDragging = true;
    
    const rect = container.getBoundingClientRect();
    this.dragStart = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    container.style.transition = 'none';
  },
  
  /**
   * Handle dragging
   */
  drag(e) {
    if (!this.isDragging) return;
    
    const { container } = this.elements;
    if (!container) return;
    
    const x = e.clientX - this.dragStart.x;
    const y = e.clientY - this.dragStart.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - container.offsetWidth;
    const maxY = window.innerHeight - container.offsetHeight;
    
    container.style.left = `${utils.clamp(x, 0, maxX)}px`;
    container.style.top = `${utils.clamp(y, 0, maxY)}px`;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  },
  
  /**
   * Stop dragging
   */
  stopDrag() {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    
    const { container } = this.elements;
    if (container) {
      container.style.transition = '';
    }
  },
  
  /**
   * Start resizing
   */
  startResize(e) {
    const { container } = this.elements;
    if (!container || this.isMaximized) return;
    
    e.preventDefault();
    this.isResizing = true;
    
    this.resizeStart = {
      x: e.clientX,
      y: e.clientY,
      width: container.offsetWidth,
      height: container.offsetHeight
    };
    
    container.style.transition = 'none';
  },
  
  /**
   * Handle resizing
   */
  handleResize(e) {
    if (!this.isResizing) return;
    
    const { container } = this.elements;
    if (!container) return;
    
    const width = this.resizeStart.width + (e.clientX - this.resizeStart.x);
    const height = this.resizeStart.height + (e.clientY - this.resizeStart.y);
    
    // Minimum size
    container.style.width = `${Math.max(400, width)}px`;
    container.style.height = `${Math.max(300, height)}px`;
    
    // Fit terminal
    if (this.activeTerminalId) {
      const terminal = this.terminals.get(this.activeTerminalId);
      if (terminal) {
        terminal.fitAddon.fit();
      }
    }
  },
  
  /**
   * Stop resizing
   */
  stopResize() {
    if (!this.isResizing) return;
    
    this.isResizing = false;
    
    const { container } = this.elements;
    if (container) {
      container.style.transition = '';
    }
  },
  
  /**
   * Fit all terminals (call on window resize)
   */
  fitAll() {
    this.terminals.forEach(terminal => {
      terminal.fitAddon.fit();
    });
  }
};

// Handle window resize
window.addEventListener('resize', utils.debounce(() => {
  TerminalManager.fitAll();
}, 100));

// Export as Terminal for compatibility
window.Terminal = TerminalManager;
/* ============================================
   AI Code Executor - Main Application
   ============================================ */

/**
 * Toast notification system
 */
/* ============================================
   Global Progress Bar
   ============================================ */

const GlobalProgress = {
  elements: {},
  
  init() {
    this.elements = {
      container: $('#globalProgress'),
      bar: $('#globalProgressBar'),
      label: $('#globalProgressLabel')
    };
  },
  
  /**
   * Show progress bar with label
   * @param {string} label - Text to display
   * @param {boolean} indeterminate - If true, shows animated indeterminate state
   */
  show(label = '', indeterminate = false) {
    if (!this.elements.container) this.init();
    
    const { container, bar, label: labelEl } = this.elements;
    
    container?.classList.add('is-active');
    if (indeterminate) {
      container?.classList.add('is-indeterminate');
    } else {
      container?.classList.remove('is-indeterminate');
    }
    
    if (labelEl) labelEl.textContent = label;
    if (bar && !indeterminate) bar.style.width = '0%';
  },
  
  /**
   * Update progress
   * @param {number} percent - Progress percentage (0-100)
   * @param {string} label - Optional label update
   */
  update(percent, label = null) {
    if (!this.elements.bar) this.init();
    
    const { container, bar, label: labelEl } = this.elements;
    
    container?.classList.remove('is-indeterminate');
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (label !== null && labelEl) labelEl.textContent = label;
  },
  
  /**
   * Hide progress bar
   */
  hide() {
    if (!this.elements.container) this.init();
    
    const { container, bar } = this.elements;
    
    container?.classList.remove('is-active', 'is-indeterminate');
    if (bar) bar.style.width = '0%';
  },
  
  /**
   * Show progress with auto-hide on completion
   * @param {string} label - Label text
   * @param {number} estimatedSeconds - Estimated duration for fake progress
   */
  async showWithEstimate(label, estimatedSeconds = 10) {
    this.show(label, false);
    
    const startTime = Date.now();
    const interval = 100; // Update every 100ms
    
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        // Ease out - starts fast, slows down as it approaches 90%
        const progress = Math.min(90, (1 - Math.exp(-elapsed / (estimatedSeconds / 3))) * 90);
        this.update(progress);
      }, interval);
      
      // Store timer so it can be completed externally
      this._currentTimer = timer;
      this._resolveProgress = resolve;
    });
  },
  
  /**
   * Complete the progress (jump to 100% and hide)
   */
  complete(label = null) {
    if (this._currentTimer) {
      clearInterval(this._currentTimer);
      this._currentTimer = null;
    }
    
    this.update(100, label);
    
    setTimeout(() => {
      this.hide();
      if (this._resolveProgress) {
        this._resolveProgress();
        this._resolveProgress = null;
      }
    }, 500);
  }
};

// Export
window.GlobalProgress = GlobalProgress;

const Toast = {
  container: null,
  
  init() {
    // Create container if not exists
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  
  show(message, type = 'info', duration = 4000) {
    this.init();
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    const toast = utils.createElement(`
      <div class="toast toast--${type}">
        <span class="toast__icon">${icons[type] || icons.info}</span>
        <span class="toast__message">${utils.escapeHtml(message)}</span>
        <button class="toast__close">×</button>
      </div>
    `);
    
    // Close button
    toast.querySelector('.toast__close').addEventListener('click', () => {
      this.dismiss(toast);
    });
    
    this.container.appendChild(toast);
    
    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }
    
    return toast;
  },
  
  dismiss(toast) {
    if (!toast || !toast.parentElement) return;
    
    toast.style.animation = 'slideDown 0.2s ease forwards reverse';
    setTimeout(() => toast.remove(), 200);
  },
  
  success(message, duration) {
    return this.show(message, 'success', duration);
  },
  
  error(message, duration) {
    return this.show(message, 'error', duration);
  },
  
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  },
  
  info(message, duration) {
    return this.show(message, 'info', duration);
  }
};

/**
 * Application initialization
 */
const App = {
  /**
   * Initialize application
   */
  async init() {
    console.log('🚀 Initializing AI Code Executor...');
    
    // Initialize Toast first
    Toast.init();
    GlobalProgress.init();
    
    // Initialize all components
    try {
      // Initialize components that don't have cross-dependencies first
      Chat.init();
      Settings.init();
      Files.init();
      Stats.init();
      DockerImages.init();
      Terminal.init();
      Voice.init();
      
      // Header depends on Files, Stats, Settings, Terminal being ready
      Header.init();
      
      // Sidebar depends on Header being ready (for model)
      Sidebar.init();
      
      // Setup global event listeners
      this.setupGlobalEvents();
      
      // Apply saved view mode
      const settings = utils.storage.get('settings', {});
      if (settings.view_mode) {
        Settings.applyViewMode(settings.view_mode);
      }
      
      // Check for mobile
      this.checkMobile();
      
      console.log('✅ Application initialized');
      
    } catch (error) {
      console.error('❌ Initialization error:', error);
      Toast.error('Failed to initialize application');
    }
  },
  
  /**
   * Setup global event listeners
   */
  setupGlobalEvents() {
    // Handle window resize
    window.addEventListener('resize', utils.debounce(() => {
      this.checkMobile();
    }, 100));
    
    // Handle visibility change (reconnect sockets)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Refresh stats if panel is open
        if (State.get('activePanel') === 'stats') {
          const convId = State.get('currentConversationId');
          if (convId) Stats.startStats(convId);
        }
      }
    });
    
    // Handle beforeunload
    window.addEventListener('beforeunload', (e) => {
      if (State.get('isProcessing')) {
        e.preventDefault();
        e.returnValue = 'A message is being processed. Are you sure you want to leave?';
      }
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K: New chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        Sidebar.createNewChat();
      }
      
      // Cmd/Ctrl + /: Focus input
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        $('#messageInput')?.focus();
      }
      
      // Cmd/Ctrl + B: Toggle sidebar (on mobile)
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        Sidebar.toggleMobile(!State.get('isSidebarOpen'));
      }
    });
    
    // Mobile keyboard detection
    this.setupMobileKeyboard();
  },
  
  /**
   * Setup mobile keyboard detection
   */
  setupMobileKeyboard() {
    // Set --app-height CSS variable based on visual viewport
    // This is the key to fixing iOS Safari keyboard issues
    
    const setAppHeight = () => {
      // Use visualViewport if available (iOS Safari), otherwise window.innerHeight
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${vh}px`);
    };
    
    // Initial set
    setAppHeight();
    
    // Update on visual viewport resize (keyboard open/close)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setAppHeight);
    }
    
    // Fallback for browsers without visualViewport
    window.addEventListener('resize', setAppHeight);
    
    // Handle orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(setAppHeight, 100);
    });
    
    const input = $('#messageInput');
    const messagesContainer = $('#messagesContainer');
    
    // iOS Safari fix: When keyboard opens, Safari may scroll the page up too far.
    // We use visualViewport.offsetTop to detect this and counteract it.
    // offsetTop > 0 means the page has scrolled up - we want to keep it at 0
    // because our flex layout with --app-height handles fitting content.
    if (window.visualViewport) {
      const correctScroll = () => {
        // If the page has scrolled (offsetTop > 0), reset it
        // Our CSS layout handles the keyboard via --app-height, no page scroll needed
        if (window.visualViewport.offsetTop > 0) {
          window.scrollTo(0, 0);
        }
      };
      
      window.visualViewport.addEventListener('scroll', correctScroll);
      window.visualViewport.addEventListener('resize', correctScroll);
    }
    
    if (input && messagesContainer) {
      input.addEventListener('focus', () => {
        // Immediately try to prevent over-scroll
        window.scrollTo(0, 0);
        
        // Wait for keyboard to appear and viewport to resize
        setTimeout(() => {
          window.scrollTo(0, 0);
          // Scroll messages to bottom
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 350);
      });
    }
  },
  
  /**
   * Check and apply mobile state
   */
  checkMobile() {
    const isMobile = window.innerWidth <= 768;
    document.body.classList.toggle('is-mobile', isMobile);
    
    // Auto-close sidebar on mobile when selecting conversation
    if (isMobile && State.get('isSidebarOpen')) {
      // Keep open if user explicitly opened it
    }
  }
};

// Export globals
window.Toast = Toast;
window.App = App;

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
