# Quality Policy

This repository should prefer stable conventions over broad formatting churn.

## Formatting

Current formatter configuration:

- `.prettierrc`
- `.prettierignore`
- `prettier-plugin-solidity` dependency

Policy:

- Do not run repository-wide formatting in the same commit as behavioral changes.
- Format only files changed in the current task unless a dedicated formatting pass is approved.
- Keep Solidity formatting changes isolated because they can make contract review harder.

## Linting

Current lint configuration files exist:

- `.eslintrc.js`
- `.eslintignore`
- `.solhint.json`
- `.solhintignore`

Current blocker:

- ESLint and Solhint are not installed as top-level project dependencies, so lint scripts should not be enforced in CI yet.

Recommended next step:

1. Add the missing lint dependencies in a dedicated tooling commit.
2. Run lint in report-only mode.
3. Fix high-signal issues in scoped commits.
4. Add CI enforcement after the baseline is clean enough to avoid noisy failures.

## Solidity Changes

Solidity changes require additional review because this protocol uses upgradeable contracts.

Contract changes should include:

- focused tests for changed behavior;
- negative permission tests for new or changed permission checks;
- `npm run test:upgradeability`;
- storage-layout review if storage is added, removed, renamed, reordered, or inherited differently.

Public API names should not be changed casually. Typos in public functions, events, or storage-facing behavior are compatibility issues, not cosmetic cleanup.

## Test Output

The current legacy suite still prints WIP/debug logs from tests and contract-side `hardhat/console.sol` imports.

Policy:

- Remove test-side logs in no-contract cleanup commits.
- Treat contract-side log cleanup as Solidity work and verify compile plus full tests after each small batch.
