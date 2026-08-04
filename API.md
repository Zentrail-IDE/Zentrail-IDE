# API.md

# Zentrail IDE Internal API

## Purpose

Defines communication between the Desktop UI, Go Core, Python Runtime, AI Services, and Plugins.

---

## API Layers

* UI API
* Workspace API
* Agent API
* Git API
* Terminal API
* Skill API
* Plugin API
* Settings API

---

## Communication

* IPC
* gRPC
* WebSocket
* REST (optional)

---

## Core Services

* Workspace Manager
* Agent Manager
* Model Manager
* Git Manager
* Terminal Manager
* Plugin Manager
* Skill Manager

---

## API Principles

* Versioned
* Typed
* Modular
* Secure
* Event-Driven

---

## Events

* Workspace Updated
* File Changed
* Agent Started
* Agent Finished
* Terminal Output
* Git Status Changed
* Plugin Installed
* Skill Loaded

---

## Future

* Public SDK
* External Automation API
* Remote Workspace API
