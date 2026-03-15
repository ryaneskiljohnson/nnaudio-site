# fixerrors

This command will be available in chat with /fixerrors

1. Run `bunx tsc --noEmit` and fix all errors until it passes.

2. Run `bun run build` and fix all errors until it passes.

3. As per our user rules, when fixing unused variables and function parameters, come up with a plan to properly remove them and migrate usages. Do NOT simply use an underscore to hide the warning.

4. **Final step — tests:** Run the test suite (`bun run test`). Produce a **report**: summary of pass/fail counts and list which tests failed (and their error messages). If any tests fail, give a **diagnosis**: likely cause and which area of the code or which change might be responsible. Do **not** immediately try to fix failing tests; only report and diagnose.
