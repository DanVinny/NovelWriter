/**
 * FountainParser - Parse Fountain screenplay syntax
 * Based on fountain.io specification
 * 
 * Fountain is a plain-text format for writing screenplays.
 * This parser converts Fountain text into structured elements
 * that can be rendered as a formatted screenplay.
 * 
 * FULL FOUNTAIN SPEC: https://fountain.io/syntax
 */
export class FountainParser {
    constructor() {
        // Patterns for detecting Fountain elements
        this.patterns = {
            // Scene headings: INT. or EXT. or variations
            sceneHeading: /^(INT|EXT|EST|INT\.\/EXT|INT\/EXT|I\/E)[.\s]/i,
            // Forced scene heading: starts with .
            forcedSceneHeading: /^\./,
            // Scene number: #number# at end of scene heading
            sceneNumber: /#([^#]+)#\s*$/,
            // Parenthetical: text in parentheses
            parenthetical: /^\s*\(.*\)\s*$/,
            // Transition: ends with TO: or is CUT TO: etc.
            transition: /^[A-Z\s]+TO:$/,
            // Forced transition: starts with >
            forcedTransition: /^>/,
            // Centered text: >text<
            centered: /^>.*<$/,
            // Section heading: # for acts
            sectionHeading: /^#+\s/,
            // Synopsis: = at start
            synopsis: /^=/,
            // Page break: === or more
            pageBreak: /^={3,}$/,
            // Lyrics: ~
            lyrics: /^~/
        };

        // Character extensions
        this.characterExtensions = ['V.O.', 'O.S.', 'O.C.', "CONT'D", 'CONT', 'PRE-LAP'];
    }

    /**
     * Parse Fountain text into an array of elements
     */
    parse(text) {
        // First, remove boneyard (comments)
        text = this.removeBoneyard(text);

        const lines = text.split('\n');
        const elements = [];
        let i = 0;
        let inDialogue = false;
        let lastCharacter = null;
        let dualDialogueNext = false;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();
            const prevLine = i > 0 ? lines[i - 1].trim() : '';
            const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';

            // Parse the current line
            const element = this.parseLine(trimmed, prevLine, nextLine, inDialogue);

            // Track dual dialogue
            if (element.type === 'character') {
                if (dualDialogueNext) {
                    element.dual = 'right';
                    dualDialogueNext = false;
                }
                if (trimmed.endsWith('^')) {
                    element.text = trimmed.slice(0, -1).trim();
                    dualDialogueNext = true;
                    // Mark the previous character block as dual left
                    this.markPreviousAsDualLeft(elements);
                }
                inDialogue = true;
                lastCharacter = trimmed;
            } else if (element.type === 'blank' && inDialogue) {
                inDialogue = false;
                lastCharacter = null;
            } else if (element.type === 'scene-heading' || element.type === 'transition') {
                inDialogue = false;
                lastCharacter = null;
            }

            // Mark dialogue lines
            if (inDialogue && element.type === 'action' && lastCharacter) {
                element.type = 'dialogue';
            }

            // Extract and store scene number if present
            if (element.type === 'scene-heading') {
                const sceneNumMatch = element.text.match(this.patterns.sceneNumber);
                if (sceneNumMatch) {
                    element.sceneNumber = sceneNumMatch[1];
                    element.text = element.text.replace(this.patterns.sceneNumber, '').trim();
                }
            }

            elements.push(element);
            i++;
        }

