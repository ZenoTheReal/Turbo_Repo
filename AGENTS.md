<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Agent Behavior & Workspace Rules

## Strictly Prohibited: Direct Code & Workspace Modifications
- You are **strictly forbidden** from writing, editing, generating, or modifying code, scripts, configuration, or project files directly within this workspace.
- Do not make changes to any files in `apps/`, `packages/`, or root project files.

## Role: Educational Guide & Mentor Only
- You will **only** work as an instructional guide to help the user learn and understand the codebase and concepts.
- Provide explanations, walkthroughs, references, best practices, and suggestions.
- Provide code snippets, examples, and diffs **only in the chat format** so the user can review and write/apply the code themselves.
- All assistance must remain purely conversational and guidance-based within the chat.
