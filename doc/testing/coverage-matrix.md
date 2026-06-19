# Coverage Matrix

This matrix maps core protocol behavior to focused tests. It is the current confidence source while `npx hardhat coverage` is blocked by instrumentation compile failure.

## Command Matrix

| Area | Command | Files |
| --- | --- | --- |
| Smoke deployment | `npm run test:smoke` | `test/preliminary.ts` |
| Unit contracts | `npm run test:unit` | `test/unit/*.ts` |
| Integration flows | `npm run test:integration` | `test/integration/*.ts` |
| Upgradeability | `npm run test:upgradeability` | `test/upgradeability/*.ts` |
| Legacy full suite | `npm test` | all Hardhat tests |

## Contract and Behavior Coverage

| Area | Primary coverage | Notes |
| --- | --- | --- |
| Hub associations and factories | `test/unit/Hub.ts`, `test/integration/ProtocolDeployment.ts`, `test/integration/HubMigration.ts` | Covers association writes, game/procedure creation, child migration, and new-hub association scope. |
| Soul identity | `test/unit/Soul.ts`, `test/preliminary.ts` | Covers one-token-per-account, non-transferability, handles, and secondary ownership. |
| Game roles and membership | `test/unit/GameRoles.ts`, `test/integration/VotingPower.ts` | Covers creator roles, join/leave, closed-game join rejection, and role voting power. |
| Claims | `test/integration/ClaimLifecycle.ts`, `test/integration/ClaimHappyPath.ts` | Covers draft/open/decision/closed flow, subject requirements, authorization boundaries, and rule effect execution. |
| Tasks | `test/integration/TaskLifecycle.ts`, `test/integration/TaskEscrow.ts` | Covers open/apply/accept flow, native disbursement, ERC20 disbursement, and cancellation refund. |
| Rules | `test/integration/RuleEffects.ts`, `test/integration/RuleManagement.ts`, `test/helpers/ruleData.ts` | Covers admin creation/update, non-admin rejection, and authority-confirmed effects. |
| Open repository | `test/unit/OpenRepo.ts`, `test/unit/OpenRepoEdges.ts` | Covers address arrays, scalar values, caller scoping, duplicates, removals, and defaults. |
| Action repository | `test/unit/ActionRepo.ts` | Covers hashing, add/read, URI updates, duplicate rejection, unknown GUIDs, and current batch-add boundary. |
| Votes repositories | `test/unit/VotesRepo.ts`, `test/integration/VotingPower.ts` | Covers mint/transfer/burn tracking and game-role voting integration. |
| Extensions | `test/integration/Extensions.ts` | Covers missing selectors, single-extension routing, and multi-extension selector routing. |
| Upgradeable contracts | `test/upgradeability/UUPSValidation.ts`, `test/upgradeability/UUPSAuthorization.ts`, `test/upgradeability/BeaconValidation.ts`, `test/upgradeability/StorageLayout.ts` | Covers upgrade safety gates, authorization, beacon changes, and storage-layout validation. |
| Deployment scripts/helpers | `test/scripts/DeploymentHelpers.ts`, `test/helpers/deployProtocol.ts` | Covers reusable deployment setup and expected deployed associations. |

## Remaining Gaps

- Legacy tests in `test/index.ts`, `test/Game.ts`, and `test/Hub.ts` still contain broad historical behavior that should be mapped before removal. See `doc/testing/legacy-test-map.md`.
- `ActionRepoTrackerUp.actionAddBatch` is documented as a current boundary; contract behavior requires a separate reviewed task before expecting success.
- Contract-side `hardhat/console.sol` cleanup requires Solidity edits and full regression verification.
- Coverage tooling is blocked; see `doc/testing/coverage-evaluation.md`.