        return elements;
    }

    /**
     * Remove boneyard comments from text
     */
    removeBoneyard(text) {
        // Remove /* ... */ comments (can be multiline)
        return text.replace(/\/\*[\s\S]*?\*\//g, '');
    }

    /**
     * Mark previous character/dialogue block as dual left
     */
    markPreviousAsDualLeft(elements) {
        // Walk backwards to find and mark the previous character block
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            if (el.type === 'character' && !el.dual) {
                el.dual = 'left';
                // Mark its dialogue too
                for (let j = i + 1; j < elements.length; j++) {
                    if (elements[j].type === 'dialogue' || elements[j].type === 'parenthetical') {
                        elements[j].dual = 'left';
                    } else if (elements[j].type === 'blank' || elements[j].type === 'character') {
                        break;
                    }
                }
                break;
            }
        }
    }

    /**
     * Parse a single line into an element
     */
    parseLine(line, prevLine, nextLine, inDialogue) {
        // Empty line
        if (!line) {
            return { type: 'blank', text: '' };
        }

        // Centered text: >text<
        if (this.patterns.centered.test(line)) {
            return { type: 'centered', text: line.slice(1, -1).trim() };
        }

        // Forced transition: >TEXT (without closing <)
        if (this.patterns.forcedTransition.test(line) && !line.endsWith('<')) {
            return { type: 'transition', text: line.slice(1).trim() };
        }

        // Scene heading
        if (this.patterns.sceneHeading.test(line)) {
            return { type: 'scene-heading', text: line };
        }

        // Forced scene heading: .LOCATION
        if (this.patterns.forcedSceneHeading.test(line) && line.length > 1) {
            return { type: 'scene-heading', text: line.slice(1) };
        }

        // Transition: FADE OUT:, CUT TO:, etc.
        if (this.patterns.transition.test(line)) {
            return { type: 'transition', text: line };
        }

        // Section heading (acts): # ACT ONE
        if (this.patterns.sectionHeading.test(line)) {
            const level = (line.match(/^#+/) || [''])[0].length;
            return { type: 'section', text: line.replace(/^#+\s*/, ''), level };
        }

        // Page break
        if (this.patterns.pageBreak.test(line)) {
            return { type: 'page-break', text: '' };
        }

        // Parenthetical (must be in dialogue context)
        if (inDialogue && this.patterns.parenthetical.test(line)) {
            return { type: 'parenthetical', text: line };
        }

        // Character name: ALL CAPS, preceded by blank line OR scene heading
        const lineWithoutDual = line.replace(/\^$/, '').trim();
        const isPrevBlank = prevLine === '' || this.patterns.sceneHeading.test(prevLine);
        if (isPrevBlank && this.isCharacterLine(lineWithoutDual) && nextLine !== '') {
            return { type: 'character', text: lineWithoutDual };
        }

        // Lyrics
        if (this.patterns.lyrics.test(line)) {
            return { type: 'lyrics', text: line.slice(1).trim() };
        }

        // Synopsis
        if (this.patterns.synopsis.test(line)) {
            return { type: 'synopsis', text: line.slice(1).trim() };
        }

        // Default: action
        return { type: 'action', text: line };
    }

    /**
     * Check if a line is a character name
     */
    isCharacterLine(line) {
        // Must be ALL CAPS (with allowed characters like numbers, spaces, apostrophes, periods)
        // May end with an extension like (V.O.) or (O.S.)
        const withoutExtension = line.replace(/\s*\([^)]+\)\s*$/, '').trim();

        // Check if remaining text is all caps and valid
        if (!withoutExtension) return false;
        if (!/^[A-Z][A-Z0-9 '.\-]*$/.test(withoutExtension)) return false;

        // Exclude common transitions that might look like character names
        if (/^(FADE|CUT|DISSOLVE|SMASH|MATCH|JUMP)/.test(withoutExtension)) return false;

        return true;
    }

    /**
     * Convert parsed elements to HTML for preview
     */
    toHTML(elements) {
        let html = '';
        let inDualDialogue = false;
        let dualSide = null;

        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const escaped = this.escapeHTML(el.text);
            const formatted = this.formatInline(escaped);

            // Handle dual dialogue wrapper
            if (el.dual === 'left' && el.type === 'character') {
                html += '<div class="fountain-dual-dialogue">';
                html += '<div class="fountain-dual-left">';
                inDualDialogue = true;
                dualSide = 'left';
            } else if (el.dual === 'right' && el.type === 'character') {
                html += '</div><div class="fountain-dual-right">';
                dualSide = 'right';
            }

            // Render element
            switch (el.type) {
                case 'scene-heading':
                    const sceneNum = el.sceneNumber ? `<span class="fountain-scene-number">#${el.sceneNumber}</span>` : '';
                    html += `<p class="fountain-scene-heading">${sceneNum}${formatted}</p>`;
                    break;
                case 'character':
                    html += `<p class="fountain-character">${formatted}</p>`;
                    break;
                case 'dialogue':
                    html += `<p class="fountain-dialogue">${formatted}</p>`;
                    break;
                case 'parenthetical':
                    html += `<p class="fountain-parenthetical">${formatted}</p>`;
                    break;
                case 'transition':
                    html += `<p class="fountain-transition">${formatted}</p>`;
                    break;
                case 'centered':
                    html += `<p class="fountain-centered">${formatted}</p>`;
                    break;
                case 'action':
                    html += `<p class="fountain-action">${formatted}</p>`;
                    break;
                case 'section':
                    html += `<h${el.level} class="fountain-section fountain-section-${el.level}">${formatted}</h${el.level}>`;
                    break;
                case 'page-break':
                    html += `<hr class="fountain-page-break">`;
                    break;
                case 'lyrics':
                    html += `<p class="fountain-lyrics">${formatted}</p>`;
                    break;
                case 'synopsis':
                    html += `<p class="fountain-synopsis">${formatted}</p>`;
                    break;
                case 'note':
                    html += `<p class="fountain-note">${formatted}</p>`;
                    break;
                case 'blank':
                    // Close dual dialogue if needed
                    if (inDualDialogue && dualSide === 'right') {
                        html += '</div></div>';
                        inDualDialogue = false;
                        dualSide = null;
                    }
                    html += '<p class="fountain-blank">&nbsp;</p>';
                    break;
                default:
                    html += `<p>${formatted}</p>`;
            }
        }

        // Close any unclosed dual dialogue
        if (inDualDialogue) {
            html += '</div></div>';
        }

        return html;
    }

    /**
     * Apply inline formatting (bold, italic, underline)
     */
    formatInline(text) {
        // Order matters! Most specific patterns first

        // Bold + Italic + Underline: ***_text_***
        text = text.replace(/\*\*\*_([^_*]+)_\*\*\*/g, '<strong><em><u>$1</u></em></strong>');

        // Bold + Italic: ***text***
        text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');

        // Bold + Underline: **_text_**
        text = text.replace(/\*\*_([^_*]+)_\*\*/g, '<strong><u>$1</u></strong>');

        // Italic + Underline: *_text_*
        text = text.replace(/\*_([^_*]+)_\*/g, '<em><u>$1</u></em>');

        // Bold: **text**
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic: *text*
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Underline: _text_
        text = text.replace(/_([^_]+)_/g, '<u>$1</u>');

        // Notes: [[text]]
        text = text.replace(/\[\[([^\]]*)\]\]/g, '<span class="fountain-inline-note">$1</span>');

        return text;
    }

    /**
     * Escape HTML special characters
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get a plain text summary (for word count, etc.)
     */
    getPlainText(elements) {
        return elements
            .filter(el => ['action', 'dialogue', 'character', 'parenthetical'].includes(el.type))
            .map(el => el.text)
            .join(' ');
    }

    /**
     * Count dialogue vs action ratio
     */
    getStats(elements) {
        const dialogueCount = elements.filter(el => el.type === 'dialogue').length;
        const actionCount = elements.filter(el => el.type === 'action').length;
        const sceneCount = elements.filter(el => el.type === 'scene-heading').length;
        const characterAppearances = {};

        elements.filter(el => el.type === 'character').forEach(el => {
            const name = el.text.replace(/\s*\(.*\)/, '').trim();
            characterAppearances[name] = (characterAppearances[name] || 0) + 1;
        });

        return {
            dialogueLines: dialogueCount,
            actionLines: actionCount,
            sceneCount,
            characterAppearances,
            // Rough page estimate: ~56 lines per page in a screenplay
            estimatedPages: Math.ceil(elements.length / 56)
        };
    }
}
