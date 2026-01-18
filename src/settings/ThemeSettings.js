/**
 * ThemeSettings - Settings and theme management
 * Appearance settings only (AI config is separate)
 */

export class Settings {
    constructor(app) {
        this.app = app;
        this.modal = document.getElementById('settings-modal');

        // Appearance settings
        this.themeSelect = document.getElementById('setting-theme');
        this.fontSelect = document.getElementById('setting-font');
        this.contextStrategySelect = document.getElementById('setting-ai-context-strategy');
        this.saveBtn = document.getElementById('save-settings');

        this.bindEvents();
    }

    bindEvents() {
        this.saveBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // Close on backdrop click
        const backdrop = this.modal.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                this.closeModal();
            });
        }
    }

    openModal() {
        const state = this.app.state;
        this.themeSelect.value = state.settings.theme;
        this.fontSelect.value = state.settings.font;
        // Default to 'smart' if not set
        this.contextStrategySelect.value = state.settings.contextStrategy || 'smart';
        this.modal.classList.add('open');
    }

    closeModal() {
        this.modal.classList.remove('open');
    }

    saveSettings() {
        const state = this.app.state;

        // Update theme
        const newTheme = this.themeSelect.value;
        if (newTheme !== state.settings.theme) {
            state.settings.theme = newTheme;
            this.app.applyTheme(newTheme);
        }

        // Update font
        state.settings.font = this.fontSelect.value;

        // Update context strategy
        state.settings.contextStrategy = this.contextStrategySelect.value;

        // Apply font to editor
        const editor = document.getElementById('editor-content');
        editor.style.fontFamily = `'${state.settings.font}', serif`;

        // Save and close
        this.app.save();
        this.closeModal();
    }
}
