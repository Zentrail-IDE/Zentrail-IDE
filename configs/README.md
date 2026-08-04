# Shared configuration

Centralized, environment-agnostic configuration consumed by every layer. Keep
ports, paths, and service URLs here — never hard-code them in app code (see
`AGENTS.md` rule 5).

| File           | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `ports.json`   | Network ports for the Go core, Python RT, and IPC.   |
| `defaults.json`| Default runtime values mirrored by `packages/settings`. |
| `.env.example` | Copy to `.env` to override any value locally.        |
