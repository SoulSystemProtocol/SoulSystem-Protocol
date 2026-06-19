# Additional Test Coverage Plan

Status: In Progress
Date: 2026-06-19

## Progress Log

- 2026-06-19: Completed Phase 1 no-contract test additions for ActionRepo, OpenRepo edges, rule management, UUPS authorization, and multiple-extension routing. Updated package test scripts to include the new files.
- Verification: `npx hardhat compile` passed; `npm run test:unit` passed with 27 tests; `npm run test:integration` passed with 16 tests; `npm run test:upgradeability` passed with 19 tests; `npm test` passed on rerun with 168 tests.
- Note: The first full `npm test` run hit a legacy broad-suite failure in `test/index.ts` under `Protocol > Project Game Flow > Court Game Flow > Game Authoritys Can Assign Themselves to Claim`; the immediate rerun passed without code changes. Treat that legacy block as a candidate for stabilization when splitting broad tests.
- 2026-06-19: Completed Phase 2 no-contract lifecycle coverage for claim happy path, task escrow, and Hub migration integration. Fixed the legacy broad-suite authority-assignment race by awaiting the parent-game role assignment before assigning claim authority.
- Verification: `npx hardhat compile` passed; `npm run test:integration` passed with 22 tests; `npm test` passed with 174 tests.
- 2026-06-19: Evaluated `npx hardhat coverage`. Coverage instrumentation starts with `solidity-coverage@0.8.17`, but the instrumented compile fails with `CompilerError: Stack too deep when compiling inline assembly: Variable headStart is 1 slot(s) too deep inside the stack`. The blocker is documented in `doc/testing/coverage-evaluation.md`; coverage should not be added to CI until the dependency/tooling migration workstream revisits it.
- 2026-06-19: Ran fresh install verification. `npm ci` is blocked locally by a Windows native optional dependency build failure in `bufferutil` through `node-gyp-build`; details are documented in `doc/development/reproducibility.md`. Dependencies were restored with `npm install --ignore-scripts` for local verification only.
- Verification after recovery: `npx hardhat compile` passed; `npm run test:smoke` passed with 5 tests; `npm run test:unit` passed with 27 tests; `npm run test:integration` passed with 22 tests; `npm run test:upgradeability` passed with 19 tests.

## Goal
Expand the focused Hardhat test suite beyond the completed test-hardening pass, prioritizing coverage that improves confidence without requiring Solidity contract changes.

## User Constraints
- Work on the current selected branch.
- Keep changes modular, clear, and DRY.
- Start with tasks that do not require contract changes.
- If no contracts are changed, the work may be committed.

## Non-Goals
- Do not change Solidity contracts as part of the first execution slices.
- Do not rename public contract APIs or storage variables in this plan.
- Do not remove legacy broad tests until equivalent focused coverage has been proven.

## Context
- Core test structure now exists under `test/unit`, `test/integration`, `test/upgradeability`, and `test/scripts`.
- Current package scripts are explicit-file-list based for PowerShell compatibility.
- Full suite passed after the previous hardening work: `npm test` reported 152 passing.
- Any test exposing a production bug should create a follow-up task before changing contracts.

## Phase 1: No-Contract Test Additions

- [x] Add `test/unit/ActionRepo.ts`.
  - Cover action hash determinism.
  - Cover `actionAdd`, `actionGet`, `actionGetStr`, `actionSetURI`, and `actionGetURI`.
  - Cover duplicate action rejection with `Action Already Exists`.
  - Cover bad GUID reads.
  - Add a targeted test for `actionAddBatch`; if it fails because of array initialization, document the failure and create a contract-fix task instead of changing Solidity in this phase.

- [x] Add focused OpenRepo edge tests.
  - Extend `test/unit/OpenRepo.ts` or create `test/unit/OpenRepoEdges.ts`.
  - Cover duplicate address additions.
  - Cover removing a missing value.
  - Cover `addressGetAllOf` ordering and caller scope.
  - Cover string/bool/uint overwrite behavior.

- [x] Add rule update permission tests.
  - Extend `test/integration/RuleEffects.ts` or create `test/integration/RuleManagement.ts`.
  - Cover non-admin rejection for `ruleUpdateURI`, `ruleUpdateEffects`, `ruleUpdateConditions`, `ruleUpdateConfirmation`, and `ruleDisable`.
  - Cover admin success paths and stored-value assertions.

- [x] Add UUPS upgrade authorization tests.
  - Create `test/upgradeability/UUPSAuthorization.ts`.
  - Deploy representative UUPS proxies.
  - Assert non-owner upgrade attempts revert.
  - Assert owner upgrade path is at least permissioned correctly; avoid introducing mock V2 contracts unless needed.

- [x] Add multiple-extension routing tests.
  - Extend `test/integration/Extensions.ts`.
  - Register multiple extensions under one game type.
  - Verify the expected extension handles the selector.
  - Verify missing selector behavior remains clear.

## Phase 2: No-Contract Lifecycle Coverage

- [x] Add claim happy-path lifecycle tests.
  - Create `test/integration/ClaimHappyPath.ts`.
  - Assign subject and authority roles.
  - Add a rule reference.
  - File claim, move to decision, submit verdict, assert closed stage.
  - Assert confirmed rule effects apply to the subject.

- [x] Add focused task payout/refund tests.
  - Create `test/integration/TaskEscrow.ts`.
  - Cover ETH funding and winner disbursement.
  - Cover ERC20 funding and winner disbursement.
  - Cover cancellation refund to creator.
  - Cover late-fund behavior currently represented in legacy tests.

- [x] Add Hub migration integration tests.
  - Create `test/integration/HubMigration.ts`.
  - Extend existing `test/Hub.ts` behavior with focused assertions.
  - Verify child contracts update hub references.
  - Verify new hub associations resolve.
  - Verify old hub calls are not accidentally trusted where the current protocol expects new hub authority.

## Phase 3: Reproducibility and CI Confidence

- [x] Run fresh install verification.
  - Run `npm ci`.
  - Run `npx hardhat compile`.
  - Run `npm run test:smoke`, `npm run test:unit`, `npm run test:integration`, and `npm run test:upgradeability`.
  - Record any lockfile or install drift in this document.

- [x] Add coverage command only if the current dependency stack supports it cleanly.
  - Test `npx hardhat coverage`.
  - If it fails due to old Hardhat/plugin constraints, document the blocker instead of forcing a toolchain change.

## Phase 4: Contract-Change Candidates Only After Tests Prove Need

- [ ] Investigate `ActionRepoTrackerUp.actionAddBatch`.
  - Only change Solidity if the focused test proves the current implementation is broken.
  - If changed, add a migration note because this is an upgradeable contract.
  - Current no-contract coverage documents that `actionAddBatch` reverts; a contract-fix task is still required before expecting batch add success.

- [ ] Decide whether `GameUpgradable.join()` should auto-mint Soul tokens.
  - Current focused tests document that callers must already own a Soul token.
  - Changing this behavior requires product decision and contract review.

## Verification
- `npx hardhat compile`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:upgradeability`
- `npm test`

## Risks
- Some legacy tests already cover broad behavior, so new tests may expose duplicated or inconsistent expectations.
- Some proposed tests may reveal contract bugs; those fixes should be separate commits with explicit contract-review notes.
- Upgradeability tests must not create false confidence; storage layout review is still required for Solidity storage changes.

## Next Action
Phase 3 is complete for no-contract work. Remaining items are contract-change candidates that need explicit contract-review approval.
