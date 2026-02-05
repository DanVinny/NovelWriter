/**
 * ScreenplayEditor - Plaintext editor with live Fountain preview
 * 
 * Provides a split-view editor:
 * - Left: Plain text input for writing in Fountain format
 * - Right: Formatted preview matching industry screenplay standards
 */
import { FountainParser } from './FountainParser.js';

export class ScreenplayEditor {
    constructor(app, container) {
        this.app = app;
        this.container = container;
        this.parser = new FountainParser();
        this.currentScene = null;
        this.autoSaveTimeout = null;

        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="screenplay-editor-wrapper">
                <div class="screenplay-source">
                    <div class="screenplay-source-header">
                        <span class="source-label">✏️ Fountain Source</span>
                    </div>
                    <textarea 
                        class="fountain-input" 
                        id="fountain-input" 
                        placeholder="Start writing your screenplay in Fountain format...

Example:
INT. COFFEE SHOP - DAY

SARAH sits at a corner table, nervously checking her phone.

JOHN enters, spots her, and walks over.

JOHN
Hey. Sorry I'm late.

SARAH
(coldly)
You're always late."
                        spellcheck="true"
                    ></textarea>
                </div>
                <div class="screenplay-preview-container">
                    <div class="screenplay-preview-header">
                        <span class="preview-label">🎬 Preview</span>
                    </div>
                    <div class="screenplay-preview" id="screenplay-preview">
                        <div class="screenplay-preview-content" id="screenplay-preview-content">
                            <!-- Rendered screenplay will appear here -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.input = this.container.querySelector('#fountain-input');
        this.preview = this.container.querySelector('#screenplay-preview-content');
        this.statsDisplay = this.container.querySelector('#screenplay-stats');
    }

    bindEvents() {
        if (!this.input) return;

        // Live preview on input
        this.input.addEventListener('input', () => {
            this.updatePreview();
            this.scheduleAutoSave();
        });

        // Tab key for indentation
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.input.selectionStart;
                const end = this.input.selectionEnd;
                const value = this.input.value;

                // Insert tab character (or spaces)
                this.input.value = value.substring(0, start) + '    ' + value.substring(end);
                this.input.selectionStart = this.input.selectionEnd = start + 4;

                this.updatePreview();
                this.scheduleAutoSave();
            }

