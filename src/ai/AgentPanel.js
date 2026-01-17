/**
 * AgentPanel - AI Agent Interface
 * 
 * Provides a collapsible panel for interacting with the AI agent.
 * Supports multiple modes: Auto, Quick, Planning, Chatty
 * Conversations are persisted per-project
 */

import { ContextManager } from './ContextManager.js';
import { DiffPreview } from '../components/DiffPreview.js';

export class AgentPanel {
    constructor(app) {
        this.app = app;
        this.contextManager = new ContextManager(app);
        this.diffPreview = new DiffPreview(app);
        this.history = []; // Current conversation messages (for AI context)
        this.currentMode = 'auto'; // auto, quick, planning, chatty
        this.isProcessing = false;
        this.isExpanded = false; // Start collapsed
        this.currentConversationId = null;

        this.panel = document.getElementById('agent-panel');
        this.drawerTab = document.getElementById('agent-drawer-tab');
        this.modeSelect = document.getElementById('agent-mode-select');
        this.historyContainer = document.getElementById('agent-history');
        this.inputField = document.getElementById('agent-input');
        this.sendBtn = document.getElementById('agent-send-btn');
        this.statusIndicator = document.getElementById('agent-status');
        this.newConversationBtn = document.getElementById('agent-new-conversation');
        this.conversationSelect = document.getElementById('agent-conversation-select');

        this.bindEvents();
        this.loadActiveConversation();
    }

