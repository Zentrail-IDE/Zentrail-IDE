# PLUGIN-SDK.md

# Zentrail IDE Plugin SDK

## Purpose

The Plugin SDK enables developers to extend Zentrail IDE with custom functionality without modifying the core application.

---

## Plugin Structure

* manifest.json
* index.ts
* assets/
* commands/
* views/
* icons/

---

## Plugin Capabilities

* Register Commands
* Custom Sidebar Views
* Editor Extensions
* Status Bar Items
* Context Menu Actions
* File Watchers
* Workspace Events

---

## Lifecycle

* Install
* Load
* Activate
* Execute
* Deactivate
* Uninstall

---

## API Access

* Workspace API
* Editor API
* Git API
* Terminal API
* Notification API
* Settings API

---

## Security

* Sandboxed Execution
* Permission System
* Resource Isolation
* Signed Plugins (Future)

---

## Goals

* Stable SDK
* Easy Development
* Safe Execution
* High Performance
