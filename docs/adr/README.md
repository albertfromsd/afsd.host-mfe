# Architecture Decision Records

Short notes capturing the **why** behind load-bearing decisions in this
template pair. Each ADR is dated, immutable once accepted, and superseded
(not edited) when a decision changes.

Read these before proposing structural changes — most "shouldn't we just…"
ideas are already considered here.

| #    | Title                                                                                                 | Status   |
| ---- | ----------------------------------------------------------------------------------------------------- | -------- |
| 0001 | [Zustand for client state, TanStack Query for server state](0001-zustand-and-tanstack-query.md)       | Accepted |
| 0002 | [Templates stay independent (no monorepo workspace)](0002-templates-stay-independent.md)              | Accepted |
| 0003 | [Host self-federates its own store](0003-self-federation.md)                                          | Accepted |
| 0004 | [Session storage for the persisted store + versioning policy](0004-session-storage-and-versioning.md) | Accepted |
| 0005 | [Cross-MFE event bus on top of EventTarget](0005-cross-mfe-event-bus.md)                              | Accepted |

## Format

ADRs follow the lightweight template:

```markdown
# <number>. <title>

**Status:** Accepted | Superseded by ADR-N | Deprecated
**Date:** YYYY-MM-DD

## Context

What forces are at play, what problem are we trying to solve?

## Decision

What we decided. One paragraph.

## Consequences

What becomes easier, what becomes harder, what we accept.

## Alternatives considered

(Optional) What we rejected and why.
```

## Adding an ADR

1. Copy the most recent ADR as a starting point.
2. Number it sequentially — never reuse a number.
3. Add an entry to the table above.
4. If it supersedes an older ADR, update that ADR's status line to point at the new number.
