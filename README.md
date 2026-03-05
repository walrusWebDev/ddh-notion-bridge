# Daily Dev Habit: Notion Intelligence Bridge 🚀

An AI-powered orchestration layer that connects engineering telemetry with managerial reflection. This service acts as a **Model Context Protocol (MCP)** server, bridging the gap between a developer's raw technical logs and high-level project documentation in Notion.

## 🧠 The "Two-Stream" Architecture
This project solves "documentation friction" by centralizing two distinct data streams:
1. **The Maker Stream (CLI):** Nitty-gritty technical details, blockers, and friction captured directly from the terminal.
2. **The Manager Stream (WordPress):** High-level reflective standups captured via a native WordPress Admin interface.

## 🛠️ Technical Stack
- **Protocol:** Model Context Protocol (MCP)
- **Runtime:** Node.js / TypeScript
- **Infrastructure:** Hosted on Railway, connected to a PostgreSQL backbone
- **Integrations:** Notion API, GitHub (Self-hosted logs), and WordPress

## 🚀 Notion MCP Challenge Features
Built for the March 2026 Notion MCP Challenge, this bridge provides:
- **Semantic Standups:** AI-driven summarization of CLI logs into formatted Notion project updates.
- **Human-in-the-Loop:** Automated data gathering that respects developer flow while ensuring documentation quality.
- **Microservices Core:** Powered by the `ddh-core` API for robust, containerized data handling.

## 🛠️ Setup & Development
(Detailed instructions for cloning and environment variables coming soon...)
