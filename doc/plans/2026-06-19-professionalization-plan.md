# Codebase Professionalization Plan

Status: In Progress
Date: 2026-06-19

## Progress Log

- 2026-06-19: Added contributor workflow docs, quality policy docs, coverage evaluation notes, and protocol concept docs with Mermaid diagrams. Existing formatter/lint config files were reviewed; ESLint, Prettier, and Solhint are not installed as top-level dependencies, so lint enforcement remains a follow-up tooling task.
- 2026-06-19: Consolidated GitHub Actions into the `tests` workflow so push, pull request, and manual runs execute compile, focused suites, upgradeability, and the full Hardhat suite. Added GitHub issue templates for contract changes, storage changes, dependency migrations, and no-contract changes. Added `doc/testing/coverage-matrix.md`.
- 2026-06-19: Silenced legacy test-side debug output, gated shared deployment-helper logs during Hardhat tests, added typed procedure fixtures for claim/task focused tests, and added `doc/testing/legacy-test-map.md`.

## Goal
Make the SoulSystem Protocol repository look and operate like a professional, maintainable smart-contract codebase without rushing into risky Solidity API or storage changes.

## User Constraints
- Work on the current selected branch.
- Keep changes modular, clear, and DRY.
- Start with tasks that do not require contract changes.
- If no contracts are changed, the work may be committed.

## Non-Goals
- Do not rename Solidity contracts, public functions, events, or storage variables in the first execution slices.
- Do not remove legacy tests until the focused suite fully replaces their coverage.
- Do not migrate Hardhat, ethers, OpenZeppelin, or TypeChain versions in this plan unless a separate dependency migration task is approved.

## Context
- The repo now has focused unit, integration, upgradeability, script, and CI test coverage.
- `doc/plans/2026-06-19-test-hardening-plan.md` records the completed test-hardening pass.
- `doc/plans/2026-06-19-additional-test-coverage-plan.md` tracks the next testing backlog.
- Current tooling is Hardhat 2, ethers v5, OpenZeppelin Contracts 4.x, and TypeChain.

## Phase 1: No-Contract Repository Hygiene

- [x] Add shared formatting policy.
  - Add or review `.prettierrc`, `.prettierignore`, and Solidity formatting rules.
  - Keep formatting changes in a separate commit from behavior changes.
  - Run formatting only on scoped files first to avoid noisy repository-wide churn.

- [x] Add TypeScript linting policy.
  - Add ESLint config compatible with the current Hardhat/TypeScript stack.
  - Start with tests and scripts.
  - Make lint warnings actionable before enforcing in CI.

- [x] Add Solidity linting policy.
  - Evaluate `solhint` against current Solidity versions.
  - Start as a report-only check.
  - Do not auto-fix contracts in the first pass.

- [x] Tighten CI quality gates.
  - Ensure CI runs compile, smoke, unit, integration, upgradeability, and full test scripts as appropriate.
  - Add formatting and lint checks only after local configs are stable.
  - Keep Node version aligned with `package.json`.

- [x] Clean test output.
  - Remove or silence test-side debug logs where possible.
  - Document contract-side `hardhat/console.sol` cleanup separately because that touches Solidity files.

- [x] Improve TypeScript test helpers.
  - Move repeated game/procedure setup into reusable helpers.
  - Add typed helper return interfaces.
  - Prefer TypeChain-generated types where available.

## Phase 2: No-Contract Documentation Improvements

- [x] Add protocol concept docs.
  - Create docs for Hub, Soul, Game, Claim, Task, RuleRepo, ActionRepo, and VotesRepo.
  - Explain responsibilities, key associations, permissions, and lifecycle stages.
  - Link to focused tests as executable examples.

- [x] Add architecture diagrams.
  - Add Mermaid diagrams for Hub associations, game/procedure creation, and rule/effect flow.
  - Keep diagrams source-controlled as Markdown.

- [x] Add contributor workflow docs.
  - Document local setup.
  - Document test commands.
  - Document upgradeability review requirements.
  - Document when to run full suite versus focused scripts.

- [x] Add issue templates or task templates.
  - Include templates for contract change, upgradeable storage change, test-only change, and dependency migration.
  - Require explicit storage-layout review for contract storage changes.

## Phase 3: Test Suite Professionalization Without Contract Changes

- [x] Continue splitting legacy broad tests.
  - Identify assertions in `test/index.ts`, `test/Game.ts`, and `test/Hub.ts`.
  - Move equivalent coverage into focused files.
  - Retire legacy tests only after one-to-one coverage mapping is documented.

- [x] Add a coverage matrix.
  - Maintain `doc/testing/test-checklist.md` or a new coverage matrix doc.
  - Map contracts and major behaviors to focused test files.
  - Track remaining gaps.

- [ ] Add typed factories and fixture helpers.
  - Use single-source deployment helpers.
  - Avoid duplicated `makeGame`, `makeClaim`, and `makeTask` setup across tests.
  - Keep impersonation helpers centralized.

## Phase 4: Contract-Touching Cleanup Candidates

These require explicit review before implementation because they change Solidity files and may affect deployed APIs, upgradeability, or storage layout.

- [ ] Remove `hardhat/console.sol` imports and contract-side debug logging.
  - Audit all Solidity files.
  - Remove only unused imports first.
  - Run compile and full tests after every small batch.

- [ ] Fix typos in non-public comments first.
  - Safe examples include comments and docs.
  - Do not rename public functions/events like `stageExecusion` without compatibility planning.

- [ ] Align file and contract names.
  - Example: `VotesRepoTrackerIntUp.sol` contains `VotesRepoTrackerUpInt`.
  - Renaming requires import/build review and should be isolated.

- [ ] Reduce magic strings.
  - Start in tests and scripts with constants.
  - Consider Solidity constants only after reviewing bytecode/API implications.

- [ ] Evaluate public typo/API corrections.
  - Examples include `stageExecusion`, `relateToCretor`, and legacy misspellings.
  - Treat public API renames as migrations, not cleanup.

## Phase 5: Dependency and Tooling Modernization

- [ ] Revisit the existing dependency migration plan before upgrading packages.
  - Hardhat 3, ethers v6, OpenZeppelin 5, and OpenZeppelin Upgrades changes should remain a separate migration workstream.
  - Use the expanded test suite as the regression gate.

- [ ] Add storage layout snapshots or review artifacts.
  - Keep OpenZeppelin validation tests.
  - Add a human-readable storage-review template.
  - Consider generated layout snapshots only after the toolchain path is stable.

## Verification
- `npx hardhat compile`
- `npm run test:smoke`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:upgradeability`
- `npm test`
- Formatting/lint commands once added

## Risks
- Repository-wide formatting can obscure behavioral changes; keep formatting-only commits isolated.
- Contract typo fixes may accidentally become API breaks.
- Contract cleanup must account for upgradeability and storage layout.
- Linting older Solidity may need calibrated rules to avoid low-value noise.

## Next Action
No-contract professionalization is complete for the current plan. Remaining implementation items touch contracts or dependency/tooling migration.
