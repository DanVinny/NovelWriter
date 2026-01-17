/**
 * DiffPreview Component
 * Handles parsing, visualizing, and applying text changes
 */

export class DiffPreview {
    constructor(app) {
        this.app = app;
        this.modal = document.getElementById('diff-preview-modal');
        this.container = document.getElementById('diff-body');
        this.cancelBtn = document.getElementById('diff-cancel');
        this.applyBtn = document.getElementById('diff-apply');

        this.currentDiff = null;
        this.currentSource = null; // 'agent' or 'selection'

        this.bindEvents();
    }

    bindEvents() {
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.hide());
        }

        if (this.applyBtn) {
            this.applyBtn.addEventListener('click', () => this.applyChanges());
        }

        // Close on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.hide();
            });

            // Close button
            const closeBtn = this.modal.querySelector('.close-modal');
            if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
        }
    }

    /**
     * Parse a unified diff string into structured blocks
     * Expects standard git diff format or code blocks with diff language
     */
    parseDiff(diffText) {
        const lines = diffText.split('\n');
        const changes = [];
        let currentBlock = { type: 'context', lines: [] };

        for (const line of lines) {
            // Skip diff headers if present
            if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
                continue;
            }

            // Hunk header
            if (line.startsWith('@@')) {
                if (currentBlock.lines.length > 0) {
                    changes.push(currentBlock);
                }
                currentBlock = { type: 'context', lines: [] };
                changes.push({ type: 'header', content: line });
                continue;
            }

            if (line.startsWith('+')) {
                // Addition
                if (currentBlock.type !== 'add') {
                    if (currentBlock.lines.length > 0) changes.push(currentBlock);
                    currentBlock = { type: 'add', lines: [] };
                }
                currentBlock.lines.push(line.substring(1));
            } else if (line.startsWith('-')) {
                // Deletion
                if (currentBlock.type !== 'remove') {
                    if (currentBlock.lines.length > 0) changes.push(currentBlock);
                    currentBlock = { type: 'remove', lines: [] };
                }
                currentBlock.lines.push(line.substring(1));
            } else {
                // Context (unchanged)
                if (currentBlock.type !== 'context') {
                    if (currentBlock.lines.length > 0) changes.push(currentBlock);
                    currentBlock = { type: 'context', lines: [] };
                }
                // Handle space at start of context line if present, but be robust if missing
                currentBlock.lines.push(line.startsWith(' ') ? line.substring(1) : line);
            }
        }

        if (currentBlock.lines.length > 0) {
            changes.push(currentBlock);
        }

        return changes;
    }

    /**
     * Show the diff preview modal
     * @param {string} diffContent - The raw diff text
     * @param {Object} context - Metadata about where to apply changes
     */
    show(diffContent, context = {}) {
        this.currentDiff = diffContent;
        this.currentContext = context;

        // Render the diff
        const changes = this.parseDiff(diffContent);
        this.renderDiff(changes);

        // Show modal
        if (this.modal) {
            this.modal.classList.add('visible');
        }
    }

    hide() {
        if (this.modal) {
            this.modal.classList.remove('visible');
        }
        this.currentDiff = null;
    }

    renderDiff(changes) {
        if (!this.container) return;

        this.container.innerHTML = '';

        changes.forEach(block => {
            const blockEl = document.createElement('div');
            blockEl.className = `diff-block diff-${block.type}`;

            if (block.type === 'header') {
                blockEl.textContent = block.content;
                blockEl.className = 'diff-header-line';
            } else {
                blockEl.innerHTML = block.lines.map(line =>
                    // Escape HTML to prevent injection, then preserve spaces
                    `<div>${this.escapeHtml(line) || '&nbsp;'}</div>`
                ).join('');
            }

            this.container.appendChild(blockEl);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Apply the changes to the actual editor/manuscript
     */
    applyChanges() {
        // Find the active editor
        const editor = document.getElementById('editor-content');
        if (!editor || !this.currentDiff) return;

        // Verify we're applying to the correct content type (usually scene)
        if (!this.app.currentContext || this.app.currentContext.type !== 'scene') {
            alert('Cannot apply changes: No active scene.');
            return;
        }

        // 1. Save current state for Undo
        // TODO: Implement proper Undo Stack in App or Editor

        // 2. Parse diff and apply to content
        const currentContent = editor.innerText; // Use text for robust matching? Or innerHTML? 
        // Diff usually works on lines. HTML structure complicates this.
        // Strategy: Convert visual lines to text, apply diff, render back?
        // Risky for formatting.

        // Alternative: If diff is "replacement" (common in AI), just replace text.
        // Ideally AI returns a REPLACE block or we treat the diff as a patch.

        // For Phase 1, we will implement a simple "Fuzzy Patch" or "Block Replace"
        // If it's a diff, we try to locate the "-" lines and replace with "+" lines.

        try {
            const success = this.applyPatchToEditor(editor, this.currentDiff);
            if (success) {
                // Trigger save
                this.app.saveCurrentContent();
                // Notify user
                const status = document.getElementById('save-status');
                if (status) {
                    status.textContent = 'Changes Applied';
                    setTimeout(() => status.textContent = 'Saved', 2000);
                }
                this.hide();
            } else {
                alert('Could not auto-apply changes. The text might have changed since the suggestion was made.');
            }
        } catch (e) {
            console.error('Failed to apply diff:', e);
            alert('Error applying changes: ' + e.message);
        }
    }

    applyPatchToEditor(editor, diffText) {
        // Naive implementation: 
        // 1. Get plain text of editor
        // 2. Apply textual patch
        // 3. Update editor innerText (loses formatting!)
        // BETTER: We need to preserve formatting.
        // OR: We accept that AI rewrites lose generic HTML formatting unless AI outputs HTML.
        // Compromise: We replace the innerHTML if the AI provides a full rewrite.
        // If it's a partial diff, we try to match text nodes.

        console.log('Applying patch...');
        // For now, let's assume the AI is rewriting paragraphs.

        const rawContent = editor.innerHTML;
        // This is complex. Let's start with a simpler "Replace Selection" or "Append" logic first
        // If we have selected text context, we replace that.

        // ... Logic to be refined as we test ...
        // Placeholder simple replacement for "rewrite" tasks

        // Parse the changes again
        const changes = this.parseDiff(diffText);

        // If it looks like a full file replacement (no context blocks at start/end matching significant content)
        // just replace all.

        // Let's implement a 'Find and Replace' strategy for chunks.
        let newContent = rawContent;

        changes.forEach(block => {
            if (block.type === 'remove') {
                // Try to remove these lines
                // This is hard on HTML.
            }
        });

        // Temporary strategy for Phase 1 MVP:
        // Use text-based replacement.
        // 1. Normalize editor text
        // 2. Apply patch
        // 3. Set text back (will strip bold/italic for now, but safer)
        // User can re-add formatting. 
        // Long term: Markdown-based editor or careful HTML patching.

        const textLines = editor.innerText.split('\n');
        // ... patching logic ...

        // Fallback for MVP: 
        // Just alert "Patching not fully implemented yet"

        return false; // Stub
    }
}
