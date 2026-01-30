# Contributing to NovelWriter

Thank you for your interest in NovelWriter.

This project was originally built as a personal writing environment and is now open-sourced for others to explore, learn from, and improve.

Before contributing, please read this carefully. NovelWriter has a very specific design philosophy that must be respected.

---

## ⚠️ Core Design Principles (Very Important)

NovelWriter is **not** an AI writing assistant.

It is a writing environment where:

- The manuscript is the single source of truth
- All analysis tools derive information from the manuscript
- AI **must never directly write into the manuscript**
- Suggestions are preferred over automatic edits
- Writer agency is always preserved
- The tool reacts to writing, it does not take over writing

Pull requests that violate these principles will not be accepted.

---

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies

```bash
npm install
npm run dev
```

---

## What Contributions Are Welcome

* Bug fixes
* UI/UX improvements
* Performance optimizations
* Code cleanup and refactoring
* Documentation improvements
* Minor quality-of-life enhancements

---

## What Contributions Are NOT Desired

* Features that automatically rewrite or modify manuscript text
* Turning this into a typical AI writing generator
* Major architectural changes without prior discussion
* Anything that removes writer control from the process

---

## AI & API Configuration

AI features require an API key (OpenAI, Anthropic, or compatible providers).

These keys are stored only in the browser’s localStorage and are never saved in the repository.

---

## Coding Style

* Use modern JavaScript (ES6+)
* Keep components modular and readable
* Follow the existing structure where possible
* Prioritize clarity over cleverness

---

## Reporting Issues

If you find a bug, please open an issue with:

* Clear steps to reproduce
* Screenshots if possible
* Your environment details (browser, OS)

---

Thank you for respecting the spirit of this project.
