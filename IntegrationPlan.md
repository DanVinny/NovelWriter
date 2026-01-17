
## **AI Integration Feature List (Agentic Writing Model)**

### **1. Agent Panel**

* A dedicated side panel for interacting with the AI agent
* Text-based command input (not a chatty assistant)
* Scrollable history of agent actions and responses
* Mode toggle:

  * **Quick Mode** (fast execution)
  * **Planning Mode** (deep analysis and multi-step tasks)

---

### **2. Project Awareness**

The AI agent must be able to:

* See the full manuscript structure (parts, chapters, scenes)
* Read individual scenes or chapters on demand
* Read multiple chapters for cross-context reasoning
* Access optional notes or metadata (plot notes, outlines, character notes)

---

### **3. Editing & Refactoring Capabilities**

The agent should be able to:

* Fix grammar, spelling, and punctuation
* Improve clarity and readability
* Rewrite or refactor paragraphs, scenes, or chapters
* Tighten prose or expand sections
* Rephrase dialogue while preserving meaning and tone

All edits must be **proposed**, not automatically applied.

---

### **4. Diff-Based Change Proposals**

* All AI-generated modifications must be presented as:

  * Text diffs or clear before/after previews
* The user must explicitly:

  * Accept
  * Reject
  * Or manually edit before applying
* No silent edits under any circumstances

---

### **5. Drafting & Generation**

The agent should be able to:

* Draft a new scene or chapter
* Continue from previous chapters as context
* Generate alternative versions of a scene
* Create placeholders or rough drafts for later refinement

Generated content is treated like a new “file” or proposed insert and requires approval.

---

### **6. Analysis & Review**

The agent should be able to:

* Review chapters for grammar and style issues
* Analyze pacing and flow
* Check for continuity or consistency errors
* Identify potential plot or character issues
* Provide feedback reports without making changes

---

### **7. Summarization**

The agent should be able to:

* Summarize scenes or chapters
* Produce a “story so far” summary
* Generate outlines from existing content
* Create brief notes useful for planning or revision

---

### **8. Planning Mode Capabilities**

In Planning Mode, the agent may:

* Analyze the manuscript before acting
* Propose a plan or approach for complex tasks
* Ask clarifying questions if necessary
* Execute multi-step tasks after plan approval

---

### **9. Quick Mode Capabilities**

In Quick Mode, the agent should:

* Assume intent is clear
* Act immediately without extended discussion
* Return direct results (diffs, rewrites, summaries)
* Optimize for speed and minimal verbosity

---

### **10. Human Approval Gate**

* All changes must go through a manual approval step
* The agent cannot commit or apply edits on its own
* The user always has final control

---

### **11. Model & API Flexibility**

* AI integration should be API-based
* Users provide their own API keys
* The system should be model-agnostic where possible
* Different models may be used for Quick vs Planning modes

---

### **12. Non-Goals (Explicit)**

The AI integration should **not**:

* Autocomplete while typing
* Continuously generate text
* Write an entire novel without guidance
* Apply changes without review
* Replace the core writing experience

---

### **13. Overall Intent**

The AI is intended to function as:

* An editor
* A co-writer when asked
* A reviewer and analyst

This integration should feel **equivalent in power and workflow** to an agentic coding assistant, but applied to long-form writing.

---


