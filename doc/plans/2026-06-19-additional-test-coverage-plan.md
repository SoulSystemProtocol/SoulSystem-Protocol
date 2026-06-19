# Additional Test Coverage Plan

Status: Planned
Date: 2026-06-19

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

- [ ] Add `test/unit/ActionRepo.ts`.
  - Cover action hash determinism.
  - Cover `actionAdd`, `actionGet`, `actionGetStr`, `actionSetURI`, and `actionGetURI`.
  - Cover duplicate action rejection with `Action Already Exists`.
  - Cover bad GUID reads.
  - Add a targeted test for `actionAddBatch`; if it fails because of array initialization, document the failure and create a contract-fix task instead of changing Solidity in this phase.

- [ ] Add focused OpenRepo edge tests.
  - Extend `test/unit/OpenRepo.ts` or create `test/unit/OpenRepoEdges.ts`.
  - Cover duplicate address additions.
  - Cover removing a missing value.
  - Cover `addressGetAllOf` ordering and caller scope.
  - Cover string/bool/uint overwrite behavior.

- [ ] Add rule update permission tests.
  - Extend `test/integration/RuleEffects.ts` or create `test/integration/RuleManagement.ts`.
  - Cover non-admin rejection for `ruleUpdateURI`, `ruleUpdateEffects`, `ruleUpdateConditions`, `ruleUpdateConfirmation`, and `ruleDisable`.
  - Cover admin success paths and stored-value assertions.

- [ ] Add UUPS upgrade authorization tests.
  - Create `test/upgradeability/UUPSAuthorization.ts`.
  - Deploy representative UUPS proxies.
  - Assert non-owner upgrade attempts revert.
  - Assert owner upgrade path is at least permissioned correctly; avoid introducing mock V2 contracts unless needed.

- [ ] Add multiple-extension routing tests.
  - Extend `test/integration/Extensions.ts`.
  - Register multiple extensions under one game type.
  - Verify the expected extension handles the selector.
  - Verify missing selector behavior remains clear.

## Phase 2: No-Contract Lifecycle Coverage

- [ ] Add claim happy-path lifecycle tests.
  - Create `test/integration/ClaimHappyPath.ts`.
  - Assign subject and authority roles.
  - Add a rule reference.
  - File claim, move to decision, submit verdict, assert closed stage.
  - Assert confirmed rule effects apply to the subject.

- [ ] Add focused task payout/refund tests.
  - Create `test/integration/TaskEscrow.ts`.
  - Cover ETH funding and winner disbursement.
  - Cover ERC20 funding and winner disbursement.
  - Cover cancellation refund to creator.
  - Cover late-fund behavior currently represented in legacy tests.

- [ ] Add Hub migration integration tests.
  - Create `test/integration/HubMigration.ts`.
  - Extend existing `test/Hub.ts` behavior with focused assertions.
  - Verify child contracts update hub references.
  - Verify new hub associations resolve.
  - Verify old hub calls are not accidentally trusted where the current protocol expects new hub authority.

## Phase 3: Reproducibility and CI Confidence

- [ ] Run fresh install verification.
  - Run `npm ci`.
  - Run `npx hardhat compile`.
  - Run `npm run test:smoke`, `npm run test:unit`, `npm run test:integration`, and `npm run test:upgradeability`.
  - Record any lockfile or install drift in this document.

- [ ] Add coverage command only if the current dependency stack supports it cleanly.
  - Test `npx hardhat coverage`.
  - If it fails due to old Hardhat/plugin constraints, document the blocker instead of forcing a toolchain change.

## Phase 4: Contract-Change Candidates Only After Tests Prove Need

- [ ] Investigate `ActionRepoTrackerUp.actionAddBatch`.
  - Only change Solidity if the focused test proves the current implementation is broken.
  - If changed, add a migration note because this is an upgradeable contract.

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
Start with `test/unit/ActionRepo.ts` and OpenRepo edge coverage because both are high-value and should not require contract changes.
