---
name: implementation-review
description: Reviews recently changed or selected code for bugs, race conditions, performance, and maintainability. Use after implementing a feature, before a PR, when the user asks for a quality or safety review, or when they say "review what we just wrote."
---

# Implementation review

Systematically review **the diff or the files the user points at** (not the whole repo unless asked). Prefer reading changed hunks, call sites, and tests that cover the behavior.

## Workflow

1. **Establish scope** — `git diff`, `git status`, or paths the user named. Include imports/exports and consumers of new public APIs.
2. **Trace critical paths** — For each user-visible or data-mutating path: inputs, auth/authorization, errors, and persistence.
3. **Walk the checklist below** — Note issues with file:line or symbol when possible.
4. **Summarize** — Group by severity (see Reporting). Mention gaps in tests if behavior is risky and untested.

## Correctness and bugs

- **Logic** — Off-by-one, wrong operators, inverted conditions, unreachable branches, fall-through mistakes.
- **Types and nullability** — Undefined/null handling, optional chaining vs false assumptions, narrowing after async gaps.
- **Boundaries** — Empty collections, max length, pagination, timeouts, partial failures.
- **Security** — Trust boundaries: user input → SQL/RPC/storage/HTML/PDF/email; IDOR (acting on another user’s resources); secrets in client bundles or logs.
- **Errors** — Swallowed errors, wrong HTTP status, missing rollback or compensating action when a multi-step operation fails mid-flight.

## Race conditions and concurrency

- **Client (React)** — Stale closures in `useEffect`/callbacks; effects that fetch without abort/cancellation or a request id (out-of-order responses); optimistic UI without revert; double-submit on rapid clicks.
- **Server** — Non-idempotent handlers invoked twice (retries, double-clicks); read-modify-write without appropriate transaction or row lock; concurrent updates to the same aggregate.
- **Caching** — `revalidatePath` / tag invalidation vs eventual consistency; client cache (SWR/React Query) vs server truth after mutation.
- **Background jobs** — Duplicate processing, at-least-once delivery, partial completion and retries.

Flag **hypothetical** races only when the mechanism is plausible for this stack; mark uncertainty clearly.

## Performance

- **Hot paths** — Unbounded loops, N+1 queries, loading full tables when a filtered/paginated query exists, large payloads in memory.
- **Rendering** — Avoidable re-renders, huge lists without virtualization, expensive work in render without memoization where profiling would matter.
- **I/O** — Sequential awaits that could run in parallel when independent; missing streaming where responses are large.
- **Bundle** — Accidental heavy imports on the client (e.g. server-only libs in client components).

Prefer **concrete** impact (“every row triggers an extra query”) over vague “could be slow.”

## Clean code and maintainability

- **Fit** — Matches surrounding naming, patterns, and file layout; no drive-by refactors mixed into unrelated changes.
- **Size and focus** — Functions/routes doing one thing; deep nesting or long conditionals worth simplifying.
- **Duplication** — Copy-pasted logic that should be one helper or one source of truth.
- **Observability** — Logs/metrics where failures would be hard to diagnose; no PII in logs unless intentional and documented.
- **Tests** — New behavior covered or explicitly out of scope with reason; tests assert behavior, not implementation trivia.

## Project alignment (Flipabee)

When reviewing app code, cross-check **workspace rules** and **AGENTS.md** (e.g. DB types source of truth, Next.js Image/Link, migration workflow, no `any`, lint-as-errors). Do not treat rule violations as nitpicks if they affect correctness or consistency.

## Reporting

Order findings **critical → important → minor → optional**. Use short evidence (what can go wrong, or which invariant breaks).

| Level | Meaning |
| --- | --- |
| **Critical** | Security hole, data loss/corruption, wrong auth, likely production bug |
| **Important** | Correctness risk, serious race, meaningful perf regression, missing error handling |
| **Minor** | Edge case, small perf, readability, consistency |
| **Optional** | Style preference, micro-optimizations, future hardening |

End with **what is solid** (brief) so the review is balanced.

## Verification (when appropriate)

If the user wants confirmation beyond static review, run **targeted** checks (e.g. affected `bun test` files). Do not run a full production **build** unless the user asked. Respect user rules about migrations, `db:types`, and destructive DB commands.
