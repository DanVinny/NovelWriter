# Story Pulse Update Bug Fixes

## Summary

The StoryPulse component has been enhanced to properly maintain context of previous scores with correct labeling when updates are made. This document describes the changes made based on the user's feedback.

## Changes Implemented

### 1. Reverted Snapshot Preservation (Original Behavior Maintained)
**Location:** `src/analytics/StoryPulse.js` (Line 314-329)

**Behavior:** The `_snapshot` field now always contains the immediate previous manuscript state for comparison. This prevents token bloating while still enabling proper chapter tracking.

**Implementation:**
```javascript
const pulseData = {
    chapters: chapters,
    metrics: {},
    _snapshot: {
        manuscriptText: manuscriptText,
        chapters: chapters,
        timestamp: new Date().toISOString()
    },
    _previousMetrics: isRegenerate ? previousAnalysis.metrics : null,
    analyzedAt: new Date().toISOString()
};
```

The `_snapshot` is always updated with the current manuscript state on each analysis run, allowing comparison against the immediate previous iteration only.

### 2. Fuzzy Content Matching with 70% Similarity Threshold
**Location:** `src/analytics/StoryPulse.js` (Lines 136-203)

**Problem:** If a chapter's content is edited (even slightly), the hash-based exact matching would fail to track the chapter, causing scores to be lost or reassigned incorrectly.

**Solution:** Implemented fuzzy content matching using Levenshtein distance with a 70% similarity threshold.

**New Helper Methods:**

#### `calculateSimilarity(str1, str2)`
Calculates similarity between two strings using Levenshtein distance ratio (0-1).

#### `extractChapterContent(manuscriptText, chapterName)`
Extracts chapter content from manuscript text for fuzzy comparison.

#### `compareChapters(prevChapters, currChapters, currHashes, prevHashes, prevManuscriptText, currManuscriptText)`
Enhanced to use fuzzy matching:
- **Exact hash match** → content identical → scores preserved
- **Fuzzy match (≥70% similar)** → content slightly edited → scores preserved
- **Modified (<70% similar)** → content significantly changed → scores may update
- **New** → no previous match → fresh scoring
- **Removed** → chapter deleted → scores removed

### 3. Enhanced AI Prompt with Chapter Comparison Details
**Location:** `src/analytics/StoryPulse.js` (Lines 388-478)

**Improvements:**
- Displays content hashes for each chapter
- Shows detailed chapter comparison with match type (exact/fuzzy)
- Indicates fuzzy matches with percentage similarity
- Provides clear rules for updating scores based on match type

**Key Prompt Section:**
```
==========================================================================
## CHAPTER COMPARISON (CRITICAL FOR SCORE TRACKING)
==========================================================================

MATCHED CHAPTERS (content identical or 70%+ similar - scores MUST stay the same):
  • Chapter 1 (prev index 0) → Chapter 1 (new index 0) [fuzzy match: 85% similar]
...
```

### 4. Validation Logic for Matched Chapters
**Location:** `src/analytics/StoryPulse.js` (Lines 543-563)

**Implementation:**
- Validates that matched chapters have identical scores to previous analysis
- If AI incorrectly changes a matched chapter's score, auto-corrects it
- Logs warnings when corrections are made

### 5. "Previous Analysis" Checkboxes for Visual Comparison
**Location:** `index.html` (Lines 854-866) and `src/analytics/StoryPulse.js` (Lines 11-12, 48-53, 714-762)

**HTML Changes:**
- Added "Prev" checkbox next to each metric category checkbox
- Each checkbox has `class="prev-checkbox"` and `data-metric="[metric]"`
- Styled with `prev-label` span for "PREV" text

**JavaScript Changes:**
- Stored previous metrics in `_previousMetrics` field
- When "Prev" checkbox is checked, draws dotted line with same color as metric
- Dotted line shows previous scores mapped to current chapter positions
- Tooltips show "(PREV)" indicator for previous score values
- Smaller dots (r=3) with outline only for previous scores

**Visual Effect:**
- Solid lines and filled dots → current scores
- Dotted lines and outlined dots → previous scores (when checkbox checked)
- Same color for both, allowing easy visual comparison

### 6. CSS Styles for Previous Analysis Feature
**Location:** `src/styles/main.css` (Lines 1671-1688)

**Added Styles:**
```css
.pulse-controls .prev-checkbox {
  opacity: 0.8;
}

.pulse-controls .prev-checkbox:checked {
  opacity: 1;
}

.pulse-controls .prev-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pulse-controls .prev-checkbox:checked + .prev-label {
  color: var(--accent-primary);
}
```

## How It Works Now

### First Analysis
1. Creates `_snapshot` with original manuscript
2. Creates `_previousMetrics: null` (no previous analysis)
3. Analyzes all metrics with fresh scoring

### Subsequent Updates
1. Compares current manuscript to `_snapshot` (immediate previous state)
2. Uses fuzzy matching to track chapters through edits (≥70% similar = same chapter)
3. Builds detailed chapter comparison for AI
4. Validates AI response and auto-corrects matched chapter scores
5. Stores current metrics in `metrics` field
6. Stores previous metrics in `_previousMetrics` field

### Visual Comparison Feature
1. User checks "Prev" checkbox next to a metric
2. System renders dotted line showing previous scores
3. Previous scores mapped to current chapter positions by name
4. Easy visual comparison between solid (current) and dotted (previous) lines

## Benefits

- **Efficient**: Compares to immediate previous iteration only (prevents token bloating)
- **Robust**: Fuzzy matching handles chapter edits gracefully (70% threshold)
- **Transparent**: "Prev" checkbox enables visual comparison of score changes
- **Reliable**: Auto-correction ensures matched chapters preserve scores
- **Flexible**: Chapter reorganization doesn't break score tracking

## Files Modified

1. `src/analytics/StoryPulse.js` - Core logic updates
2. `index.html` - Added "Prev" checkboxes
3. `src/styles/main.css` - Added styles for prev checkboxes
4. `STORY_PULSE_FIXES.md` - This documentation file
