# TASK.md

# Zentrail IDE Development Roadmap

Version: 1.0

Status: Planning

---

# Summary

This document defines the complete development roadmap for **Zentrail IDE**, an AI-native desktop development environment designed for modern software engineering.

The roadmap is divided into multiple phases, each containing detailed tasks, milestones, dependencies, and implementation goals. Every feature should be completed, tested, and documented before progressing to the next phase.

---

# Development Phases

## Phase 1 — Foundation

* Project initialization
* Repository structure
* Development environment
* Tauri Desktop setup
* Go Core initialization
* TypeScript UI setup
* Python Runtime setup
* Configuration system
* Build system

---

## Phase 2 — Core IDE

* Main application window
* Menu bar
* Navigation
* Sidebar
* Monaco Editor
* File Explorer
* Search
* Tabs
* Workspace Manager
* Status Bar
* Notifications

---

## Phase 3 — Terminal & Git

* Integrated Terminal
* PowerShell
* CMD
* Git Bash
* Git integration
* Git history
* Branch management
* Commit workflow
* Pull & Push
* Merge support

---

## Phase 4 — Workspace System

* Workspace Manager
* Workspace Sessions
* Workspace Memory
* Workspace Settings
* Multi-project support
* Recent Workspaces
* Workspace Templates

---

## Phase 5 — AI Runtime

* AI Chat
* Model Manager
* AI API Manager
* Local Models
* Cloud Models
* Prompt Manager
* Conversation Memory
* Streaming Responses

---

## Phase 6 — Workspace Agent

**Status: Completed (2026-08-06)** — implemented across the `@zentrail/agent` package, the Tauri Rust backend (`src-tauri/src/commands/agent.rs`), the desktop IPC/store layer, and the Agents activity panel.

* Agent Manager — `agent_list_agents` / `agent_save_agent` / `agent_delete_agent` (persisted registry)
* Agent Lifecycle — `agent_start` / `agent_stop` / `agent_pause` / `agent_resume` (created → starting → running → paused → stopped → error)
* Agent Communication — `agent_send_message` / `agent_broadcast` / `agent_list_messages`
* Agent Scheduler — `agent_schedule_task` / `agent_run_schedule` / `agent_cancel_schedule` (cron + `@every:` intervals)
* Agent Memory — `agent_get_memory` / `agent_save_memory` / `agent_delete_memory`
* Background Agents — `agent_start_background` / `agent_list_background` (detached runs)
* Agent Monitoring — `agent_get_metrics` / `agent_get_all_metrics` (health, CPU, memory, tasks, uptime)

---

## Phase 7 — Multi-Agent Collaboration

* Manager Agent
* Planning Agent
* Coding Agent
* Review Agent
* Testing Agent
* Security Agent
* Git Agent
* Task Orchestration
* Shared Context
* Parallel Execution

---

## Phase 8 — AI CLI Integration

* Claude Code CLI
* Gemini CLI
* OpenAI CLI
* Local AI CLI
* Custom CLI
* CLI Process Manager
* CLI Session Manager

---

## Phase 9 — BOT System

* Workspace BOT
* Git BOT
* Review BOT
* Security BOT
* Documentation BOT
* Deployment BOT
* Automation BOT

---

## Phase 10 — Skill System

* Skill Manager
* Skill Installer
* Skill Registry
* Skill Marketplace
* Skill SDK
* Skill Runtime
* Custom Skills

---

## Phase 11 — Plugin System

* Plugin SDK
* Plugin Manager
* Plugin API
* Plugin Marketplace
* Plugin Runtime
* Plugin Sandbox

---

## Phase 12 — Settings

* General Settings
* Theme Settings
* AI Settings
* Git Settings
* Terminal Settings
* Workspace Settings
* Shortcut Settings

---

## Phase 13 — UI/UX

* Theme System
* Components
* Responsive Layout
* Animations
* Accessibility
* Design Tokens
* Dark Theme

---

## Phase 14 — Performance

* Startup Optimization
* Memory Optimization
* Rendering Optimization
* File Indexing
* Caching
* Background Processing

---

## Phase 15 — Security

* API Key Encryption
* Secure Storage
* Permission System
* Workspace Isolation
* Plugin Sandbox
* Audit Logs

---

## Phase 16 — Testing

* Unit Testing
* Integration Testing
* UI Testing
* Performance Testing
* AI Testing
* Security Testing
* End-to-End Testing

---

## Phase 17 — Release

* Windows Packaging
* Installer
* Auto Update
* Release Notes
* Documentation
* CI/CD Pipeline
* Production Release

---

# Success Criteria

* Native Desktop Performance
* Smooth User Experience
* AI-First Workflow
* Real-Time Collaboration
* Multi-Agent Coordination
* Enterprise-Ready Architecture
* Modular & Extensible Design
* Cross-Platform Ready
* Secure by Default
* Production Quality Release

---

# Final Goal

Deliver **Zentrail IDE** as a high-performance AI-native desktop IDE that seamlessly combines code editing, multi-agent collaboration, AI CLI integration, Git automation, extensible skills, and a modern developer experience into a unified workspace.
