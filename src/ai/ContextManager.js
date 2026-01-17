/**
 * ContextManager - Builds manuscript context for AI
 * 
 * Provides the AI with awareness of the manuscript structure
 * and retrieves relevant content based on the current context
 */

export class ContextManager {
    constructor(app) {
        this.app = app;
    }

    /**
     * Get manuscript structure overview (lightweight)
     * Used to give AI a bird's eye view without full content
     */
    getStructureOverview() {
        const state = this.app.state;
        const parts = state.manuscript.parts || [];

        let overview = `# Manuscript Structure\n`;
        overview += `Title: ${state.metadata.title}\n`;
        overview += `Author: ${state.metadata.author}\n`;
        overview += `Subtitle: ${state.metadata.subtitle || 'N/A'}\n\n`;

        parts.forEach((part, pIdx) => {
            overview += `## Part ${pIdx + 1}: ${part.displayTitle || part.title}\n`;

            part.chapters.forEach((chapter, cIdx) => {
                const sceneCount = chapter.scenes?.length || 0;
                const wordCount = chapter.scenes?.reduce((sum, s) => {
                    const text = s.content?.replace(/<[^>]*>/g, '') || '';
                    return sum + text.trim().split(/\s+/).filter(w => w).length;
                }, 0) || 0;

                overview += `  - Chapter ${cIdx + 1}: ${chapter.displayTitle || chapter.title} (${sceneCount} scenes, ~${wordCount} words)\n`;

                chapter.scenes?.forEach((scene, sIdx) => {
                    overview += `    - Scene ${sIdx + 1}: ${scene.title}\n`;
                });
            });
        });

        return overview;
    }

    /**
     * Get current scene content with surrounding context
     */
    getCurrentSceneContext() {
        const ctx = this.app.currentContext;
        if (!ctx || ctx.type !== 'scene') return null;

        const part = this.app.state.manuscript.parts.find(p => p.id === ctx.partId);
        const chapter = part?.chapters.find(c => c.id === ctx.chapterId);
        const scene = chapter?.scenes.find(s => s.id === ctx.sceneId);

        if (!scene) return null;

        const content = scene.content?.replace(/<[^>]*>/g, '') || '';

        return {
            partTitle: part.displayTitle || part.title,
            chapterTitle: chapter.displayTitle || chapter.title,
            sceneTitle: scene.title,
            content: content,
            wordCount: content.trim().split(/\s+/).filter(w => w).length
        };
    }

    /**
     * Get chapter content (all scenes combined)
     */
    getChapterContent(chapterId) {
        for (const part of this.app.state.manuscript.parts) {
            const chapter = part.chapters.find(c => c.id === chapterId);
            if (chapter) {
                let content = `# ${chapter.displayTitle || chapter.title}\n\n`;
                chapter.scenes?.forEach(scene => {
                    content += `## ${scene.title}\n`;
                    content += (scene.content?.replace(/<[^>]*>/g, '') || '') + '\n\n';
                });
                return content;
            }
        }
        return null;
    }

    /**
     * Get character profiles
     */
    getCharacterProfiles() {
        const casts = this.app.state.characters?.casts || [];
        let profiles = `# Character Profiles\n\n`;

        casts.forEach(cast => {
            profiles += `## ${cast.name}\n`;
            cast.characters?.forEach(char => {
                profiles += `### ${char.name}\n`;
                profiles += char.description || 'No description yet.\n';
                profiles += '\n';
            });
        });

        return profiles;
    }

    /**
     * Get plot notes
     */
    getPlotNotes() {
        const plotItems = this.app.state.plot?.items || [];
        let notes = `# Plot Notes\n\n`;

        plotItems.forEach(item => {
            if (item.type === 'plot-line') {
                notes += `## Plot Line: ${item.title}\n`;
                notes += (item.content || 'No content yet.') + '\n\n';
            }
        });

        return notes;
    }

    /**
     * Get story notes
     */
    getStoryNotes() {
        const items = this.app.state.notes?.items || [];
        let notes = `# Story Notes\n\n`;

        items.forEach(item => {
            notes += `## ${item.title}\n`;
            notes += (item.content?.replace(/<[^>]*>/g, '') || 'No content yet.') + '\n\n';
        });

        return notes;
    }

    /**
     * Build full context for AI based on what's relevant
     * @param {Object} options - What to include
     */
    buildContext(options = {}) {
        const {
            includeStructure = true,
            includeCurrentScene = true,
            includeCharacters = false,
            includePlot = false,
            includeNotes = false,
            customChapterId = null
        } = options;

        let context = '';

        if (includeStructure) {
            context += this.getStructureOverview() + '\n---\n\n';
        }

        if (includeCurrentScene) {
            const scene = this.getCurrentSceneContext();
            if (scene) {
                context += `# Current Location\n`;
                context += `Part: ${scene.partTitle}\n`;
                context += `Chapter: ${scene.chapterTitle}\n`;
                context += `Scene: ${scene.sceneTitle}\n\n`;
                context += `## Scene Content:\n${scene.content}\n\n---\n\n`;
            }
        }

        if (customChapterId) {
            const chapterContent = this.getChapterContent(customChapterId);
            if (chapterContent) {
                context += chapterContent + '\n---\n\n';
            }
        }

        if (includeCharacters) {
            context += this.getCharacterProfiles() + '\n---\n\n';
        }

        if (includePlot) {
            context += this.getPlotNotes() + '\n---\n\n';
        }

        if (includeNotes) {
            context += this.getStoryNotes() + '\n---\n\n';
        }

        return context;
    }

    /**
     * Get a brief summary of the manuscript (for system prompt)
     */
    getManuscriptSummary() {
        const state = this.app.state;
        const parts = state.manuscript.parts || [];

        let totalWords = 0;
        let totalScenes = 0;
        let totalChapters = 0;

        parts.forEach(part => {
            part.chapters.forEach(chapter => {
                totalChapters++;
                chapter.scenes?.forEach(scene => {
                    totalScenes++;
                    const text = scene.content?.replace(/<[^>]*>/g, '') || '';
                    totalWords += text.trim().split(/\s+/).filter(w => w).length;
                });
            });
        });

        return {
            title: state.metadata.title,
            author: state.metadata.author,
            partCount: parts.length,
            chapterCount: totalChapters,
            sceneCount: totalScenes,
            wordCount: totalWords
        };
    }
}
