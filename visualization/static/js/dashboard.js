/**
 * AIOBS Dashboard - JavaScript Utilities
 */

// API helper
const api = {
    async get(endpoint) {
        try {
            const response = await fetch(endpoint);
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'API error');
            }
            return data.data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    async post(endpoint, body = {}) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'API error');
            }
            return data.data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};

// Format utilities
const format = {
    number(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },

    currency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    percentage(value) {
        return (value * 100).toFixed(1) + '%';
    },

    duration(ms) {
        if (ms < 1000) return ms + 'ms';
        if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
        return (ms / 60000).toFixed(1) + 'm';
    },

    relativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return days + 'd ago';
        if (hours > 0) return hours + 'h ago';
        if (minutes > 0) return minutes + 'm ago';
        return 'just now';
    }
};

// Chart utilities
const charts = {
    defaultOptions: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: false
            }
        }
    },

    colors: {
        primary: '#6366f1',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        gray: '#64748b'
    },

    generateLabels(count, unit = 'hour') {
        const labels = [];
        const now = new Date();

        for (let i = count - 1; i >= 0; i--) {
            const d = new Date(now);
            if (unit === 'hour') {
                d.setHours(d.getHours() - i);
                labels.push(d.getHours() + ':00');
            } else if (unit === 'day') {
                d.setDate(d.getDate() - i);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            }
        }

        return labels;
    },

    generateData(count, min, max) {
        const data = [];
        let value = (min + max) / 2;

        for (let i = 0; i < count; i++) {
            value += (Math.random() - 0.5) * (max - min) * 0.2;
            value = Math.max(min, Math.min(max, value));
            data.push(parseFloat(value.toFixed(2)));
        }

        return data;
    }
};

// DOM utilities
const dom = {
    show(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) element.style.display = '';
    },

    hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) element.style.display = 'none';
    },

    loading(containerId, show = true) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (show) {
            container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
        }
    },

    renderError(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--danger);">
                <i data-feather="alert-circle"></i>
                <p>${message}</p>
            </div>
        `;
        feather.replace();
    }
};

// Auto-refresh functionality
class AutoRefresh {
    constructor(callback, interval = 30000) {
        this.callback = callback;
        this.interval = interval;
        this.timer = null;
    }

    start() {
        this.stop();
        this.timer = setInterval(() => this.callback(), this.interval);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    setInterval(interval) {
        this.interval = interval;
        if (this.timer) {
            this.start();
        }
    }
}

// Real-time updates via polling
class RealtimeUpdater {
    constructor() {
        this.subscribers = new Map();
        this.interval = 5000;
        this.timer = null;
    }

    subscribe(key, endpoint, callback) {
        this.subscribers.set(key, { endpoint, callback });
        if (!this.timer) {
            this.start();
        }
    }

    unsubscribe(key) {
        this.subscribers.delete(key);
        if (this.subscribers.size === 0) {
            this.stop();
        }
    }

    start() {
        this.timer = setInterval(async () => {
            for (const [key, { endpoint, callback }] of this.subscribers) {
                try {
                    const data = await api.get(endpoint);
                    callback(data);
                } catch (error) {
                    console.error(`Error updating ${key}:`, error);
                }
            }
        }, this.interval);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}

// Export for global use
window.aiobs = {
    api,
    format,
    charts,
    dom,
    AutoRefresh,
    RealtimeUpdater
};

// Theme management
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('aiobs-theme', newTheme);

    // Update chart colors if Chart.js is loaded
    if (window.Chart) {
        Chart.defaults.color = newTheme === 'dark' ? '#94a3b8' : '#64748b';
        Chart.defaults.borderColor = newTheme === 'dark' ? '#334155' : '#e2e8f0';
    }
}

// Initialize theme from localStorage
(function initTheme() {
    const savedTheme = localStorage.getItem('aiobs-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]');
        if (searchInput) searchInput.focus();
    }

    // Ctrl/Cmd + D for dark mode toggle
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleTheme();
    }
});

console.log('AIOBS Dashboard initialized');
