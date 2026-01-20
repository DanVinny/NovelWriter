/**
 * BackupService - Automatic backup reminders and quick backup functionality
 * Saves full project data as downloadable JSON files
 */

export class BackupService {
    constructor(app) {
        this.app = app;
        this.BACKUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
        this.BACKUP_KEY = 'novelwriter_last_backup';

        this.init();
    }

    init() {
        // Check if backup reminder is needed
        this.checkBackupReminder();

        // Set interval to check periodically
        setInterval(() => this.checkBackupReminder(), 5 * 60 * 1000); // Check every 5 min

        // Bind manual backup buttons
        document.getElementById('btn-manual-backup')?.addEventListener('click', () => this.createBackup());

        const restoreBtn = document.getElementById('btn-restore-backup');
        const fileInput = document.getElementById('backup-file-input');
        restoreBtn?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files?.[0]) {
                this.restoreFromBackup(e.target.files[0]);
                e.target.value = '';
            }
        });
    }

    checkBackupReminder() {
        const lastBackup = localStorage.getItem(this.BACKUP_KEY);
        const now = Date.now();

        if (!lastBackup) {
            // Never backed up - show reminder after 10 minutes of first use
            const firstUse = localStorage.getItem('novelwriter_first_use');
            if (!firstUse) {
                localStorage.setItem('novelwriter_first_use', now.toString());
            } else if (now - parseInt(firstUse) > 10 * 60 * 1000) {
                this.showBackupReminder('You haven\'t backed up yet. Create a backup to protect your work!');
            }
            return;
        }

        const timeSinceBackup = now - parseInt(lastBackup);
        if (timeSinceBackup > this.BACKUP_INTERVAL_MS) {
            const hours = Math.floor(timeSinceBackup / (60 * 60 * 1000));
            const mins = Math.floor((timeSinceBackup % (60 * 60 * 1000)) / (60 * 1000));
            const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`;
            this.showBackupReminder(`Last backup was ${timeStr} ago. Consider backing up!`);
        }
    }

    showBackupReminder(message) {
        // Don't show if already shown recently
        const lastReminder = sessionStorage.getItem('backup_reminder_shown');
        if (lastReminder && Date.now() - parseInt(lastReminder) < 10 * 60 * 1000) {
            return; // Don't spam reminders
        }
        sessionStorage.setItem('backup_reminder_shown', Date.now().toString());

        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'backup-toast';
        toast.innerHTML = `
            <div class="backup-toast-content">
                <span class="backup-toast-icon">💾</span>
                <span class="backup-toast-message">${message}</span>
                <button class="backup-toast-btn" id="backup-now-btn">Backup Now</button>
                <button class="backup-toast-dismiss" id="backup-dismiss-btn">×</button>
            </div>
        `;
        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => toast.classList.add('show'));

        // Bind events
        toast.querySelector('#backup-now-btn').addEventListener('click', () => {
            this.createBackup();
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });

        toast.querySelector('#backup-dismiss-btn').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });

        // Auto-dismiss after 15 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, 15000);
    }

    createBackup() {
        try {
            // Gather all projects
            const projectList = JSON.parse(localStorage.getItem('novelwriter_project_list') || '[]');
            const backup = {
                version: '1.0',
                created: new Date().toISOString(),
                projectCount: projectList.length,
                projects: {}
            };

            // Include each project's full data
            projectList.forEach(project => {
                const projectData = localStorage.getItem(`novelwriter_project_${project.id}`);
                if (projectData) {
                    backup.projects[project.id] = JSON.parse(projectData);
                }
            });

            // Also include current project if not in list
            const currentId = localStorage.getItem('novelwriter_current_project');
            if (currentId && !backup.projects[currentId]) {
                const currentData = localStorage.getItem(`novelwriter_project_${currentId}`);
                if (currentData) {
                    backup.projects[currentId] = JSON.parse(currentData);
                    backup.projectCount++;
                }
            }

            // Download as file
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `novelwriter-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Update last backup timestamp
            localStorage.setItem(this.BACKUP_KEY, Date.now().toString());

            // Show success message
            this.showSuccessToast(`Backup saved! (${backup.projectCount} project${backup.projectCount !== 1 ? 's' : ''})`);

        } catch (error) {
            console.error('Backup failed:', error);
            alert('Backup failed: ' + error.message);
        }
    }

    showSuccessToast(message) {
        const toast = document.createElement('div');
        toast.className = 'backup-toast success';
        toast.innerHTML = `
            <div class="backup-toast-content">
                <span class="backup-toast-icon">✅</span>
                <span class="backup-toast-message">${message}</span>
            </div>
        `;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Restore from backup file
    async restoreFromBackup(file) {
        try {
            const text = await file.text();
            const backup = JSON.parse(text);

            if (!backup.version || !backup.projects) {
                throw new Error('Invalid backup file format');
            }

            const projectCount = Object.keys(backup.projects).length;
            const confirmRestore = confirm(
                `This backup contains ${projectCount} project(s) from ${backup.created}.\n\n` +
                `Restoring will MERGE these projects with your existing ones.\n\n` +
                `Continue?`
            );

            if (!confirmRestore) return;

            // Restore each project
            const projectList = JSON.parse(localStorage.getItem('novelwriter_project_list') || '[]');

            Object.entries(backup.projects).forEach(([id, data]) => {
                localStorage.setItem(`novelwriter_project_${id}`, JSON.stringify(data));

                // Add to project list if not exists
                if (!projectList.find(p => p.id === id)) {
                    projectList.push({
                        id,
                        title: data.metadata?.title || 'Restored Project',
                        created: data.metadata?.created || backup.created,
                        modified: data.metadata?.modified || backup.created
                    });
                }
            });

            localStorage.setItem('novelwriter_project_list', JSON.stringify(projectList));

            alert(`Successfully restored ${projectCount} project(s)! Refreshing...`);
            location.reload();

        } catch (error) {
            console.error('Restore failed:', error);
            alert('Restore failed: ' + error.message);
        }
    }
}
