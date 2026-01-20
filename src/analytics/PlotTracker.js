/**
 * PlotTracker - AI-powered plot analysis tool
 * Combines Open Plot Points Tracker and Plot Hole Detector
 */

import { stripContent } from '../utils/TextUtils.js';

export class PlotTracker {
    constructor(app) {
        this.app = app;
        this.modal = document.getElementById('plot-tracker-modal');
        this.container = document.getElementById('plot-tracker-container');
        this.scanBtn = document.getElementById('btn-scan-plots');
        this.closeBtn = document.getElementById('close-plot-tracker');
        this.openBtn = document.getElementById('btn-plot-tracker');

        this.isScanning = false;
        this.bindEvents();
    }

    bindEvents() {
        this.openBtn?.addEventListener('click', () => this.open());
        this.closeBtn?.addEventListener('click', () => this.close());
        this.scanBtn?.addEventListener('click', () => this.scan());
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
        const data = this.app.state.plotTracker;

        if (!data || (!data.openPlots?.length && !data.concludedPlots?.length && !data.plotHoles?.length)) {
            this.container.innerHTML = `
                <div class="plot-tracker-empty">
                    <p>No plot analysis yet.</p>
                    <p>Click <strong>Scan Manuscript</strong> to analyze your story for plot lines and potential holes.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="plot-tracker-content">';

        // Open Plot Lines
        html += this.renderSection(
            '🔓 Open Plot Lines',
            'open-plots',
            data.openPlots || [],
            this.renderOpenPlot.bind(this)
        );

        // Concluded Plot Lines
        html += this.renderSection(
            '✅ Concluded Plot Lines',
            'concluded-plots',
            data.concludedPlots || [],
            this.renderConcludedPlot.bind(this)
        );

        // Plot Holes
        html += this.renderSection(
            '⚠️ Potential Plot Holes',
            'plot-holes',
            data.plotHoles || [],
            this.renderPlotHole.bind(this)
        );

        html += '</div>';
        this.container.innerHTML = html;

        // Bind collapse toggles
        this.container.querySelectorAll('.plot-section-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('collapsed');
            });
        });
    }

    renderSection(title, className, items, renderItem) {
        const count = items.length;
        return `
            <div class="plot-section ${className}">
                <div class="plot-section-header">
                    <span class="plot-section-title">${title}</span>
                    <span class="plot-section-count">${count}</span>
                    <span class="plot-section-chevron">▼</span>
                </div>
                <div class="plot-section-body">
                    ${count === 0
                ? '<p class="plot-empty-note">None found</p>'
                : items.map(renderItem).join('')}
                </div>
            </div>
        `;
    }

    renderOpenPlot(plot) {
        return `
            <div class="plot-card open-plot">
                <div class="plot-card-title">📖 ${this.escapeHtml(plot.title)}</div>
                <div class="plot-card-meta">
                    <span class="plot-meta-label">Introduced:</span> ${this.escapeHtml(plot.introduced || 'Unknown')}
                </div>
                <div class="plot-card-description">${this.escapeHtml(plot.description || '')}</div>
            </div>
        `;
    }

    renderConcludedPlot(plot) {
        return `
            <div class="plot-card concluded-plot">
                <div class="plot-card-title">📖 ${this.escapeHtml(plot.title)}</div>
                <div class="plot-card-meta">
                    <span class="plot-meta-label">Setup:</span> ${this.escapeHtml(plot.introduced || 'Unknown')}
                    <span class="plot-meta-arrow">→</span>
                    <span class="plot-meta-label">Resolution:</span> ${this.escapeHtml(plot.resolved || 'Unknown')}
                </div>
                <div class="plot-card-description">${this.escapeHtml(plot.summary || '')}</div>
            </div>
        `;
    }

    renderPlotHole(hole) {
        const severity = Math.min(10, Math.max(1, hole.severity || 5));
        const severityClass = severity >= 7 ? 'critical' : severity >= 4 ? 'moderate' : 'minor';

        return `
            <div class="plot-card plot-hole ${severityClass}">
                <div class="plot-hole-severity">
                    <span class="severity-badge severity-${severityClass}">${severity}/10</span>
                    <span class="severity-label">${severityClass.toUpperCase()}</span>
                </div>
                <div class="plot-card-title">${this.escapeHtml(hole.issue)}</div>
                <div class="plot-card-meta">
                    <span class="plot-meta-label">Location:</span> ${this.escapeHtml(hole.location || 'Unknown')}
                </div>
                <div class="plot-card-description">${this.escapeHtml(hole.explanation || '')}</div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== SCANNING =====

    async scan() {
        if (this.isScanning) return;

        this.isScanning = true;
        this.updateScanButton(true);

        try {
            const context = this.buildContext();

            if (!context.trim()) {
                alert('No manuscript content to analyze.');
                return;
            }

            const prompt = this.buildPrompt(context);

            let response = '';
            await this.app.aiService.sendMessageStream(
                [
                    { role: 'system', content: 'You are a professional story editor performing comprehensive narrative analysis. Be thorough and precise.' },
                    { role: 'user', content: prompt }
                ],
                (chunk, accumulated) => {
                    response = accumulated;
                }
            );

            const analysis = this.parseResponse(response);

            // Save to state
            this.app.state.plotTracker = {
                ...analysis,
                scannedAt: new Date().toISOString()
            };
            this.app.save();

            this.render();

        } catch (error) {
            console.error('Plot scan failed:', error);
            alert('Failed to scan manuscript: ' + error.message);
        } finally {
            this.isScanning = false;
            this.updateScanButton(false);
        }
    }

    updateScanButton(scanning) {
        if (!this.scanBtn) return;
        if (scanning) {
            this.scanBtn.disabled = true;
            this.scanBtn.innerHTML = `
                <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Analyzing...
            `;
        } else {
            this.scanBtn.disabled = false;
            this.scanBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                Scan Manuscript
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
        return `You are a professional story editor. Perform a DEEP and THOROUGH analysis of this manuscript.

Read the ENTIRE manuscript carefully and identify:

## 1. OPEN PLOT LINES
Threads, mysteries, questions, or promises introduced but NOT yet resolved.
- Unanswered questions raised to the reader
- Character goals not yet achieved
- Conflicts not yet resolved
- Mysteries without answers
- Prophecies or foreshadowing not yet fulfilled

## 2. CONCLUDED PLOT LINES
Threads that HAVE been properly resolved or wrapped up.
- Questions answered
- Goals achieved or definitively failed
- Conflicts resolved
- Mysteries solved

## 3. POTENTIAL PLOT HOLES (with severity 1-10)
Logical inconsistencies, contradictions, or narrative problems.

Types to look for:
- **Timeline contradictions**: Events that couldn't happen in the stated order
- **Character knowledge violations**: Characters knowing things they shouldn't
- **Continuity errors**: Inconsistent details (descriptions, names, facts)
- **Missing explanations**: Important events without adequate setup
- **Impossible actions**: Things that contradict established rules/physics
- **Broken promises**: Setup without payoff, Chekhov's guns unfired

Severity Guide:
- 1-3: Minor issues most readers won't notice
- 4-6: Noticeable problems that careful readers will catch
- 7-10: Critical issues that break immersion or logic

## OUTPUT FORMAT (JSON only, no other text):
{
  "openPlots": [
    {"title": "Short title", "introduced": "Chapter X", "description": "What was set up and remains unresolved"}
  ],
  "concludedPlots": [
    {"title": "Short title", "introduced": "Chapter X", "resolved": "Chapter Y", "summary": "How it was resolved"}
  ],
  "plotHoles": [
    {"severity": 7, "issue": "Brief issue title", "location": "Chapter X, Scene Y", "explanation": "Detailed explanation of the problem and why it's an issue"}
  ]
}

Be THOROUGH. Cross-reference events across the entire manuscript. Don't miss anything important.
Output ONLY valid JSON.

MANUSCRIPT:
${context.substring(0, 80000)}`;
    }

    parseResponse(response) {
        try {
            // Find JSON object in response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error('No JSON object found in response');
                return { openPlots: [], concludedPlots: [], plotHoles: [] };
            }

            const data = JSON.parse(jsonMatch[0]);

            return {
                openPlots: (data.openPlots || []).map(p => ({
                    title: String(p.title || 'Untitled').substring(0, 100),
                    introduced: String(p.introduced || '').substring(0, 50),
                    description: String(p.description || '').substring(0, 500)
                })),
                concludedPlots: (data.concludedPlots || []).map(p => ({
                    title: String(p.title || 'Untitled').substring(0, 100),
                    introduced: String(p.introduced || '').substring(0, 50),
                    resolved: String(p.resolved || '').substring(0, 50),
                    summary: String(p.summary || '').substring(0, 500)
                })),
                plotHoles: (data.plotHoles || []).map(h => ({
                    severity: Math.min(10, Math.max(1, parseInt(h.severity) || 5)),
                    issue: String(h.issue || 'Unknown issue').substring(0, 150),
                    location: String(h.location || '').substring(0, 100),
                    explanation: String(h.explanation || '').substring(0, 1000)
                })).sort((a, b) => b.severity - a.severity) // Sort by severity desc
            };
        } catch (error) {
            console.error('Failed to parse plot tracker response:', error);
            return { openPlots: [], concludedPlots: [], plotHoles: [] };
        }
    }
}