    bindEvents() {
        // Toggle panel
        if (this.drawerTab) {
            this.drawerTab.addEventListener('click', () => this.togglePanel());
        }

        // Mode change
        if (this.modeSelect) {
            this.modeSelect.addEventListener('change', (e) => {
                this.currentMode = e.target.value;
                this.updateModeIndicator();
            });
        }

        // Send message
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Enter key to send
        if (this.inputField) {
            this.inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // New conversation button
        if (this.newConversationBtn) {
            this.newConversationBtn.addEventListener('click', () => this.createNewConversation());
        }

        // Conversation select dropdown
        if (this.conversationSelect) {
            this.conversationSelect.addEventListener('change', (e) => {
                const convId = e.target.value;
                if (convId) {
                    this.loadConversation(convId);
                }
            });
        }
    }

    togglePanel() {
        this.isExpanded = !this.isExpanded;
        if (this.panel) {
            this.panel.classList.toggle('collapsed', !this.isExpanded);
        }
    }

    updateModeIndicator() {
        const modeColors = {
            auto: '#3b82f6',
            quick: '#22c55e',
            planning: '#f59e0b',
            chatty: '#a855f7'
        };

        if (this.statusIndicator) {
            this.statusIndicator.style.background = modeColors[this.currentMode] || modeColors.auto;
            this.statusIndicator.title = `Mode: ${this.currentMode}`;
        }
    }

    /**
     * Detect the appropriate mode based on user input
     */
    detectMode(input) {
        const lowerInput = input.toLowerCase();

        // Check for explicit mode prefixes
        if (lowerInput.startsWith('[quick]')) return 'quick';
        if (lowerInput.startsWith('[planning]')) return 'planning';
        if (lowerInput.startsWith('[chat]')) return 'chatty';

        // Planning patterns - big tasks that need thought/permission
        const planningPatterns = [
            /\b(draft|write)\s+(a\s+)?(new\s+)?(chapter|scene|section)/i,
            /\b(create|add)\s+(a\s+)?(new\s+)?(chapter|scene|character)/i,
            /^rewrite\s+(the\s+)?(entire|whole|all)/i,
            /^restructure/i, /^refactor/i, /^reorganize/i,
            /^plan\s/i, /^outline/i, /^analyze\s+(the\s+)?manuscript/i,
            /\bexpand\s+(this|the)\s+(scene|chapter)/i
        ];

        // Quick patterns - simple, immediate edits
        const quickPatterns = [
            /^fix\s/i, /^correct\s/i, /^grammar/i, /^spelling/i,
            /^rewrite\s/i, /^rephrase/i, /^summarize/i, /^tighten/i,
            /^shorten/i, /^lengthen/i, /^improve/i
        ];

        // Chatty patterns - discussion, not action
        // Note: Removed the greedy /\?$/ pattern - questions can be actionable
        const chattyPatterns = [
            /^what\s+(do\s+you\s+)?think/i,
            /^how\s+(should|could|would)\s+(i|we)/i,
            /^help\s+me\s+(brainstorm|think|understand)/i,
            /^discuss/i, /^explain/i,
            /^tell\s+me\s+about/i,
            /^what\s+is/i, /^who\s+is/i
        ];

        // Check planning first (higher priority for big tasks)
        for (const pattern of planningPatterns) {
            if (pattern.test(lowerInput)) return 'planning';
        }

        // Then quick for simple edits
        for (const pattern of quickPatterns) {
            if (pattern.test(lowerInput)) return 'quick';
        }

        // Then chatty for discussions
        for (const pattern of chattyPatterns) {
            if (pattern.test(lowerInput)) return 'chatty';
        }

        // Default: if it's a question, lean toward planning (user wants something done)
        // Otherwise chatty for unrecognized input
        if (lowerInput.includes('?')) {
            return 'planning'; // Questions about doing something = planning
        }

        return 'chatty'; // Default to friendly chat
    }

    /**
     * Send a message to the AI
     */
    async sendMessage() {
        if (!this.inputField || this.isProcessing) return;

        const userInput = this.inputField.value.trim();
        if (!userInput) return;

        // Check API configuration
        if (!this.app.aiService.isConfigured()) {
            this.addMessage('system', '⚠️ API not configured. Click the plug icon to add your API key.');
            return;
        }

        // Auto-create conversation if none exists
        if (!this.currentConversationId) {
            this.createNewConversation();
        }

        // Clear input
        this.inputField.value = '';

        // Use the user-selected mode (default 'auto')
        // When 'auto', the AI will decide and declare its mode in the response
        const selectedMode = this.currentMode;

        // Remove explicit mode prefix if user typed one manually
        let cleanInput = userInput
            .replace(/^\[(quick|planning|chat|chatty)\]\s*/i, '');

        // Add user message to history
        this.addMessage('user', cleanInput);

        // Show thinking message (mode will be updated when AI responds)
        if (selectedMode === 'auto') {
            this.addMessage('mode', 'AI is analyzing your request...');
        } else {
            const modeNames = {
                quick: '⚡ Quick Mode',
                planning: '📋 Planning Mode',
                chatty: '💬 Chatty Mode'
            };
            this.addMessage('mode', `Using ${modeNames[selectedMode]}`);
        }

        // Show typing indicator
        this.isProcessing = true;
        this.updateStatus('thinking');
        const typingId = this.addMessage('agent', '', true);

        try {
            // Build context
            const context = this.contextManager.buildContext({
                includeStructure: true,
                includeCurrentScene: true,
                includeCharacters: true,
                includePlot: true,
                includeNotes: cleanInput.toLowerCase().includes('note')
            });

            // Get manuscript summary for system prompt
            const summary = this.contextManager.getManuscriptSummary();

            // Build system prompt (uses selectedMode - when 'auto', AI decides)
            const systemPrompt = this.app.aiService.buildSystemPrompt(selectedMode, {
                title: summary.title,
                author: summary.author
            });

            // Build messages
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `[MANUSCRIPT CONTEXT]\n${context}\n\n[USER REQUEST]\n${cleanInput}` }
            ];

            // Add conversation history (last 5 exchanges)
            const recentHistory = this.history.slice(-10);
            for (const msg of recentHistory) {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messages.splice(-1, 0, { role: msg.role, content: msg.content });
                }
            }

            // Send to AI with streaming
            let fullResponse = '';
            let aiDeclaredMode = null;
            let modeAnnounced = false;

            await this.app.aiService.sendMessageStream(
                messages,
                (chunk, accumulated) => {
                    fullResponse = accumulated;

                    // Parse and announce AI's declared mode (only once, from first chunk)
                    if (!modeAnnounced && selectedMode === 'auto') {
                        const modeMatch = accumulated.match(/^\[MODE:\s*(quick|planning|chatty)\]/i);
                        if (modeMatch) {
                            aiDeclaredMode = modeMatch[1].toLowerCase();
                            modeAnnounced = true;

                            // Update the mode announcement
                            const modeNames = {
                                quick: '⚡ Quick Mode',
                                planning: '📋 Planning Mode',
                                chatty: '💬 Chatty Mode'
                            };
                            this.updateModeAnnouncement(`AI selected ${modeNames[aiDeclaredMode]}`);
                        }
                    }

                    // Update message (optionally strip the mode prefix from display)
                    const displayContent = accumulated.replace(/^\[MODE:\s*(quick|planning|chatty)\]\s*/i, '');
                    this.updateMessage(typingId, displayContent);
                }
            );

            // Store in history (keep full response including mode prefix for context)
            this.history.push(
                { role: 'user', content: cleanInput },
                { role: 'assistant', content: fullResponse }
            );

