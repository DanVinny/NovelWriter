/**
 * APIConfig - API Configuration Modal Handler
 * Manages AI provider settings (URL, API key, model)
 */

export class APIConfig {
    constructor(app) {
        this.app = app;
        this.modal = document.getElementById('api-config-modal');

        // Form elements
        this.aiProvider = document.getElementById('setting-ai-provider');
        this.aiApiKey = document.getElementById('setting-ai-apikey');
        this.aiModel = document.getElementById('setting-ai-model');
        this.testConnectionBtn = document.getElementById('test-ai-connection');
        this.connectionStatus = document.getElementById('ai-connection-status');
        this.toggleApiKeyBtn = document.getElementById('toggle-apikey-visibility');
        this.saveBtn = document.getElementById('save-api-config');
        this.closeBtn = document.getElementById('close-api-config');

        this.bindEvents();
    }

    bindEvents() {
        // Save button
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                this.saveConfig();
            });
        }

        // Close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Close on backdrop click
        if (this.modal) {
            const backdrop = this.modal.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', () => {
                    this.closeModal();
                });
            }
        }

        // Toggle API key visibility
        if (this.toggleApiKeyBtn) {
            this.toggleApiKeyBtn.addEventListener('click', () => {
                const isPassword = this.aiApiKey.type === 'password';
                this.aiApiKey.type = isPassword ? 'text' : 'password';
            });
        }

        // Test connection
        if (this.testConnectionBtn) {
            this.testConnectionBtn.addEventListener('click', async () => {
                await this.testConnection();
            });
        }
    }

    openModal() {
        const state = this.app.state;

        // Load current settings (empty defaults)
        if (this.aiProvider) {
            this.aiProvider.value = state.settings.aiProvider || '';
        }
        if (this.aiApiKey) {
            this.aiApiKey.value = state.settings.aiApiKey || '';
        }
        if (this.aiModel) {
            this.aiModel.value = state.settings.aiModel || '';
        }

        // Reset connection status
        if (this.connectionStatus) {
            this.connectionStatus.textContent = '';
            this.connectionStatus.className = 'connection-status';
        }

        this.modal.classList.add('open');
    }

    closeModal() {
        this.modal.classList.remove('open');
    }

    saveConfig() {
        const state = this.app.state;

        // Update AI settings
        if (this.aiProvider) {
            state.settings.aiProvider = this.aiProvider.value.trim();
        }
        if (this.aiApiKey) {
            state.settings.aiApiKey = this.aiApiKey.value.trim();
        }
        if (this.aiModel) {
            state.settings.aiModel = this.aiModel.value.trim();
        }

        // Update AIService
        if (this.app.aiService) {
            this.app.aiService.updateConfig();
        }

        // Save and close
        this.app.save();
        this.closeModal();
    }

    async testConnection() {
        if (!this.app.aiService) {
            this.showConnectionStatus('AI service not initialized', 'error');
            return;
        }

        // Temporarily update config with current form values
        const originalProvider = this.app.state.settings.aiProvider;
        const originalKey = this.app.state.settings.aiApiKey;
        const originalModel = this.app.state.settings.aiModel;

        this.app.state.settings.aiProvider = this.aiProvider?.value.trim() || '';
        this.app.state.settings.aiApiKey = this.aiApiKey?.value.trim() || '';
        this.app.state.settings.aiModel = this.aiModel?.value.trim() || '';
        this.app.aiService.updateConfig();

        // Validate required fields
        if (!this.app.state.settings.aiProvider) {
            this.showConnectionStatus('Provider URL is required', 'error');
            this.app.state.settings.aiProvider = originalProvider;
            this.app.state.settings.aiApiKey = originalKey;
            this.app.state.settings.aiModel = originalModel;
            this.app.aiService.updateConfig();
            return;
        }

        if (!this.app.state.settings.aiApiKey) {
            this.showConnectionStatus('API Key is required', 'error');
            this.app.state.settings.aiProvider = originalProvider;
            this.app.state.settings.aiApiKey = originalKey;
            this.app.state.settings.aiModel = originalModel;
            this.app.aiService.updateConfig();
            return;
        }

        this.showConnectionStatus('Testing...', 'testing');
        this.testConnectionBtn.disabled = true;

        try {
            const result = await this.app.aiService.testConnection();

            if (result.success) {
                this.showConnectionStatus(`✓ Connected to ${result.model}`, 'success');
            } else {
                this.showConnectionStatus(`✗ ${result.error}`, 'error');

                // Restore original settings on failure
                this.app.state.settings.aiProvider = originalProvider;
                this.app.state.settings.aiApiKey = originalKey;
                this.app.state.settings.aiModel = originalModel;
                this.app.aiService.updateConfig();
            }
        } catch (error) {
            this.showConnectionStatus(`✗ ${error.message}`, 'error');
        } finally {
            this.testConnectionBtn.disabled = false;
        }
    }

    showConnectionStatus(message, type) {
        if (this.connectionStatus) {
            this.connectionStatus.textContent = message;
            this.connectionStatus.className = `connection-status ${type}`;
        }
    }
}