            // Auto-uppercase for character names after blank line + Enter
            if (e.key === 'Enter') {
                const lines = this.input.value.substring(0, this.input.selectionStart).split('\n');
                const currentLine = lines[lines.length - 1];
                const prevLine = lines.length > 1 ? lines[lines.length - 2] : '';

                // If previous line was blank and current line looks like a character name
                if (prevLine.trim() === '' && /^[a-z]/.test(currentLine.trim())) {
                    // Could auto-capitalize here if desired
                }
            }
        });

        // Sync scroll (optional - preview follows source)
        this.input.addEventListener('scroll', () => {
            const scrollPercent = this.input.scrollTop / (this.input.scrollHeight - this.input.clientHeight);
            const previewContainer = this.container.querySelector('#screenplay-preview');
            if (previewContainer) {
                previewContainer.scrollTop = scrollPercent * (previewContainer.scrollHeight - previewContainer.clientHeight);
            }
        });
    }

    loadScene(scene) {
        this.currentScene = scene;
        if (this.input) {
            this.input.value = scene.content || '';
            this.updatePreview();
        }
        // Render suggestions panel if any exist
        this.renderSuggestions(scene);
    }

    renderSuggestions(scene) {
        // Remove any existing suggestions panel
        const existingPanel = this.container.querySelector('.screenplay-suggestions-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        if (!scene?.suggestions?.items?.length) return;

        const suggestions = scene.suggestions.items;
        const typeLabels = {
            expand: 'Expand', shorten: 'Shorten', dialogue: 'Dialogue',
            sensory: 'Sensory', grammar: 'Grammar', prose: 'Prose', review: 'Review',
            anchor: 'Anchor'
        };

        const panel = document.createElement('div');
        panel.className = 'screenplay-suggestions-panel';
        panel.innerHTML = `
            <div class="suggestions-header">
                <span class="suggestions-title">🤖 ${typeLabels[scene.suggestions.type] || 'Script'} Suggestions</span>
                <span class="suggestions-count">${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''}</span>
                <button class="suggestions-toggle" title="Toggle panel">▼</button>
            </div>
            <div class="suggestions-body">
                ${suggestions.map(s => `
                    <div class="suggestion-item" data-id="${s.id}">
                        <span class="suggestion-number">S${s.number}</span>
                        <span class="suggestion-text">${s.text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</span>
                    </div>
                `).join('')}
            </div>
        `;

        // Add CSS inline for the panel (could be moved to main.css later)
        panel.style.cssText = `
            background: var(--bg-secondary, #1e1e1e);
            border-top: 1px solid var(--border-color, #333);
            padding: 0;
            max-height: 300px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        const header = panel.querySelector('.suggestions-header');
        header.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            background: var(--bg-tertiary, #252525);
            border-bottom: 1px solid var(--border-color, #333);
            cursor: pointer;
        `;

        const body = panel.querySelector('.suggestions-body');
        body.style.cssText = `
            overflow-y: auto;
            padding: 12px 16px;
            flex: 1;
        `;

        panel.querySelectorAll('.suggestion-item').forEach(item => {
            item.style.cssText = `
                display: flex;
                gap: 12px;
                margin-bottom: 12px;
                padding: 8px 12px;
                background: var(--bg-primary, #181818);
                border-radius: 6px;
                border-left: 3px solid var(--accent-color, #4a9eff);
            `;
        });

        panel.querySelectorAll('.suggestion-number').forEach(num => {
            num.style.cssText = `
                font-weight: bold;
                color: var(--accent-color, #4a9eff);
                flex-shrink: 0;
            `;
        });

        panel.querySelectorAll('.suggestion-text').forEach(text => {
            text.style.cssText = `
                color: var(--text-secondary, #aaa);
                line-height: 1.5;
            `;
        });

        // Toggle functionality
        const toggleBtn = panel.querySelector('.suggestions-toggle');
        toggleBtn.style.cssText = `
            background: none;
            border: none;
            color: var(--text-secondary, #aaa);
            cursor: pointer;
            margin-left: auto;
            font-size: 12px;
        `;

        header.addEventListener('click', () => {
            const isHidden = body.style.display === 'none';
            body.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '▼' : '▶';
            panel.style.maxHeight = isHidden ? '300px' : '40px';
        });

        // Insert panel after the editor wrapper
        const wrapper = this.container.querySelector('.screenplay-editor-wrapper');
        if (wrapper) {
            wrapper.insertAdjacentElement('afterend', panel);
        }
    }

    updatePreview() {
        if (!this.input || !this.preview) return;

        const text = this.input.value;
        const elements = this.parser.parse(text);
        this.preview.innerHTML = this.parser.toHTML(elements);

        // Update stats
        this.updateStats(elements, text);
    }

    updateStats(elements, text) {
        if (!this.statsDisplay) return;

        const stats = this.parser.getStats(elements);
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

        this.statsDisplay.innerHTML = `
            <span class="stat">📄 ~${stats.estimatedPages} pages</span>
            <span class="stat">🎬 ${stats.sceneCount} scenes</span>
            <span class="stat">📝 ${wordCount} words</span>
        `;
    }

    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        this.autoSaveTimeout = setTimeout(() => {
            this.save();
        }, 1000); // Auto-save after 1 second of inactivity
    }

    save() {
        if (this.currentScene && this.input) {
            const content = this.input.value;
            this.currentScene.content = content;
            this.currentScene.wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
            this.app.save();
        }
    }

    getContent() {
        return this.input?.value || '';
    }

    focus() {
        if (this.input) {
            this.input.focus();
        }
    }

    /**
     * Insert text at cursor position
     */
    insertText(text) {
        if (!this.input) return;

        const start = this.input.selectionStart;
        const end = this.input.selectionEnd;
        const value = this.input.value;

        this.input.value = value.substring(0, start) + text + value.substring(end);
        this.input.selectionStart = this.input.selectionEnd = start + text.length;

        this.updatePreview();
        this.scheduleAutoSave();
        this.input.focus();
    }

    /**
     * Insert a scene heading template
     */
    insertSceneHeading(intExt = 'INT', location = 'LOCATION', time = 'DAY') {
        this.insertText(`\n${intExt}. ${location} - ${time}\n\n`);
    }

    /**
     * Insert a character cue
     */
    insertCharacter(name = 'CHARACTER') {
        this.insertText(`\n${name.toUpperCase()}\n`);
    }

    /**
     * Insert a transition
     */
    insertTransition(transition = 'CUT TO:') {
        this.insertText(`\n${transition}\n\n`);
    }

    /**
     * Destroy the editor and clean up
     */
    destroy() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        this.save();
        this.container.innerHTML = '';
    }
}
