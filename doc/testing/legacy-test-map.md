# Legacy Test Map

This map records which broad legacy tests still exist and where focused coverage now lives. Use it before deleting or rewriting `test/index.ts`, `test/Game.ts`, or `test/Hub.ts`.

## `test/index.ts`

| Legacy area | Focused coverage | Remaining decision |
| --- | --- | --- |
| OpenRepo scalar and address storage | `test/unit/OpenRepo.ts`, `test/unit/OpenRepoEdges.ts` | Focused coverage is sufficient for repository basics. |
| Action repository add/read behavior | `test/unit/ActionRepo.ts` | Focused coverage includes current batch-add boundary. |
| Soul minting, handles, secondary owners, non-transferability | `test/unit/Soul.ts`, `test/preliminary.ts` | Legacy scenarios can be retired after post/as-owned-soul behavior is mapped. |
| Game roles and membership | `test/unit/GameRoles.ts`, `test/integration/VotingPower.ts` | Focused coverage handles core role assignment and voting power. |
| Rule storage, updates, and effects | `test/integration/RuleEffects.ts`, `test/integration/RuleManagement.ts` | Focused coverage handles admin and non-admin paths. |
| Project task flow and escrow | `test/integration/TaskLifecycle.ts`, `test/integration/TaskEscrow.ts` | Legacy delivery-message and late-fund cases need focused mapping before removal. |
| Court claim flow | `test/integration/ClaimLifecycle.ts`, `test/integration/ClaimHappyPath.ts` | Legacy witness/apply/join cases need focused mapping before removal. |
| SafeERC721/SafeERC1155 mocks | none | Add focused mock-token coverage only if mocks remain part of public test support. |

## `test/Game.ts`

| Legacy area | Focused coverage | Remaining decision |
| --- | --- | --- |
| Extension deployment and routing | `test/integration/Extensions.ts` | Focused routing exists; deployment logging is now silent on Hardhat tests. |
| Votes extension membership flow | `test/integration/VotingPower.ts` | Focused voting-power assertions exist. |
| Action extension reputation effect | none | Add focused ActionExt coverage before retiring this file. |

## `test/Hub.ts`

| Legacy area | Focused coverage | Remaining decision |
| --- | --- | --- |
| Owner security | `test/unit/Hub.ts` | Focused association permission tests exist. |
| Moving child contracts to a new hub | `test/integration/HubMigration.ts` | Focused migration coverage exists. |

## Retirement Rule

Delete or skip a legacy block only after one of these is true:

- equivalent focused coverage is listed above;
- a new focused test has been added and passes;
- the behavior is obsolete and a plan doc records why it no longer belongs in the suite.
