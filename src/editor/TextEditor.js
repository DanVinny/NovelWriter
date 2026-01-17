/**
 * TextEditor - Rich text editor component
 */

export class Editor {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('editor-content');
        this.currentItemId = null;
        this.currentItemType = null;

        this.bindEvents();
        this.applySettings();
    }

    bindEvents() {
        // Selection change for toolbar button states
        document.addEventListener('selectionchange', () => {
            this.updateToolbarState();
        });
    }

    applySettings() {
        const settings = this.app.state.settings;

        // Apply font
        this.container.style.fontFamily = `'${settings.font}', serif`;

        // Apply font size
        this.container.style.fontSize = `${settings.fontSize}px`;

        // Apply custom colors if set
        if (settings.textColor) {
            this.container.style.color = settings.textColor;
        }
        if (settings.backgroundColor) {
            this.container.parentElement.style.backgroundColor = settings.backgroundColor;
        }
    }

    loadContent(content, itemId, itemType) {
        this.currentItemId = itemId;
        this.currentItemType = itemType;

        if (content) {
            this.container.innerHTML = content;
        } else {
            this.container.innerHTML = '<p></p>';
        }

        // Focus editor
        this.container.focus();
    }

    getContent() {
        return this.container.innerHTML;
    }

    getPlainText() {
        return this.container.innerText;
    }

    updateToolbarState() {
        // Check if we're in the editor
        if (!document.activeElement || !this.container.contains(document.activeElement)) {
            return;
        }

        // Update bold button
        const boldBtn = document.getElementById('btn-bold');
        if (boldBtn) {
            boldBtn.classList.toggle('active', document.queryCommandState('bold'));
        }

        // Update italic button
        const italicBtn = document.getElementById('btn-italic');
        if (italicBtn) {
            italicBtn.classList.toggle('active', document.queryCommandState('italic'));
        }

        // Update underline button
        const underlineBtn = document.getElementById('btn-underline');
        if (underlineBtn) {
            underlineBtn.classList.toggle('active', document.queryCommandState('underline'));
        }
    }

    insertText(text) {
        document.execCommand('insertText', false, text);
    }

    focus() {
        this.container.focus();
    }
}
