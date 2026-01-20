/**
 * EventLine - AI-powered story event timeline visualization
 * Phase 8: Event Line feature
 */

import { stripContent } from '../utils/TextUtils.js';

export class EventLine {
    constructor(app) {
        this.app = app;
        this.modal = document.getElementById('event-line-modal');
        this.container = document.getElementById('event-line-container');
        this.generateBtn = document.getElementById('btn-generate-events');
        this.closeBtn = document.getElementById('close-event-line');
        this.openBtn = document.getElementById('btn-event-line');

        this.isGenerating = false;
        this.bindEvents();
    }

    bindEvents() {
        this.openBtn?.addEventListener('click', () => this.open());
        this.closeBtn?.addEventListener('click', () => this.close());
        this.generateBtn?.addEventListener('click', () => this.generate());
    }

    // ===== MODAL CONTROLS =====

    open() {
        if (!this.modal) return;
        this.modal.classList.add('open');
        this.render();
    }

    close() {
        this.modal?.classList.remove('open');
    }

    // ===== RENDERING =====

    render() {
        const events = this.app.state.eventLine?.events || [];

        if (events.length === 0) {
            this.container.innerHTML = `
                <div class="event-line-empty">
                    <p>No events extracted yet.</p>
                    <p>Click <strong>Generate / Update</strong> to scan your manuscript and build the event line.</p>
                </div>
            `;
            return;
        }

        // Build the horizontal event line with type-based coloring
        let html = `<div class="event-line-track">`;

        events.forEach((event, index) => {
            const position = index % 2 === 0 ? 'above' : 'below';
            const type = event.type || 'setup';
            const gap = event.gap || 'soon';

            // Add connector segment (not for first node)
            if (index > 0) {
                const prevType = events[index - 1].type || 'setup';
                const fromColor = this.getTypeColor(prevType);
                const toColor = this.getTypeColor(type);
                const gradientStyle = `background: linear-gradient(90deg, ${fromColor}, ${toColor});`;
                html += `<div class="event-segment gap-${gap}" style="${gradientStyle}"></div>`;
            }

            html += `
                <div class="event-node ${position} type-${type}" data-index="${index}">
                    <div class="event-dot"></div>
                    <div class="event-glow"></div>
                    <div class="event-title">${event.title}</div>
                    <div class="event-popup">
                        <div class="popup-type type-${type}">${this.getTypeLabel(type)}</div>
                        <strong>${event.title}</strong>
                        <p>${event.description || 'No description'}</p>
                        ${event.gap ? `<span class="event-gap-label">${this.getGapLabel(event.gap)}</span>` : ''}
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        this.container.innerHTML = html;

        // Add hover listeners for popups
        this.container.querySelectorAll('.event-node').forEach(node => {
            node.addEventListener('mouseenter', () => node.classList.add('show-popup'));
            node.addEventListener('mouseleave', () => node.classList.remove('show-popup'));
        });

        // Horizontal scroll with wheel
        this.container.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                this.container.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }

    getTypeLabel(type) {
        const labels = {
            'action': '⚔️ ACTION',
            'conflict': '💢 CONFLICT',
            'chase': '🏃 CHASE',
            'reveal': '💡 REVEAL',
            'mystery': '🔍 MYSTERY',
            'decision': '⚖️ DECISION',
            'betrayal': '🗡️ BETRAYAL',
            'death': '💀 DEATH',
            'victory': '🏆 VICTORY',
            'defeat': '💥 DEFEAT',
            'emotional': '💔 EMOTIONAL',
            'calm': '🌿 CALM',
            'setup': '📍 SETUP'
        };
        return labels[type] || type.toUpperCase();
    }

    getTypeColor(type) {
        const colors = {
            'action': '#ef4444',
            'conflict': '#f97316',
            'chase': '#eab308',
            'reveal': '#ea00ff',
            'mystery': '#8b5cf6',
            'decision': '#6366f1',
            'betrayal': '#ec4899',
            'death': '#78716c',
            'victory': '#fbbf24',
            'defeat': '#64748b',
            'emotional': '#06b6d4',
            'calm': '#22c55e',
            'setup': '#3b82f6'
        };
        return colors[type] || '#888888';
    }

    getGapLabel(gap) {
        const labels = {
            'immediate': '⚡ Immediate',
            'soon': '🕐 Shortly after',
            'later': '📅 Some time later',
            'skip': '⏭️ Time skip'
        };
        return labels[gap] || gap;
    }

    // ===== GENERATION =====

    async generate() {
        if (this.isGenerating) return;

        this.isGenerating = true;
        this.updateGenerateButton(true);

        try {
            // Build manuscript context
            const context = this.buildContext();

            if (!context.trim()) {
                alert('No manuscript content to analyze.');
                return;
            }

            // Build prompt
            const prompt = this.buildPrompt(context);

            // Call AI
            let response = '';
            await this.app.aiService.sendMessageStream(
                [
                    { role: 'system', content: 'You are a story analyst that extracts key narrative events from manuscripts.' },
                    { role: 'user', content: prompt }
                ],
                (chunk, accumulated) => {
                    response = accumulated;
                }
            );

            // Parse response
            const events = this.parseResponse(response);

            // Save to state
            this.app.state.eventLine = {
                events,
                generatedAt: new Date().toISOString()
            };
            this.app.save();

            // Re-render
            this.render();

        } catch (error) {
            console.error('Event line generation failed:', error);
            alert('Failed to generate event line: ' + error.message);
        } finally {
            this.isGenerating = false;
            this.updateGenerateButton(false);
        }
    }

    updateGenerateButton(generating) {
        if (!this.generateBtn) return;
        if (generating) {
            this.generateBtn.disabled = true;
            this.generateBtn.innerHTML = `
                <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Analyzing...
            `;
        } else {
            this.generateBtn.disabled = false;
            this.generateBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                Generate / Update
            `;
        }
    }

    buildContext() {
        const parts = this.app.state.manuscript?.parts || [];
        let context = '';

        parts.forEach(part => {
            context += `\n=== ${part.title} ===\n`;
            part.chapters.forEach(chapter => {
                context += `\n-- ${chapter.title} --\n`;
                chapter.scenes.forEach(scene => {
                    const text = stripContent(scene.content || '');
                    if (text.trim()) {
                        context += text + '\n\n';
                    }
                });
            });
        });

        return context;
    }

    buildPrompt(context) {
        return `Analyze this manuscript and extract the KEY STORY EVENTS in chronological order.

For each event, provide:
1. A SHORT TITLE (2-5 words, action-focused)
2. A BRIEF DESCRIPTION (1-2 sentences)
3. A TYPE category (pick the BEST fit):
   - "action": Battles, fights, combat
   - "conflict": Arguments, confrontations, tension
   - "chase": Pursuits, escapes, fleeing
   - "reveal": Secrets exposed, plot twists
   - "mystery": Clues found, questions raised
   - "decision": Important choices made
   - "betrayal": Treachery, backstabbing
   - "death": Character death, major loss
   - "victory": Triumph, achievement, success
   - "defeat": Failure, setback, loss
   - "emotional": Bonding, romance, grief, internal conflict
   - "calm": Peaceful moments, rest, reflection, recovery
   - "setup": Travel, exposition, introductions, planning
4. A GAP indicator showing time to previous event:
   - "immediate" = right after
   - "soon" = same day/scene
   - "later" = days/weeks pass
   - "skip" = significant time jump

OUTPUT FORMAT (JSON array):
[
  {"title": "Event Title", "description": "What happens.", "type": "action", "gap": "immediate"},
  ...
]

RULES:
- Extract 10-30 meaningful events
- First event has no gap
- Output ONLY the JSON array

MANUSCRIPT:
${context.substring(0, 50000)}`;
    }

    parseResponse(response) {
        try {
            // Find JSON array in response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.error('No JSON array found in response');
                return [];
            }

            const events = JSON.parse(jsonMatch[0]);

            // Validate structure and include type
            const validTypes = ['action', 'conflict', 'chase', 'reveal', 'mystery', 'decision', 'betrayal', 'death', 'victory', 'defeat', 'emotional', 'calm', 'setup'];
            return events.filter(e => e.title && typeof e.title === 'string').map((e, i) => ({
                title: e.title.substring(0, 50),
                description: (e.description || '').substring(0, 200),
                type: validTypes.includes(e.type) ? e.type : 'setup',
                gap: i === 0 ? null : (e.gap || 'soon')
            }));
        } catch (error) {
            console.error('Failed to parse event line response:', error);
            return [];
        }
    }
}
