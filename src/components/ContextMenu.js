/**
 * ContextMenu - Reusable context menu component
 */

export class ContextMenu {
    constructor() {
        this.menu = null;
        this.createMenu();
        this.bindGlobalEvents();
    }

    createMenu() {
        this.menu = document.createElement('div');
        this.menu.className = 'context-menu';
        this.menu.innerHTML = '';
        document.body.appendChild(this.menu);
    }

    bindGlobalEvents() {
        // Close menu on click outside
        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target) && !e.target.classList.contains('context-menu-trigger')) {
                this.hide();
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
    }

    show(x, y, items) {
        // Build menu items
        this.menu.innerHTML = items.map(item => {
            if (item.divider) {
                return '<div class="context-menu-divider"></div>';
            }
            return `
        <button class="context-menu-item" data-action="${item.action}">
          ${item.icon ? `<span class="context-menu-icon">${item.icon}</span>` : ''}
          <span class="context-menu-label">${item.label}</span>
        </button>
      `;
        }).join('');

        // Bind click events
        this.menu.querySelectorAll('.context-menu-item').forEach((btn, index) => {
            const item = items.filter(i => !i.divider)[index];
            if (item && item.onClick) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.onClick();
                    this.hide();
                });
            }
        });

        // Position menu
        this.menu.style.left = `${x}px`;
        this.menu.style.top = `${y}px`;
        this.menu.classList.add('visible');

        // Adjust if off-screen
        const rect = this.menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.menu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
    }

    hide() {
        this.menu.classList.remove('visible');
    }
}

// Singleton instance
let contextMenuInstance = null;

export function getContextMenu() {
    if (!contextMenuInstance) {
        contextMenuInstance = new ContextMenu();
    }
    return contextMenuInstance;
}
