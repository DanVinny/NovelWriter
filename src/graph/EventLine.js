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

        // Build the horizontal event line
        let html = `<div class="event-line-track">`;

        events.forEach((event, index) => {
            const position = index % 2 === 0 ? 'above' : 'below';
            const gapClass = event.gap ? `gap-${event.gap}` : '';

            html += `
                <div class="event-node ${position} ${gapClass}" data-index="${index}">
                    <div class="event-dot"></div>
                    <div class="event-title">${event.title}</div>
                    <div class="event-popup">
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
3. A GAP indicator showing time relation to the previous event:
   - "immediate" = happens right after
   - "soon" = shortly after (same day/scene)
   - "later" = some time passes (days/weeks)
   - "skip" = significant time jump

OUTPUT FORMAT (JSON array):
[
  {"title": "Event Title", "description": "Brief description of what happens.", "gap": "immediate"},
  {"title": "Another Event", "description": "What happens here.", "gap": "later"},
  ...
]

RULES:
- Extract 10-30 meaningful events (major plot points, reveals, turning points)
- Events should be ACTIONS, not settings or descriptions
- Keep titles punchy and memorable
- First event has no gap indicator
- Output ONLY the JSON array, no other text

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

            // Validate structure
            return events.filter(e => e.title && typeof e.title === 'string').map((e, i) => ({
                title: e.title.substring(0, 50),
                description: (e.description || '').substring(0, 200),
                gap: i === 0 ? null : (e.gap || 'soon')
            }));
        } catch (error) {
            console.error('Failed to parse event line response:', error);
            return [];
        }
    }
}
