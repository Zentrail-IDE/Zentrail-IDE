# CONTRIBUTORS-GUIDE.md

# Zentrail IDE — Contributor Guide

Welcome to the Zentrail IDE project.

Thank you for contributing to Zentrail IDE. This guide explains our development workflow, project standards, coding conventions, pull request process, and contribution expectations.

---

# Project Overview

Zentrail IDE is an AI-native desktop IDE built with a modern, modular architecture.

Primary goals:

* High Performance
* AI-First Development
* Native Desktop Experience
* Modular Architecture
* Multi-Agent Collaboration
* Extensible Plugin & Skill System
* Enterprise-Ready Codebase

---

# Technology Stack

## Frontend

* TypeScript
* React
* Tauri v2
* Monaco Editor
* Tailwind CSS

## Backend

* Go
* gRPC
* WebSocket

## AI Runtime

* Python
* MCP
* LangGraph

---

# Repository Structure

```text
apps/
backend/
runtime/
packages/
plugins/
skills/
configs/
workspace/
assets/
scripts/
docs/
```

Every feature should live in its own module and avoid unnecessary coupling with other packages.

---

# Branch Strategy

Use feature branches for all development.

Examples:

```text
feature/editor-tabs
feature/workspace-agent
feature/git-bot
feature/terminal
feature/settings
feature/theme
feature/plugin-sdk
```

Never commit directly to the main branch.

---

# Commit Convention

Follow Conventional Commits.

Examples

```text
feat(editor): add split editor

feat(agent): implement workspace manager

fix(git): resolve push issue

refactor(ui): improve sidebar layout

docs(project): update architecture

test(runtime): add websocket tests
```

---

# Pull Request Guidelines

Every Pull Request should include:

* Clear description
* Related issue
* Screenshots (if UI changes)
* Test results
* Breaking changes (if any)

PR Checklist

* Code builds successfully
* Tests pass
* No lint errors
* Documentation updated
* Feature complete
* No unnecessary dependencies

---

# Coding Standards

## TypeScript

* Enable strict mode.
* Avoid using `any`.
* Prefer reusable components.
* Keep functions small and focused.
* Use descriptive names.

---

## Go

* Follow standard Go formatting.
* Keep packages focused.
* Return explicit errors.
* Avoid global state.
* Write concurrent code safely.

---

## Python

* Follow PEP 8.
* Add type hints where practical.
* Separate AI orchestration from business logic.
* Keep prompts and tools modular.

---

# Project Principles

Every new feature should be:

* Modular
* Testable
* Maintainable
* Reusable
* Documented
* Performance-oriented

Avoid tightly coupled implementations.

---

# UI Guidelines

Theme

* Black
* Gray
* Ocean White

Design Principles

* Minimal
* Clean
* Consistent
* Developer-first
* Fast Rendering
* Smooth Animations

Maintain consistent spacing, typography, and component behavior throughout the application.

---

# Performance Guidelines

Contributors should prioritize performance.

Guidelines:

* Lazy load heavy modules.
* Avoid unnecessary renders.
* Cache expensive operations.
* Keep startup fast.
* Minimize memory usage.
* Prefer asynchronous operations.

---

# Security Guidelines

Never commit:

* API Keys
* Tokens
* Passwords
* Private certificates
* Secrets

Use environment variables and secure storage for sensitive information.

Validate all external input and sanitize file system operations.

---

# Testing Requirements

Before submitting code:

* Run unit tests.
* Verify the application builds successfully.
* Test on Windows.
* Confirm no regressions.
* Check AI workflows when applicable.

New features should include appropriate tests whenever feasible.

---

# Documentation

Every significant feature should include:

* Purpose
* Architecture
* Usage
* Configuration
* Limitations
* Future improvements

Keep documentation synchronized with code changes.

---

# Issue Workflow

1. Create or reference an issue.
2. Discuss the proposed solution if needed.
3. Implement the feature.
4. Test thoroughly.
5. Open a Pull Request.
6. Address review feedback.
7. Merge after approval.

---

# Code Review Checklist

Reviewers should verify:

* Readability
* Correctness
* Maintainability
* Security
* Performance
* Documentation
* Test coverage
* Architectural consistency

---

# Contribution Philosophy

We value:

* Simplicity over complexity.
* Maintainability over shortcuts.
* Performance over unnecessary abstraction.
* Clear architecture over clever code.
* Collaboration over individual ownership.

Every contribution should improve the overall developer experience.

---

# License

By contributing to Zentrail IDE, you agree that your contributions will be licensed under the project's chosen open-source license.

---

# Thank You

Every contribution—whether code, documentation, bug reports, testing, or design—helps make Zentrail IDE a better AI-native development platform.

Build with quality. Build with clarity. Build for developers.
