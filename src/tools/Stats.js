/**
 * Stats - Document statistics component
 */

export class Stats {
    constructor(app) {
        this.app = app;

        this.wordCountEl = document.getElementById('word-count');
        this.statWords = document.getElementById('stat-words');
        this.statChars = document.getElementById('stat-chars');
        this.statPages = document.getElementById('stat-pages');
        this.statReading = document.getElementById('stat-reading');
    }

    update(text) {
        const stats = this.calculateStats(text);

        // Update status bar
        this.wordCountEl.textContent = `${stats.words} words`;

        // Update tools panel
        this.statWords.textContent = stats.words.toLocaleString();
        this.statChars.textContent = stats.characters.toLocaleString();
        this.statPages.textContent = stats.pages;
        this.statReading.textContent = `${stats.readingTime} min`;
    }

    calculateStats(text) {
        // Clean the text
        const cleanText = text.trim();

        // Word count
        const words = cleanText ? cleanText.split(/\s+/).filter(w => w.length > 0).length : 0;

        // Character count (excluding spaces)
        const characters = cleanText.replace(/\s/g, '').length;

        // Page count (approx 250 words per page)
        const pages = Math.ceil(words / 250) || 0;

        // Reading time (approx 200 words per minute)
        const readingTime = Math.ceil(words / 200) || 0;

        return {
            words,
            characters,
            pages,
            readingTime
        };
    }
}
