/**
 * APIConfig - API Configuration Modal Handler
 * Manages AI provider settings (URL, API key, model)
 */

export class APIConfig {
    constructor(app) {
        this.app = app;
        this.modal = document.getElementById('api-config-modal');

        // Main API form elements
        this.aiProvider = document.getElementById('setting-ai-provider');
        this.aiApiKey = document.getElementById('setting-ai-apikey');
        this.aiModel = document.getElementById('setting-ai-model');
        this.testConnectionBtn = document.getElementById('test-ai-connection');
        this.connectionStatus = document.getElementById('ai-connection-status');
        this.toggleApiKeyBtn = document.getElementById('toggle-apikey-visibility');
        this.saveBtn = document.getElementById('save-api-config');
        this.closeBtn = document.getElementById('close-api-config');

        // Alive Editor API form elements
        this.aliveProvider = document.getElementById('setting-alive-provider');
        this.aliveApiKey = document.getElementById('setting-alive-apikey');
        this.aliveModel = document.getElementById('setting-alive-model');

        // Image Model form elements
        this.imageProvider = document.getElementById('setting-image-provider');
        this.imageApiKey = document.getElementById('setting-image-apikey');
        this.imageModel = document.getElementById('setting-image-model');
        this.imageStyle = document.getElementById('setting-image-style');

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
        // Load current settings from localStorage
        if (this.aiProvider) {
            this.aiProvider.value = localStorage.getItem('novelwriter-ai-provider') || '';
        }
        if (this.aiApiKey) {
            this.aiApiKey.value = localStorage.getItem('novelwriter-ai-apikey') || '';
        }
        if (this.aiModel) {
            this.aiModel.value = localStorage.getItem('novelwriter-ai-model') || '';
        }

        // Load Alive Editor settings
        if (this.aliveProvider) {
            this.aliveProvider.value = localStorage.getItem('novelwriter-alive-provider') || '';
        }
        if (this.aliveApiKey) {
            this.aliveApiKey.value = localStorage.getItem('novelwriter-alive-apikey') || '';
        }
        if (this.aliveModel) {
            this.aliveModel.value = localStorage.getItem('novelwriter-alive-model') || '';
        }

        // Load Image Model settings
        if (this.imageProvider) {
            this.imageProvider.value = localStorage.getItem('novelwriter-image-provider') || '';
        }
        if (this.imageApiKey) {
            this.imageApiKey.value = localStorage.getItem('novelwriter-image-apikey') || '';
        }
        if (this.imageModel) {
            this.imageModel.value = localStorage.getItem('novelwriter-image-model') || '';
        }
        if (this.imageStyle) {
            this.imageStyle.value = localStorage.getItem('novelwriter-image-style') || '';
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
        // Update AI settings
        if (this.aiProvider) localStorage.setItem('novelwriter-ai-provider', this.aiProvider.value.trim());
        if (this.aiApiKey) localStorage.setItem('novelwriter-ai-apikey', this.aiApiKey.value.trim());
        if (this.aiModel) localStorage.setItem('novelwriter-ai-model', this.aiModel.value.trim());

        // Update Alive Editor settings
        if (this.aliveProvider) localStorage.setItem('novelwriter-alive-provider', this.aliveProvider.value.trim());
        if (this.aliveApiKey) localStorage.setItem('novelwriter-alive-apikey', this.aliveApiKey.value.trim());
        if (this.aliveModel) localStorage.setItem('novelwriter-alive-model', this.aliveModel.value.trim());

        // Update Image Model settings
        if (this.imageProvider) localStorage.setItem('novelwriter-image-provider', this.imageProvider.value.trim());
        if (this.imageApiKey) localStorage.setItem('novelwriter-image-apikey', this.imageApiKey.value.trim());
        if (this.imageModel) localStorage.setItem('novelwriter-image-model', this.imageModel.value.trim());
        if (this.imageStyle) localStorage.setItem('novelwriter-image-style', this.imageStyle.value.trim());

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

        // Temporarily update config with current form values (write to localStorage temporarily is fine, or update memory)
        // Since AIService reads from localStorage now, we must save to localStorage to test

        const originalProvider = localStorage.getItem('novelwriter-ai-provider');
        const originalKey = localStorage.getItem('novelwriter-ai-apikey');
        const originalModel = localStorage.getItem('novelwriter-ai-model');

        localStorage.setItem('novelwriter-ai-provider', this.aiProvider?.value.trim() || '');
        localStorage.setItem('novelwriter-ai-apikey', this.aiApiKey?.value.trim() || '');
        localStorage.setItem('novelwriter-ai-model', this.aiModel?.value.trim() || '');

        this.app.aiService.updateConfig();

        // Validate required fields
        if (!localStorage.getItem('novelwriter-ai-provider')) {
            this.showConnectionStatus('Provider URL is required', 'error');
            return;
        }

        if (!localStorage.getItem('novelwriter-ai-apikey')) {
            this.showConnectionStatus('API Key is required', 'error');
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

                // On failure we might want to revert? But usually user is editing to fix it.
                // Keeping the values in the inputs is fine.
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
