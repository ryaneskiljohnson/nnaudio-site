---
name: fix-errors
description: Fix TypeScript and build errors until tsc and build pass; then run tests and report (do not auto-fix failing tests). Use when the user asks to fix errors, run fixerrors, or fix type/build failures.
---

# Fix errors

Use this workflow when asked to fix errors, run fixerrors, or fix type/build failures.

## Workflow

1. **TypeScript**  
   Run `bunx tsc --noEmit` and fix all errors until it passes.

2. **Build**  
   Run `bun run build` and fix all errors until it passes.

3. **Unused variables and parameters**  
   As per user rules, when fixing unused variables and function parameters, come up with a plan to properly remove them and migrate usages. Do **not** simply use an underscore to hide the warning.

4. **Final step — tests**  
   Run the test suite (`bun run test`). Produce a **report**: summary of pass/fail counts and list which tests failed (and their error messages). If any tests fail, give a **diagnosis**: likely cause and which area of the code or which change might be responsible. Do **not** immediately try to fix failing tests; only report and diagnose.
