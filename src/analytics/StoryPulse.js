
import { stripContent } from '../utils/TextUtils.js';

export class StoryPulse {
    constructor(app) {
        this.app = app;
        this.modal = document.getElementById('story-pulse-modal');
        this.graphContainer = document.getElementById('pulse-graph-container');
        this.notesContainer = document.getElementById('pulse-notes-container');
        this.btnRun = document.getElementById('btn-run-pulse');
        this.checkboxes = document.querySelectorAll('.metric-checkbox');
        this.prevCheckboxes = document.querySelectorAll('.prev-checkbox');

        this.isAnalyzing = false;

        this.metrics = ['pacing', 'engagement', 'enjoyability', 'emotional', 'tension', 'atmosphere', 'depth'];

        this.colors = {
            pacing: '#FF5733',
            engagement: '#28B463',
            enjoyability: '#F1C40F',
            emotional: '#8E44AD',
            tension: '#C0392B',
            atmosphere: '#2980B9',
            depth: '#797D7F'
        };

        this.metricLabels = {
            pacing: 'Pacing',
            engagement: 'Engagement',
            enjoyability: 'Enjoyability',
            emotional: 'Emotional Impact',
            tension: 'Tension',
            atmosphere: 'Atmosphere',
            depth: 'Depth'
        };

        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('btn-story-pulse').addEventListener('click', () => this.open());
        document.getElementById('close-story-pulse').addEventListener('click', () => this.close());
        document.getElementById('close-story-pulse-btn').addEventListener('click', () => this.close());
        document.getElementById('story-pulse-backdrop').addEventListener('click', () => this.close());

        this.btnRun.addEventListener('click', () => this.runAnalysis());

        this.checkboxes.forEach(cb => {
            cb.addEventListener('change', () => this.renderGraph());
        });

        this.prevCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => this.renderGraph());
        });
    }

    open() {
        this.modal.classList.add('open');

        // Render existing data if available
        if (this.app.state.analytics && this.app.state.analytics.pulse) {
            this.renderGraph();
            this.renderNotes();
        }
    }

    close() {
        this.modal.classList.remove('open');
    }

    /**
     * Build the full manuscript with chapter markers
     */
    buildManuscript() {
        const parts = this.app.state.manuscript.parts || [];
        const chapters = [];
        let manuscriptText = '';

        parts.forEach((part, pIdx) => {
            part.chapters.forEach((chapter, cIdx) => {
                // Format: "ChapterName (Part X)"
                const chapterLabel = `${chapter.title} (Part ${pIdx + 1})`;
                chapters.push(chapterLabel);

                const content = chapter.scenes?.map(s => {
                    return stripContent(s.content);
                }).join('\n\n') || '';
                manuscriptText += `\n\n=== ${chapterLabel} ===\n\n${content}`;
            });
        });

        return { chapters, manuscriptText };
    }

    /**
     * Build content hashes for each chapter to detect changes
     */
    buildChapterHashes(manuscriptText, chapters) {
        const hashes = [];
        for (let i = 0; i < chapters.length; i++) {
            // Extract chapter content between markers
            const marker = `=== ${chapters[i]} ===`;
            const startIdx = manuscriptText.indexOf(marker);
            const nextMarkerIdx = i < chapters.length - 1
                ? manuscriptText.indexOf(`=== ${chapters[i + 1]} ===`)
                : manuscriptText.length;

            let chapterContent = '';
            if (startIdx !== -1) {
                const contentStart = startIdx + marker.length;
                const contentEnd = nextMarkerIdx !== -1 ? nextMarkerIdx : manuscriptText.length;
                chapterContent = manuscriptText.substring(contentStart, contentEnd).trim();
            }

            // Create a simple hash of the content
            const hash = this.simpleHash(chapterContent);
            hashes.push(hash);
        }
        return hashes;
    }

    /**
     * Simple hash function for content comparison
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Calculate similarity between two strings (0-1)
     * Uses Levenshtein distance ratio
     */
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1;
        if (str1.length === 0 || str2.length === 0) return 0;

        const len1 = str1.length;
        const len2 = str2.length;

        // Create distance matrix
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

        // Initialize first row and column
        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        // Fill matrix
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,        // deletion
                    matrix[i][j - 1] + 1,        // insertion
                    matrix[i - 1][j - 1] + cost   // substitution
                );
            }
        }

        const distance = matrix[len1][len2];
        const maxLength = Math.max(len1, len2);
        return 1 - (distance / maxLength);
    }

    /**
     * Extract chapter content from manuscript text
     */
    extractChapterContent(manuscriptText, chapterName) {
        const marker = `=== ${chapterName} ===`;
        const startIdx = manuscriptText.indexOf(marker);
        if (startIdx === -1) return '';

        const contentStart = startIdx + marker.length;
        const nextMarkerIdx = manuscriptText.indexOf('=== ', contentStart);
        const contentEnd = nextMarkerIdx !== -1 ? nextMarkerIdx : manuscriptText.length;

        return manuscriptText.substring(contentStart, contentEnd).trim();
    }

    /**
     * Compare chapters based on content hashes and fuzzy matching
     */
    compareChapters(prevChapters, currChapters, currHashes, prevHashes, prevManuscriptText, currManuscriptText) {
        const result = {
            matched: [],
            added: [],
            removed: [],
            modified: []
        };

        // Build hash-to-chapter mappings
        const prevHashMap = new Map();
        prevHashes.forEach((hash, idx) => {
            if (!prevHashMap.has(hash)) {
                prevHashMap.set(hash, []);
            }
            prevHashMap.get(hash).push({ chapter: prevChapters[idx], idx });
        });

        const usedPrevIndices = new Set();

        // Match chapters by content hash or fuzzy similarity
        currHashes.forEach((hash, currIdx) => {
            const currChapterName = currChapters[currIdx];

            if (prevHashMap.has(hash) && prevHashMap.get(hash).length > 0) {
                // Found matching content (exact hash match)
                const match = prevHashMap.get(hash)[0];
                result.matched.push({
                    prevChapter: match.chapter,
                    currChapter: currChapterName,
                    prevIdx: match.idx,
                    currIdx: currIdx,
                    matchType: 'exact'
                });
                usedPrevIndices.add(match.idx);
            } else {
                // Try fuzzy matching with 70% similarity threshold
                const currContent = this.extractChapterContent(currManuscriptText, currChapterName);
                let bestMatch = null;
                let bestSimilarity = 0;
                let bestPrevIdx = -1;

                prevHashes.forEach((prevHash, prevIdx) => {
                    if (!usedPrevIndices.has(prevIdx)) {
                        const prevContent = this.extractChapterContent(prevManuscriptText, prevChapters[prevIdx]);
                        const similarity = this.calculateSimilarity(currContent, prevContent);

                        if (similarity >= 0.7 && similarity > bestSimilarity) {
                            bestMatch = {
                                prevChapter: prevChapters[prevIdx],
                                currChapter: currChapterName,
                                prevIdx: prevIdx,
                                currIdx: currIdx,
                                similarity: similarity,
                                matchType: 'fuzzy'
                            };
                            bestSimilarity = similarity;
                            bestPrevIdx = prevIdx;
                        }
                    }
                });

                if (bestMatch) {
                    // Found fuzzy match - treat as MODIFIED (identity tracked, but content changed)
                    // Used to be 'matched', now moving to 'modified' so scores can update
                    result.modified.push({
                        prevChapter: bestMatch.prevChapter,
                        currChapter: bestMatch.currChapter,
                        prevIdx: bestMatch.prevIdx,
                        currIdx: bestMatch.currIdx,
                        similarity: bestMatch.similarity,
                        matchType: 'fuzzy'
                    });
                    usedPrevIndices.add(bestPrevIdx);
                } else {
                    // No match found - check if it's a name match or truly new
                    const nameMatchIdx = prevChapters.findIndex(
                        (c, idx) => c === currChapterName && !usedPrevIndices.has(idx)
                    );

                    if (nameMatchIdx !== -1) {
                        // Same name but different content (and below 70% similarity) → modified
                        result.modified.push({
                            prevChapter: prevChapters[nameMatchIdx],
                            currChapter: currChapterName,
                            prevIdx: nameMatchIdx,
                            currIdx: currIdx
                        });
                        usedPrevIndices.add(nameMatchIdx);
                    } else {
                        // New chapter
                        result.added.push({
                            chapter: currChapterName,
                            idx: currIdx
                        });
                    }
                }
            }
        });

        // Find removed chapters (present in prev but not matched)
        prevHashes.forEach((hash, idx) => {
            if (!usedPrevIndices.has(idx)) {
                result.removed.push({
                    chapter: prevChapters[idx],
                    idx: idx
                });
            }
        });

        return result;
    }

    async runAnalysis() {
        if (this.isAnalyzing) return;

        const parts = this.app.state.manuscript.parts || [];
        if (parts.length === 0) {
            alert('No manuscript to analyze!');
            return;
        }

        this.isAnalyzing = true;
        this.btnRun.disabled = true;

        const { chapters, manuscriptText } = this.buildManuscript();

        if (chapters.length === 0) {
            alert('No chapters found!');
            this.isAnalyzing = false;
            this.btnRun.disabled = false;
            return;
        }

        // ========== PHASE 16: CHECK FOR PREVIOUS ANALYSIS ==========
        const previousAnalysis = this.app.state.analytics?.pulse;
        const isRegenerate = previousAnalysis && previousAnalysis._snapshot;

        // Initialize pulse data structure
        const pulseData = {
            chapters: chapters,
            metrics: {},
            // Phase 16: Store snapshot for future comparisons
            _snapshot: {
                manuscriptText: manuscriptText,
                chapters: chapters,
                timestamp: new Date().toISOString()
            },
            // Store previous metrics for comparison view
            _previousMetrics: isRegenerate ? previousAnalysis.metrics : null,
            // Store previous chapters to correctly map the previous metrics
            _previousChapters: isRegenerate ? (previousAnalysis._snapshot?.chapters || previousAnalysis.chapters) : null,
            analyzedAt: new Date().toISOString()
        };

        try {
            // Analyze each metric separately
            for (let i = 0; i < this.metrics.length; i++) {
                const metric = this.metrics[i];
                this.btnRun.innerText = `Analyzing ${this.metricLabels[metric]} (${i + 1}/${this.metrics.length})...`;

                const result = await this.analyzeMetric(metric, chapters, manuscriptText, isRegenerate, previousAnalysis);
                pulseData.metrics[metric] = result;
            }

            // ========== PHASE 16: VALIDATE RESPONSE BEFORE SAVING ==========
            // Check if we have at least one valid metric (not just error fallbacks)
            const validMetrics = Object.values(pulseData.metrics).filter(m =>
                m.justification !== 'Analysis failed to parse. Default scores applied.'
            );

            if (validMetrics.length === 0) {
                console.warn('Story Pulse: All metrics failed to parse, keeping previous state');
                alert('Analysis failed to generate valid scores. Previous state preserved.');
                this.isAnalyzing = false;
                this.btnRun.disabled = false;
                this.btnRun.innerText = 'Run Analysis';
                return;
            }

            // Save results
            if (!this.app.state.analytics) this.app.state.analytics = {};
            this.app.state.analytics.pulse = pulseData;
            this.app.save();

            this.renderGraph();
            this.renderNotes();

        } catch (err) {
            console.error(err);
            alert('Analysis failed: ' + err.message);
        } finally {
            this.isAnalyzing = false;
            this.btnRun.innerText = 'Run Analysis (Whole Book)';
            this.btnRun.disabled = false;
        }
    }

    async analyzeMetric(metric, chapters, manuscriptText, isRegenerate = false, previousAnalysis = null) {
        let prompt;

        // ========== PHASE 16: INCREMENTAL UPDATE PROMPT ==========
        if (isRegenerate && previousAnalysis) {
            // Use the original snapshot (not the most recent one) for proper comparison
            const prevSnapshot = previousAnalysis._snapshot?.manuscriptText || '';
            const prevChapters = previousAnalysis._snapshot?.chapters || [];
            const prevScores = previousAnalysis.metrics?.[metric]?.scores || [];
            const prevJustification = previousAnalysis.metrics?.[metric]?.justification || '';
            const prevTimestamp = previousAnalysis.analyzedAt || 'unknown';

            // Build chapter mapping with content hashes for better tracking
            const prevChapterHashes = this.buildChapterHashes(prevSnapshot, prevChapters);
            const currentChapterHashes = this.buildChapterHashes(manuscriptText, chapters);

            // Find matching and changed chapters
            const chapterMapping = this.compareChapters(prevChapters, chapters, currentChapterHashes, prevChapterHashes, prevSnapshot, manuscriptText);

            prompt = `You are updating your EXISTING analysis for "${this.metricLabels[metric]}". You are NOT starting fresh.

==========================================================================
## YOUR PREVIOUS ANALYSIS FOR THIS METRIC
==========================================================================

Analysis conducted at: ${prevTimestamp}

Previous chapters: ${prevChapters.map((c, i) => `${i + 1}. ${c} [hash: ${prevChapterHashes[i]}]`).join('\n')}

Previous scores for ${this.metricLabels[metric]}: ${JSON.stringify(prevScores)}

Previous justification: "${prevJustification}"

==========================================================================
## ALL YOUR PREVIOUS METRIC ANALYSES (CONTEXT)
==========================================================================

${this.metrics.map(m => {
                const mData = previousAnalysis.metrics?.[m];
                if (!mData) return `${this.metricLabels[m]}: Not yet analyzed`;
                return `${this.metricLabels[m]}: Scores ${JSON.stringify(mData.scores)} - "${mData.justification}"`;
            }).join('\n\n')}

==========================================================================
## CHAPTER COMPARISON (CRITICAL FOR SCORE TRACKING)
==========================================================================

${chapterMapping.matched.length > 0 ? `MATCHED CHAPTERS (content IDENTICAL - scores MUST stay the same):
${chapterMapping.matched.map(m => `  • ${m.prevChapter} (prev index ${m.prevIdx}) → ${m.currChapter} (new index ${m.currIdx}) [EXACT MATCH]`).join('\n')}
` : 'No exact matched chapters found.\n'}

${chapterMapping.added.length > 0 ? `NEW CHAPTERS (need fresh scoring):
${chapterMapping.added.map(a => `  • ${a.chapter} (new index ${a.idx})`).join('\n')}
` : 'No new chapters.\n'}

${chapterMapping.removed.length > 0 ? `REMOVED CHAPTERS (scores no longer needed):
${chapterMapping.removed.map(r => `  • ${r.chapter} (was index ${r.idx})`).join('\n')}
` : 'No removed chapters.\n'}

${chapterMapping.modified.length > 0 ? `MODIFIED CHAPTERS (content changed - PLEASE RE-EVALUATE SCORES):
${chapterMapping.modified.map(m => `  • ${m.currChapter} (new index ${m.currIdx}) - was: ${m.prevChapter} (prev index ${m.prevIdx})${m.matchType === 'fuzzy' ? ` [fuzzy match: ${(m.similarity * 100).toFixed(0)}% similar]` : ' [significant edits]'}`).join('\n')}
` : 'No modified chapters.\n'}

==========================================================================
## MANUSCRIPT AT TIME OF ORIGINAL ANALYSIS
==========================================================================

${prevSnapshot.substring(0, 150000)}

==========================================================================
## CURRENT MANUSCRIPT (NOW)
==========================================================================

Current chapters: ${chapters.map((c, i) => `${i + 1}. ${c} [hash: ${currentChapterHashes[i]}]`).join('\n')}

${manuscriptText.substring(0, 150000)}

==========================================================================
## YOUR TASK: UPDATE YOUR SCORES
==========================================================================

**CRITICAL RULES:**

1. **START WITH YOUR PREVIOUS SCORES** - Use your previous scores as the baseline.

2. **USE THE CHAPTER COMPARISON** - The chapter comparison above tells you:
   - MATCHED chapters have IDENTICAL content → you generally should keep scores similar, but MAY adjust them if the surrounding context (reordering) changes their pacing or impact
   - MODIFIED chapters have changed content (fuzzy or significant edits) → you SHOULD re-evaluate these scores based on the changes
   - NEW chapters have no previous score → provide fresh scores
   - REMOVED chapters should be dropped from the scores array

3. **BUILD THE NEW SCORES ARRAY** based on the chapter comparison:
   - Place each current chapter's score in the correct position
   - For MATCHED chapters, START with the previous score but adjust if necessary based on new context
   - For NEW chapters, provide fresh scores
   - For MODIFIED chapters, provide updated scores based on the new content

4. **PRESERVE STABILITY** - Do not make random changes. Only adjust scores for matched chapters if the narrative flow has significantly shifted due to reordering.

## OUTPUT FORMAT

{
  "scores": [...array of ${chapters.length} numbers, one per chapter in CURRENT order...],
  "justification": "Explain what changed based on the chapter comparison and how scores were updated.",
  "manuscriptChanged": true/false,
  "changedChapters": [list of current chapter numbers that had score changes, or empty if no changes],
  "matchedChapters": ${JSON.stringify(chapterMapping.matched.map(m => ({ oldIndex: m.prevIdx, newIndex: m.currIdx })))}
}

**REMEMBER**: MATCHED chapters (exact matches) MUST have identical scores. MODIFIED chapters (fuzzy matches) should be re-scored.`;

        } else {
            // Fresh analysis prompt (first run)
            prompt = `You are a critical literary analyst. Analyze the following manuscript and rate EACH CHAPTER on "${this.metricLabels[metric]}" from 1-10.

Be COMPARATIVE - your scores should reflect how chapters compare to EACH OTHER within this story. High variance is good (don't just give everything 6-8).

Chapters to rate:
${chapters.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Respond with ONLY valid JSON in this exact format:
{
  "scores": [7, 5, 8, 6, ...],
  "justification": "A 2-3 sentence explanation of what drove your ratings and which chapters stood out."
}

The "scores" array must have exactly ${chapters.length} numbers (one per chapter in order).

=== MANUSCRIPT ===
${manuscriptText.substring(0, 300000)}`;
        }

        const response = await this.app.aiService.sendMessage(
            [{ role: 'user', content: prompt }],
            {
                systemPrompt: 'You are a literary analyst. Output valid JSON only. No markdown.',
                temperature: 0.4
            }
        );

        // Parse JSON
        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            // Validate scores array
            if (!Array.isArray(parsed.scores) || parsed.scores.length !== chapters.length) {
                throw new Error('Invalid scores array length');
            }

            const scores = parsed.scores.map(s => Math.max(1, Math.min(10, parseInt(s) || 5)));

            // Validate matched chapters if regenerate
            if (isRegenerate && previousAnalysis && parsed.matchedChapters && Array.isArray(parsed.matchedChapters)) {
                const prevScores = previousAnalysis.metrics?.[metric]?.scores || [];
                let validationErrors = [];

                parsed.matchedChapters.forEach(match => {
                    const oldIdx = match.oldIndex;
                    const newIdx = match.newIndex;

                    if (prevScores[oldIdx] !== undefined && scores[newIdx] !== undefined) {
                        if (prevScores[oldIdx] !== scores[newIdx]) {
                            validationErrors.push(
                                `Chapter at index ${newIdx} was marked as matched but score changed from ${prevScores[oldIdx]} to ${scores[newIdx]}`
                            );
                        }
                    }
                });

                if (validationErrors.length > 0) {
                    console.log(`StoryPulse: AI adjusted scores for matched chapters (${metric}):`, validationErrors);
                    // We allow the AI to update scores even for matched chapters if context changed
                }
            }

            return {
                scores: scores,
                justification: parsed.justification || 'No justification provided.',
                manuscriptChanged: parsed.manuscriptChanged,
                changedChapters: parsed.changedChapters || [],
                matchedChapters: parsed.matchedChapters || []
            };
        } catch (e) {
            console.error('Failed to parse metric score', metric, response);
            // Fallback
            return {
                scores: chapters.map(() => 5),
                justification: 'Analysis failed to parse. Default scores applied.'
            };
        }
    }

    renderNotes() {
        const data = this.app.state.analytics?.pulse;
        if (!data || !data.metrics) {
            this.notesContainer.innerHTML = '<div class="pulse-placeholder">Run analysis to see notes.</div>';
            return;
        }

        let html = '<div class="pulse-notes-list">';

        this.metrics.forEach(metric => {
            const metricData = data.metrics[metric];
            if (!metricData) return;

            html += `
                <div class="pulse-note-item">
                    <div class="pulse-note-header" style="border-left: 4px solid ${this.colors[metric]}">
                        <span class="pulse-note-label">${this.metricLabels[metric]}</span>
                    </div>
                    <div class="pulse-note-body">${metricData.justification}</div>
                </div>
            `;
        });

        html += '</div>';
        this.notesContainer.innerHTML = html;
    }

    renderGraph() {
        const data = this.app.state.analytics?.pulse;
        if (!data || !data.chapters || !data.metrics) {
            this.graphContainer.innerHTML = '<div class="pulse-placeholder">Click "Run Analysis" to generate the story arc.</div>';
            return;
        }

        const activeMetrics = Array.from(this.checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (activeMetrics.length === 0) {
            this.graphContainer.innerHTML = '<div class="pulse-placeholder">Select metrics to view graph.</div>';
            return;
        }

        const chapters = data.chapters;
        const count = chapters.length;

        // Dynamic width: minimum 120px per chapter, or container width if smaller
        const containerWidth = this.graphContainer.clientWidth || 800;
        const minWidthPerChapter = 120;
        const calculatedWidth = Math.max(containerWidth, count * minWidthPerChapter);

        const height = 400;
        const padding = { top: 30, right: 40, bottom: 100, left: 50 };
        const graphW = calculatedWidth - padding.left - padding.right;
        const graphH = height - padding.top - padding.bottom;
        const xStep = graphW / (count - 1 || 1);

        const getY = (score) => {
            const n = Math.max(1, Math.min(10, score));
            return padding.top + graphH - ((n - 1) / 9) * graphH;
        };

        let svgHtml = `<div class="pulse-graph-inner" style="width: ${calculatedWidth}px; height: ${height}px;">`;
        svgHtml += `<svg class="pulse-svg" width="${calculatedWidth}" height="${height}">`;

        // Grid Lines
        for (let i = 1; i <= 10; i++) {
            const y = getY(i);
            svgHtml += `<line x1="${padding.left}" y1="${y}" x2="${calculatedWidth - padding.right}" y2="${y}" class="pulse-grid-line" />`;
            if (i % 2 === 0 || i === 10 || i === 1) {
                svgHtml += `<text x="${padding.left - 8}" y="${y + 3}" class="pulse-axis-text" text-anchor="end">${i}</text>`;
            }
        }

        // X Labels (Chapter names - horizontal, simple)
        chapters.forEach((ch, i) => {
            const x = padding.left + i * xStep;
            // Just use the raw chapter label (already formatted with Part info)
            let label = ch;
            if (label.length > 12) label = label.substring(0, 10) + '..';
            svgHtml += `<text x="${x}" y="${padding.top + graphH + 20}" class="pulse-axis-text" text-anchor="middle" style="font-size: 10px;">${label}</text>`;
        });

        // Draw Lines for each active metric
        activeMetrics.forEach(metric => {
            const metricData = data.metrics[metric];
            if (!metricData || !metricData.scores) return;

            const color = this.colors[metric];
            const scores = metricData.scores;
            let points = [];

            scores.forEach((score, i) => {
                points.push({ x: padding.left + i * xStep, y: getY(score), val: score, ch: chapters[i] });
            });

            if (points.length === 0) return;

            // Curvy path
            let dPath = `M ${points[0].x} ${points[0].y}`;

            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i];
                const p1 = points[i + 1];
                const cp1x = p0.x + (p1.x - p0.x) * 0.4;
                const cp1y = p0.y;
                const cp2x = p1.x - (p1.x - p0.x) * 0.4;
                const cp2y = p1.y;
                dPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
            }

            svgHtml += `<path d="${dPath}" class="pulse-line-path" stroke="${color}" />`;

            // Draw Dots
            points.forEach(p => {
                svgHtml += `<circle cx="${p.x}" cy="${p.y}" class="pulse-point" stroke="${color}" data-val="${this.metricLabels[metric]}: ${p.val}\n${p.ch}" />`;
            });

            // Draw Previous Analysis Line (dotted) if checkbox is checked
            const prevCheckbox = document.querySelector(`.prev-checkbox[data-metric="${metric}"]`);
            if (prevCheckbox && prevCheckbox.checked && data._previousMetrics && data._snapshot) {
                const prevMetricData = data._previousMetrics[metric];

                if (prevMetricData && prevMetricData.scores) {
                    const prevScores = prevMetricData.scores;
                    // Use the SPECIFIC chapters list that matches these scores
                    const prevChapters = data._previousChapters || [];
                    let prevPoints = [];

                    // Map previous scores to current chapter positions
                    prevScores.forEach((score, prevIdx) => {
                        // Find if this previous chapter still exists
                        const prevChapter = prevChapters[prevIdx];
                        const currIdx = chapters.findIndex(ch => ch === prevChapter);

                        if (currIdx !== -1) {
                            prevPoints.push({
                                x: padding.left + currIdx * xStep,
                                y: getY(score),
                                val: score,
                                ch: prevChapter
                            });
                        }
                    });

                    if (prevPoints.length > 0) {
                        // Draw dotted line for previous scores
                        let prevDPath = `M ${prevPoints[0].x} ${prevPoints[0].y}`;

                        for (let i = 0; i < prevPoints.length - 1; i++) {
                            const p0 = prevPoints[i];
                            const p1 = prevPoints[i + 1];
                            const cp1x = p0.x + (p1.x - p0.x) * 0.4;
                            const cp1y = p0.y;
                            const cp2x = p1.x - (p1.x - p0.x) * 0.4;
                            const cp2y = p1.y;
                            prevDPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
                        }

                        svgHtml += `<path d="${prevDPath}" class="pulse-line-path pulse-line-dotted" stroke="${color}" stroke-dasharray="5,5" stroke-width="2" opacity="0.5" />`;

                        // Draw smaller dots for previous scores
                        prevPoints.forEach(p => {
                            svgHtml += `<circle cx="${p.x}" cy="${p.y}" r="3" stroke="${color}" fill="none" stroke-width="1.5" class="pulse-point-prev" data-val="${this.metricLabels[metric]} (PREV): ${p.val}\n${p.ch}" />`;
                        });
                    }
                }
            }
        });

        svgHtml += `</svg></div>`;
        svgHtml += `<div id="pulse-tooltip" class="pulse-tooltip"></div>`;

        this.graphContainer.innerHTML = svgHtml;

        // Tooltip events
        this.graphContainer.querySelectorAll('.pulse-point, .pulse-point-prev').forEach(dot => {
            dot.addEventListener('mouseenter', (e) => {
                const tip = document.getElementById('pulse-tooltip');
                tip.innerText = e.target.getAttribute('data-val');
                tip.classList.add('visible');
                const rect = this.graphContainer.getBoundingClientRect();
                tip.style.left = (e.clientX - rect.left + 10) + 'px';
                tip.style.top = (e.clientY - rect.top - 30) + 'px';
            });
            dot.addEventListener('mouseleave', () => {
                document.getElementById('pulse-tooltip').classList.remove('visible');
            });
        });
    }
}
