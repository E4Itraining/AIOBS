/**
 * AIOBS AI Chatbot Module
 * Real AI assistant with WebSocket streaming support
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        apiEndpoint: '/api/assistant/query',
        wsEndpoint: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/assistant/stream`,
        maxHistoryLength: 50,
        typingDelay: 30,
        reconnectAttempts: 3,
        reconnectDelay: 1000,
    };

    // State
    let state = {
        isOpen: false,
        isTyping: false,
        sessionId: null,
        chatHistory: [],
        ws: null,
        reconnectCount: 0,
        useStreaming: true,
        currentStreamMessage: null,
    };

    // DOM Elements
    let elements = {};

    /**
     * Initialize the chatbot
     */
    function init() {
        // Get DOM elements
        elements = {
            container: document.getElementById('chatbotContainer'),
            trigger: document.querySelector('.chatbot-trigger'),
            panel: document.querySelector('.chatbot-panel'),
            messages: document.getElementById('chatbotMessages'),
            input: document.getElementById('chatbotInput'),
            sendBtn: document.getElementById('chatbotSend'),
            suggestions: document.getElementById('chatbotSuggestions'),
            statusDot: document.querySelector('.chatbot-status .status-dot'),
            statusText: document.querySelector('.chatbot-status'),
        };

        if (!elements.container) return;

        // Load session from storage
        loadSession();

        // Setup event listeners
        setupEventListeners();

        // Check assistant status
        checkAssistantStatus();

        // Expose global functions
        window.toggleChatbot = toggleChatbot;
        window.sendChatMessage = sendChatMessage;
        window.askQuestion = askQuestion;
        window.handleChatKeypress = handleChatKeypress;

        console.log('GASKIA Chatbot initialized');
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Trigger button
        if (elements.trigger) {
            elements.trigger.addEventListener('click', toggleChatbot);
        }

        // Input field
        if (elements.input) {
            elements.input.addEventListener('keypress', handleChatKeypress);
            elements.input.addEventListener('input', handleInputChange);
        }

        // Send button
        if (elements.sendBtn) {
            elements.sendBtn.addEventListener('click', sendChatMessage);
        }

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) {
                toggleChatbot();
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (state.isOpen && elements.container && !elements.container.contains(e.target)) {
                toggleChatbot();
            }
        });
    }

    /**
     * Toggle chatbot panel
     */
    function toggleChatbot() {
        state.isOpen = !state.isOpen;

        if (elements.container) {
            elements.container.classList.toggle('open', state.isOpen);
        }

        // Update aria-expanded for accessibility
        if (elements.trigger) {
            elements.trigger.setAttribute('aria-expanded', state.isOpen.toString());
        }

        if (state.isOpen && elements.input) {
            setTimeout(() => elements.input.focus(), 100);
        }

        // Reinitialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Handle keypress in input
     */
    function handleChatKeypress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendChatMessage();
        }
    }

    /**
     * Handle input changes
     */
    function handleInputChange() {
        // Enable/disable send button
        if (elements.sendBtn && elements.input) {
            const hasText = elements.input.value.trim().length > 0;
            elements.sendBtn.disabled = !hasText || state.isTyping;
        }
    }

    /**
     * Send chat message
     */
    async function sendChatMessage() {
        const message = elements.input?.value.trim();
        if (!message || state.isTyping) return;

        // Clear input
        elements.input.value = '';
        handleInputChange();

        // Hide suggestions after first message
        if (elements.suggestions) {
            elements.suggestions.style.display = 'none';
        }

        // Add user message
        addMessage(message, 'user');
        state.chatHistory.push({ role: 'user', content: message });

        // Show typing indicator
        const typingId = showTypingIndicator();
        state.isTyping = true;

        try {
            if (state.useStreaming && window.WebSocket) {
                await sendStreamingMessage(message, typingId);
            } else {
                await sendHttpMessage(message, typingId);
            }
        } catch (error) {
            console.error('Chat error:', error);
            removeTypingIndicator(typingId);
            addMessage(getErrorMessage(), 'bot', null, true);
        }

        state.isTyping = false;
        saveSession();
    }

    /**
     * Send message via HTTP
     */
    async function sendHttpMessage(message, typingId) {
        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: message,
                session_id: state.sessionId,
                language: window.GASKIA?.lang || 'en',
                context: { history: state.chatHistory.slice(-6) }
            })
        });

        removeTypingIndicator(typingId);

        if (response.ok) {
            const data = await response.json();
            state.sessionId = data.session_id || state.sessionId;
            addMessage(data.answer, 'bot', data);
            state.chatHistory.push({ role: 'assistant', content: data.answer });
        } else {
            addMessage(getErrorMessage(), 'bot', null, true);
        }
    }

    /**
     * Send message via WebSocket streaming
     */
    async function sendStreamingMessage(message, typingId) {
        return new Promise((resolve, reject) => {
            // Create WebSocket connection if needed
            if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
                try {
                    state.ws = new WebSocket(CONFIG.wsEndpoint);
                } catch (e) {
                    // Fall back to HTTP
                    state.useStreaming = false;
                    return sendHttpMessage(message, typingId).then(resolve).catch(reject);
                }

                state.ws.onopen = () => {
                    sendWsMessage(message);
                };

                state.ws.onerror = (error) => {
                    console.warn('WebSocket error, falling back to HTTP:', error);
                    state.useStreaming = false;
                    state.ws = null;
                    sendHttpMessage(message, typingId).then(resolve).catch(reject);
                };

                state.ws.onclose = () => {
                    state.ws = null;
                };

                state.ws.onmessage = (event) => {
                    handleWsMessage(event, typingId, resolve, reject);
                };
            } else {
                sendWsMessage(message);

                // Update message handler
                state.ws.onmessage = (event) => {
                    handleWsMessage(event, typingId, resolve, reject);
                };
            }
        });
    }

    /**
     * Send message through WebSocket
     */
    function sendWsMessage(message) {
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
            state.ws.send(JSON.stringify({
                query: message,
                session_id: state.sessionId,
                language: window.GASKIA?.lang || 'en',
                context: { history: state.chatHistory.slice(-6) }
            }));
        }
    }

    /**
     * Handle WebSocket message
     */
    function handleWsMessage(event, typingId, resolve, reject) {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'chunk') {
                // Remove typing indicator on first chunk
                if (state.currentStreamMessage === null) {
                    removeTypingIndicator(typingId);
                    state.currentStreamMessage = '';
                }

                // Append chunk to streaming message
                state.currentStreamMessage += data.content;
                updateStreamingMessage(state.currentStreamMessage);

            } else if (data.type === 'done') {
                // Finalize message
                if (state.currentStreamMessage !== null) {
                    state.chatHistory.push({ role: 'assistant', content: state.currentStreamMessage });
                    state.sessionId = data.session_id || state.sessionId;
                }
                state.currentStreamMessage = null;
                resolve();

            } else if (data.type === 'error') {
                removeTypingIndicator(typingId);
                state.currentStreamMessage = null;
                addMessage(data.content || getErrorMessage(), 'bot', null, true);
                reject(new Error(data.content));
            }
        } catch (e) {
            console.error('WebSocket message parse error:', e);
        }
    }

    /**
     * Update streaming message in UI
     */
    function updateStreamingMessage(content) {
        let streamingMsg = document.querySelector('.chat-message-streaming');

        if (!streamingMsg) {
            // Create new streaming message element
            streamingMsg = document.createElement('div');
            streamingMsg.className = 'chat-message chat-message-bot chat-message-streaming';
            streamingMsg.innerHTML = `<div class="chat-message-content"></div>`;
            elements.messages.appendChild(streamingMsg);
        }

        const contentEl = streamingMsg.querySelector('.chat-message-content');
        if (contentEl) {
            contentEl.innerHTML = formatMessage(content);
        }

        scrollToBottom();
    }

    /**
     * Ask a preset question
     */
    function askQuestion(question) {
        if (elements.input) {
            elements.input.value = question;
        }
        sendChatMessage();
    }

    /**
     * Add message to chat
     */
    function addMessage(text, sender, data = null, isError = false) {
        // Remove streaming class if exists
        const streamingMsg = document.querySelector('.chat-message-streaming');
        if (streamingMsg) {
            streamingMsg.classList.remove('chat-message-streaming');
        }

        // Don't create new message if we're updating streaming
        if (streamingMsg && sender === 'bot' && !isError) {
            const contentEl = streamingMsg.querySelector('.chat-message-content');
            if (contentEl) {
                contentEl.innerHTML = formatMessage(text);
                addMessageExtras(streamingMsg, data);
            }
            scrollToBottom();
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message chat-message-${sender}${isError ? ' chat-message-error' : ''}`;

        let content = `<div class="chat-message-content">${formatMessage(text)}</div>`;
        messageDiv.innerHTML = content;

        addMessageExtras(messageDiv, data);

        elements.messages.appendChild(messageDiv);
        scrollToBottom();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Add extras to message (actions, links)
     */
    function addMessageExtras(messageDiv, data) {
        if (!data) return;

        // Add suggested actions
        if (data.suggested_actions && data.suggested_actions.length > 0) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'chat-actions';
            data.suggested_actions.slice(0, 3).forEach(action => {
                const btn = document.createElement('button');
                btn.className = 'chat-action-btn';
                btn.textContent = action;
                btn.onclick = () => askQuestion(action);
                actionsDiv.appendChild(btn);
            });
            messageDiv.appendChild(actionsDiv);
        }

        // Add model info if available
        if (data.model && data.provider) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'chat-model-info';
            infoDiv.innerHTML = `<i data-lucide="cpu"></i> ${data.provider}/${data.model}`;
            messageDiv.appendChild(infoDiv);
        }
    }

    /**
     * Format message with markdown-like styling
     */
    function formatMessage(text) {
        if (!text) return '';

        return text
            // Code blocks
            .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Headers
            .replace(/^### (.+)$/gm, '<h4>$1</h4>')
            .replace(/^## (.+)$/gm, '<h3>$1</h3>')
            .replace(/^# (.+)$/gm, '<h2>$1</h2>')
            // Lists
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            // Wrap in paragraph
            .replace(/^(.+)$/s, '<p>$1</p>')
            // Clean up empty paragraphs
            .replace(/<p><\/p>/g, '')
            // Wrap lists
            .replace(/(<li>.*<\/li>)+/gs, '<ul>$&</ul>');
    }

    /**
     * Show typing indicator
     */
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        const typingId = 'typing-' + Date.now();
        typingDiv.id = typingId;
        typingDiv.className = 'chat-message chat-message-bot chat-typing';
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
        elements.messages.appendChild(typingDiv);
        scrollToBottom();
        return typingId;
    }

    /**
     * Remove typing indicator
     */
    function removeTypingIndicator(typingId) {
        const typing = document.getElementById(typingId);
        if (typing) typing.remove();
    }

    /**
     * Scroll messages to bottom
     */
    function scrollToBottom() {
        if (elements.messages) {
            elements.messages.scrollTop = elements.messages.scrollHeight;
        }
    }

    /**
     * Get localized error message
     */
    function getErrorMessage() {
        const lang = window.GASKIA?.lang || 'en';
        return lang === 'fr'
            ? 'Desolee, une erreur s\'est produite. Veuillez reessayer.'
            : 'Sorry, an error occurred. Please try again.';
    }

    /**
     * Check assistant status
     */
    async function checkAssistantStatus() {
        try {
            const response = await fetch('/api/assistant/status');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    updateStatusIndicator(data.data.status === 'online', data.data);
                }
            }
        } catch (e) {
            console.warn('Could not check assistant status:', e);
        }
    }

    /**
     * Update status indicator
     */
    function updateStatusIndicator(isOnline, data = null) {
        if (elements.statusDot) {
            elements.statusDot.style.backgroundColor = isOnline ? '#10b981' : '#ef4444';
        }

        if (elements.statusText && data) {
            const providerInfo = data.provider !== 'mock' ? ` (${data.provider})` : '';
            const lang = window.GASKIA?.lang || 'en';
            const statusText = isOnline
                ? (lang === 'fr' ? 'En ligne' : 'Online') + providerInfo
                : (lang === 'fr' ? 'Hors ligne' : 'Offline');

            // Update only the text content, preserving the dot
            const textNode = elements.statusText.childNodes[1];
            if (textNode) {
                textNode.textContent = statusText;
            }
        }
    }

    /**
     * Load session from storage
     */
    function loadSession() {
        try {
            const saved = localStorage.getItem('gaskia-chat-session');
            if (saved) {
                const data = JSON.parse(saved);
                state.sessionId = data.sessionId;
                // Don't restore old messages to keep it fresh
            }
        } catch (e) {
            console.warn('Could not load chat session:', e);
        }

        // Generate new session ID if needed
        if (!state.sessionId) {
            state.sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }
    }

    /**
     * Save session to storage
     */
    function saveSession() {
        try {
            localStorage.setItem('gaskia-chat-session', JSON.stringify({
                sessionId: state.sessionId,
                lastUpdated: Date.now()
            }));
        } catch (e) {
            console.warn('Could not save chat session:', e);
        }
    }

    /**
     * Clear chat history
     */
    function clearChat() {
        state.chatHistory = [];

        if (elements.messages) {
            // Keep only the welcome message
            const welcome = elements.messages.querySelector('.chatbot-welcome');
            const suggestions = elements.messages.querySelector('.chatbot-suggestions');
            elements.messages.innerHTML = '';
            if (welcome) elements.messages.appendChild(welcome);
            if (suggestions) {
                suggestions.style.display = '';
                elements.messages.appendChild(suggestions);
            }
        }

        // Clear session on server
        fetch(`/api/assistant/session/${state.sessionId}`, { method: 'DELETE' });

        // Generate new session
        state.sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        saveSession();
    }

    // Expose clear function
    window.clearChat = clearChat;

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
