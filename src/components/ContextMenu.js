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
        // Build menu items (with submenu support)
        this.menu.innerHTML = items.map((item, idx) => {
            if (item.divider) {
                return '<div class="context-menu-divider"></div>';
            }
            if (item.submenu) {
                return `
                <div class="context-menu-item has-submenu" data-submenu-idx="${idx}">
                    ${item.icon ? `<span class="context-menu-icon">${item.icon}</span>` : ''}
                    <span class="context-menu-label">${item.label}</span>
                    <span class="context-menu-arrow">▶</span>
                    <div class="context-submenu">
                        ${item.submenu.map((sub, subIdx) => {
                    if (sub.divider) return '<div class="context-menu-divider"></div>';
                    return `<button class="context-menu-item" data-parent="${idx}" data-sub="${subIdx}">${sub.label}</button>`;
                }).join('')}
                    </div>
                </div>`;
            }
            return `
                <button class="context-menu-item" data-action="${item.action || ''}" data-idx="${idx}">
                    ${item.icon ? `<span class="context-menu-icon">${item.icon}</span>` : ''}
                    <span class="context-menu-label">${item.label}</span>
                </button>
            `;
        }).join('');

        // Bind click events for regular items
        let nonDividerIndex = 0;
        items.forEach((item, originalIdx) => {
            if (item.divider) return; // Skip dividers
            if (item.submenu) {
                // Handle submenu items separately
                item.submenu.forEach((subItem, subIdx) => {
                    if (subItem.divider) return;
                    const btn = this.menu.querySelector(`[data-parent="${originalIdx}"][data-sub="${subIdx}"]`);
                    if (btn && subItem.onClick) {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            subItem.onClick();
                            this.hide();
                        });
                    }
                });
            } else {
                // Regular item
                const btn = this.menu.querySelector(`[data-idx="${originalIdx}"]`);
                if (btn && item.onClick) {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        item.onClick();
                        this.hide();
                    });
                }
            }
            nonDividerIndex++;
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
