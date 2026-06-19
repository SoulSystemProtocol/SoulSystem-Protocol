# Coverage Evaluation

Date: 2026-06-19

Command:

```shell
npx hardhat coverage
```

Result: blocked.

The current dependency stack starts Solidity instrumentation with `solidity-coverage@0.8.17`, but instrumented compilation fails before tests run:

```text
CompilerError: Stack too deep when compiling inline assembly: Variable headStart is 1 slot(s) too deep inside the stack.
Error in plugin solidity-coverage: HardhatError: HH600: Compilation failed
```

## Interpretation

This is a coverage-tooling blocker, not a failing protocol behavior test. The normal compile and Hardhat test commands still pass.

## Current Recommendation

Do not add `hardhat coverage` to CI yet.

Revisit coverage after one of these happens:

- the Hardhat/Solidity/coverage dependency stack is upgraded;
- the contracts that trigger instrumented stack pressure are identified and can be tested with scoped coverage;
- a coverage config excludes interfaces, mocks, or problematic files without hiding meaningful protocol behavior.

## Follow-Up

- Keep the focused unit and integration test matrix as the primary confidence signal for now.
- Re-run `npx hardhat coverage` during the dependency migration workstream.
- If coverage remains blocked after tooling upgrades, isolate the failing instrumented file with a minimal coverage target.
