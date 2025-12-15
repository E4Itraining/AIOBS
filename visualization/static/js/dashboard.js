/**
 * AIOBS Dashboard v2.0 - JavaScript Utilities
 * Modern, Clean, Professional Interface
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

// Chart utilities with modern design tokens
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
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleFont: { size: 12, weight: '600' },
                bodyFont: { size: 11 },
                padding: 12,
                cornerRadius: 8,
                displayColors: false
            }
        }
    },

    colors: {
        primary: '#6366f1',
        primaryLight: 'rgba(99, 102, 241, 0.1)',
        success: '#10b981',
        successLight: 'rgba(16, 185, 129, 0.1)',
        warning: '#f59e0b',
        warningLight: 'rgba(245, 158, 11, 0.1)',
        danger: '#ef4444',
        dangerLight: 'rgba(239, 68, 68, 0.1)',
        info: '#3b82f6',
        infoLight: 'rgba(59, 130, 246, 0.1)',
        gray: '#64748b',
        grayLight: 'rgba(100, 116, 139, 0.1)',
        border: '#e2e8f0'
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
            } else if (unit === 'month') {
                d.setDate(d.getDate() - i);
                labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
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
    },

    // Preset chart configurations
    lineChartConfig(data, label, color = 'primary') {
        return {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: label,
                    data: data.values,
                    borderColor: this.colors[color],
                    backgroundColor: this.colors[color + 'Light'] || this.colors.primaryLight,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { size: 11 } }
                    },
                    y: {
                        grid: { color: '#e2e8f0' },
                        ticks: { color: '#64748b', font: { size: 11 } }
                    }
                }
            }
        };
    },

    doughnutChartConfig(data, labels, colors) {
        return {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors || Object.values(this.colors).slice(0, data.length),
                    borderWidth: 0,
                    spacing: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 12 }
                        }
                    }
                }
            }
        };
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

    skeleton(containerId, lines = 3) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = '';
        for (let i = 0; i < lines; i++) {
            const width = 60 + Math.random() * 40;
            html += `<div class="skeleton" style="height: 16px; width: ${width}%; margin-bottom: 8px;"></div>`;
        }
        container.innerHTML = html;
    },

    renderError(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle"></i>
                <h3>Error</h3>
                <p class="text-muted">${message}</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    },

    renderEmpty(containerId, title = 'No data', message = '') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="inbox"></i>
                <h3>${title}</h3>
                ${message ? `<p class="text-muted">${message}</p>` : ''}
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
};

// Auto-refresh functionality
class AutoRefresh {
    constructor(callback, interval = 30000) {
        this.callback = callback;
        this.interval = interval;
        this.timer = null;
        this.paused = false;
    }

    start() {
        this.stop();
        this.paused = false;
        this.timer = setInterval(() => {
            if (!this.paused) this.callback();
        }, this.interval);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
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

// Update Chart.js defaults based on theme
function updateChartTheme(theme) {
    if (window.Chart) {
        const isDark = theme === 'dark';
        Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
        Chart.defaults.borderColor = isDark ? '#334155' : '#e2e8f0';
    }
}

// Initialize theme from localStorage
(function initTheme() {
    const savedTheme = localStorage.getItem('aiobs-theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateChartTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateChartTheme('dark');
    }
})();

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], .form-input[type="search"]');
        if (searchInput) searchInput.focus();
    }

    // Ctrl/Cmd + D for dark mode toggle
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (typeof toggleTheme === 'function') toggleTheme();
    }

    // Escape to close modals/sidebars
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            if (typeof closeSidebar === 'function') closeSidebar();
        }
    }
});

// Visibility change handling for auto-refresh
document.addEventListener('visibilitychange', () => {
    if (window.aiobs?.autoRefresh) {
        if (document.hidden) {
            window.aiobs.autoRefresh.pause();
        } else {
            window.aiobs.autoRefresh.resume();
        }
    }
});

// Initialize Lucide icons when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }
});

console.log('AIOBS Dashboard v2.0 initialized');