            // Save conversation to storage
            this.saveConversation();

            // Update status with detected mode
            this.updateStatus('ready', aiDeclaredMode || selectedMode);

        } catch (error) {
            this.updateMessage(typingId, `❌ Error: ${error.message}`);
            this.updateStatus('error');
            // Still save on error so user message is preserved
            this.saveConversation();
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Add a message to the history UI
     */
    addMessage(role, content, isTyping = false) {
        if (!this.historyContainer) return null;

        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const messageEl = document.createElement('div');

        // Handle mode announcement as a special system-like message
        if (role === 'mode') {
            messageEl.className = 'agent-message mode-announcement';
            messageEl.innerHTML = `<div class="message-content">${content}</div>`;
        } else {
            messageEl.className = `agent-message ${role}`;
            messageEl.id = messageId;
            messageEl.dataset.content = content; // Store original content for editing

            if (isTyping) {
                messageEl.classList.add('typing');
                messageEl.innerHTML = `<div class="message-content"><span class="typing-dots">...</span></div>`;
            } else if (role === 'user') {
                // User messages get an undo/edit button
                messageEl.innerHTML = `
                    <div class="message-content">${this.formatContent(content)}</div>
                    <button class="message-undo-btn" title="Edit and regenerate from here">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 10h7V3"/>
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        </svg>
                    </button>
                `;
                // Add click handler for undo
                const undoBtn = messageEl.querySelector('.message-undo-btn');
                undoBtn.addEventListener('click', () => this.rollbackToMessage(messageId, content));
            } else if (role === 'agent') {
                // Agent messages get a retry button (will be shown only on latest)
                messageEl.innerHTML = `
                    <div class="message-content">${this.formatContent(content)}</div>
                    <button class="message-retry-btn" title="Regenerate response">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                            <path d="M21 3v5h-5"/>
                        </svg>
                    </button>
                `;
                // Add click handler for retry
                const retryBtn = messageEl.querySelector('.message-retry-btn');
                retryBtn.addEventListener('click', () => this.retryLastMessage());

                // Detect and add Apply button for edits
                const edits = this.detectEditableContent(content);
                if (edits.hasEdits) {
                    const applyBtn = document.createElement('button');
                    applyBtn.className = 'message-apply-btn';
                    applyBtn.title = 'Preview and Apply Changes';
                    applyBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Apply Changes
                    `;
                    applyBtn.addEventListener('click', () => this.applyEdit(edits));

                    const contentEl = messageEl.querySelector('.message-content');
                    contentEl.after(applyBtn);
                }
            } else {
                messageEl.innerHTML = `<div class="message-content">${this.formatContent(content)}</div>`;
            }
        }

        this.historyContainer.appendChild(messageEl);
        this.historyContainer.scrollTop = this.historyContainer.scrollHeight;

        return messageId;
    }

    /**
     * Update an existing message (removes typing indicator)
     */
    updateMessage(messageId, content) {
        const messageEl = document.getElementById(messageId);
        if (messageEl) {
            messageEl.classList.remove('typing');
            messageEl.dataset.content = content; // Store for potential retry

            // Check if this is an agent message - add retry button
            if (messageEl.classList.contains('agent')) {
                messageEl.innerHTML = `
                    <div class="message-content">${this.formatContent(content)}</div>
                    <button class="message-retry-btn" title="Regenerate response">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                            <path d="M21 3v5h-5"/>
                        </svg>
                    </button>
                `;
                // Add click handler for retry
                const retryBtn = messageEl.querySelector('.message-retry-btn');
                retryBtn.addEventListener('click', () => this.retryLastMessage());

                // Detect and add Apply button for edits
                const edits = this.detectEditableContent(content);
                if (edits.hasEdits) {
                    const applyBtn = document.createElement('button');
                    applyBtn.className = 'message-apply-btn';
                    applyBtn.title = 'Preview and Apply Changes';
                    applyBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Apply Changes
                    `;
                    applyBtn.addEventListener('click', () => this.applyEdit(edits));

                    const contentEl = messageEl.querySelector('.message-content');
                    contentEl.after(applyBtn);
                }
            } else {
                const contentEl = messageEl.querySelector('.message-content');
                if (contentEl) {
                    contentEl.innerHTML = this.formatContent(content);
                }
            }

            this.historyContainer.scrollTop = this.historyContainer.scrollHeight;
        }
    }

    /**
     * Detect if content has actionable edits (diffs)
     */
    detectEditableContent(content) {
        // Look for markdown code blocks
        const diffRegex = /```(?:diff|text|markdown)?\s*\n([\s\S]*?)```/g;
        let match;
        const blocks = [];
        let isDiff = false;

        while ((match = diffRegex.exec(content)) !== null) {
            const blockContent = match[1];
            blocks.push(blockContent);
            // Check if it looks like a diff
            if (blockContent.match(/^[-+@]/m)) {
                isDiff = true;
            }
        }

        return {
            hasEdits: blocks.length > 0,
            diffs: blocks,
            isDiff: isDiff
        };
    }

    /**
     * Open diff preview for edits
     */
    applyEdit(edits) {
        if (!edits.diffs || edits.diffs.length === 0) return;

        const combinedContent = edits.diffs.join('\n\n');

        this.diffPreview.show(combinedContent, {
            type: edits.isDiff ? 'diff' : 'replacement'
        });
    }

    /**
     * Update the most recent mode announcement
     */
    updateModeAnnouncement(newText) {
        if (!this.historyContainer) return;

        // Find the last mode announcement
        const announcements = this.historyContainer.querySelectorAll('.mode-announcement');
        if (announcements.length > 0) {
            const lastAnnouncement = announcements[announcements.length - 1];
            const contentEl = lastAnnouncement.querySelector('.message-content');
            if (contentEl) {
                contentEl.textContent = newText;
            }
        }
    }

    /**
     * Roll back conversation to a specific message and put content in input for editing
     */
    rollbackToMessage(messageId, content) {
        if (this.isProcessing) return; // Don't allow during processing

        const messageEl = document.getElementById(messageId);
        if (!messageEl || !this.historyContainer) return;

        // Find all messages after this one and remove them
        let foundTarget = false;
        const messagesToRemove = [];

        for (const child of this.historyContainer.children) {
            if (foundTarget) {
                messagesToRemove.push(child);
            }
            if (child.id === messageId) {
                foundTarget = true;
                messagesToRemove.push(child); // Also remove the target message itself
            }
        }

        // Remove the messages from DOM
        for (const msg of messagesToRemove) {
            msg.remove();
        }

        // Update internal history - find and remove corresponding entries
        // We need to find the user message in history and truncate from there
        const historyIndex = this.history.findIndex(h =>
            h.role === 'user' && h.content === content
        );
        if (historyIndex !== -1) {
            this.history = this.history.slice(0, historyIndex);
        }

        // Put the content back in the input field for editing
        if (this.inputField) {
            this.inputField.value = content;
            this.inputField.focus();
        }

        // Save the updated conversation state
        this.saveConversation();
    }

    /**
     * Retry/regenerate the last AI response
     */
    retryLastMessage() {
        if (this.isProcessing) return;

        // Find the last user message in history
        let lastUserMessage = null;
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i].role === 'user') {
                lastUserMessage = this.history[i].content;
                break;
            }
        }

        if (!lastUserMessage) return;

        // Remove the last assistant message from history
        if (this.history.length > 0 && this.history[this.history.length - 1].role === 'assistant') {
            this.history.pop();
        }

        // Remove the last agent message and mode announcement from UI
        if (this.historyContainer) {
            const messages = this.historyContainer.querySelectorAll('.agent-message');
            const toRemove = [];

            // Find last agent message and any mode announcement before it
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg.classList.contains('agent')) {
                    toRemove.push(msg);
                    break;
                } else if (msg.classList.contains('mode-announcement')) {
                    toRemove.push(msg);
                }
            }

            for (const msg of toRemove) {
                msg.remove();
            }
        }

        // Put the last user message in input and trigger send
        if (this.inputField) {
            this.inputField.value = lastUserMessage;
            this.sendMessage();
        }
    }

    /**
     * Format content for display (basic markdown support)
     */
    formatContent(content) {
        if (!content) return '';

        // Escape HTML first
        let formatted = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Basic markdown
        formatted = formatted
            // Code blocks
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Diff lines
            .replace(/^- (.+)$/gm, '<span class="diff-remove">- $1</span>')
            .replace(/^\+ (.+)$/gm, '<span class="diff-add">+ $1</span>')
            // Line breaks
            .replace(/\n/g, '<br>');

        return formatted;
    }

    /**
     * Update the status indicator
     */
    updateStatus(status, mode = null) {
        if (!this.statusIndicator) return;

        const statusMap = {
            ready: { class: 'ready', title: `Ready (${mode || this.currentMode})` },
            thinking: { class: 'thinking', title: 'Thinking...' },
            error: { class: 'error', title: 'Error occurred' }
        };

        const s = statusMap[status] || statusMap.ready;
        this.statusIndicator.className = `agent-status ${s.class}`;
        this.statusIndicator.title = s.title;
    }

    /**
     * Clear conversation history (UI only)
     */
    clearHistoryUI() {
        if (this.historyContainer) {
            // Keep the welcome message
            this.historyContainer.innerHTML = `
                <div class="agent-message system">
                    <div class="message-content">👋 I'm your AI writing assistant. Ask me anything about your story, request edits, or just chat about your plot!</div>
                </div>
            `;
        }
    }

    // ========================================
    // Conversation Persistence Methods
    // ========================================

    /**
     * Load the active conversation for current project
     */
    loadActiveConversation() {
        const state = this.app.state;
        const activeId = state.activeConversationId;

        if (activeId) {
            const conversation = state.conversations?.find(c => c.id === activeId);
            if (conversation) {
                this.loadConversation(activeId);
                return;
            }
        }

        // No active conversation - show empty state
        this.currentConversationId = null;
        this.history = [];
        this.clearHistoryUI();
        this.populateConversationSelect();
    }

    /**
     * Load a specific conversation by ID
     */
    loadConversation(conversationId) {
        const state = this.app.state;
        const conversation = state.conversations?.find(c => c.id === conversationId);

        if (!conversation) {
            console.warn('Conversation not found:', conversationId);
            return;
        }

        this.currentConversationId = conversationId;
        this.history = conversation.messages.filter(m => m.role === 'user' || m.role === 'assistant');

        // Update active conversation in state
        state.activeConversationId = conversationId;
        this.app.save();

        // Render messages in UI
        this.clearHistoryUI();
        for (const msg of conversation.messages) {
            this.addMessage(msg.role, msg.content, false);
        }

        this.populateConversationSelect();
    }

    /**
     * Save current conversation to state
     */
    saveConversation() {
        if (!this.currentConversationId) return;

        const state = this.app.state;
        if (!state.conversations) state.conversations = [];

        let conversation = state.conversations.find(c => c.id === this.currentConversationId);

        if (!conversation) {
            conversation = {
                id: this.currentConversationId,
                title: 'New Conversation',
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                messages: []
            };
            state.conversations.push(conversation);
        }

        // Get messages from the UI
        const messages = [];
        if (this.historyContainer) {
            const messageEls = this.historyContainer.querySelectorAll('.agent-message');
            for (const el of messageEls) {
                let role = 'system';
                if (el.classList.contains('user')) role = 'user';
                else if (el.classList.contains('agent')) role = 'assistant';
                else if (el.classList.contains('mode-announcement')) role = 'mode';

                const content = el.querySelector('.message-content')?.textContent || '';
                if (content && !el.classList.contains('typing')) {
                    messages.push({ role, content, timestamp: new Date().toISOString() });
                }
            }
        }

        conversation.messages = messages;
        conversation.modified = new Date().toISOString();

        // Auto-title from first user message
        const firstUserMsg = messages.find(m => m.role === 'user');
        if (firstUserMsg && conversation.title === 'New Conversation') {
            conversation.title = firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
        }

        this.app.save();
        this.populateConversationSelect();
    }

    /**
     * Create a new conversation
     */
    createNewConversation() {
        const newId = crypto.randomUUID();
        this.currentConversationId = newId;
        this.history = [];

        // Update state
        const state = this.app.state;
        if (!state.conversations) state.conversations = [];

        const newConv = {
            id: newId,
            title: 'New Conversation',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            messages: []
        };
        state.conversations.push(newConv);
        state.activeConversationId = newId;
        this.app.save();

        // Clear UI
        this.clearHistoryUI();
        this.populateConversationSelect();
    }

    /**
     * Populate the conversation select dropdown
     */
    populateConversationSelect() {
        if (!this.conversationSelect) return;

        const conversations = this.app.state.conversations || [];

        // Sort by modified date (newest first)
        const sorted = [...conversations].sort((a, b) =>
            new Date(b.modified) - new Date(a.modified)
        );

        this.conversationSelect.innerHTML = '';

        // Add placeholder if no conversations
        if (sorted.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No conversations yet';
            this.conversationSelect.appendChild(option);
            return;
        }

        for (const conv of sorted) {
            const option = document.createElement('option');
            option.value = conv.id;
            option.textContent = conv.title || 'Untitled';
            if (conv.id === this.currentConversationId) {
                option.selected = true;
            }
            this.conversationSelect.appendChild(option);
        }
    }
}
