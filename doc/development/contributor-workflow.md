# Contributor Workflow

This workflow keeps contract, test, and documentation changes reviewable while the protocol is still evolving.

## Local Setup

Install dependencies:

```shell
npm install
```

Compile contracts:

```shell
npx hardhat compile
```

Run the default full suite:

```shell
npm test
```

## Test Commands

Use the narrowest command that covers the files you changed.

| Change type | Minimum command |
| --- | --- |
| Deployment helpers or smoke behavior | `npm run test:smoke` |
| Unit-level repository, hub, soul, game, or votes behavior | `npm run test:unit` |
| Claim, task, rule, extension, migration, or end-to-end flows | `npm run test:integration` |
| Upgradeable contracts or beacon behavior | `npm run test:upgradeability` |
| Release or broad refactor | `npm test` |

Before merging contract or dependency changes, run:

```shell
npx hardhat compile
npm run test:smoke
npm run test:unit
npm run test:integration
npm run test:upgradeability
npm test
```

## Commit Guidance

- Keep formatting-only changes separate from behavior changes.
- Keep Solidity contract changes separate from test-only or docs-only work.
- If a test exposes a contract bug, commit the failing or boundary-documenting test separately when practical.
- Do not commit generated Hardhat artifacts, coverage output, or `.openzeppelin` local-network manifest churn unless the task explicitly requires it.

## Pull Request Checklist

- Scope is limited and described clearly.
- Relevant tests pass locally.
- Upgradeable storage changes include a storage-layout review.
- New permissioned behavior has negative tests.
- New factory or repository behavior has event and storage assertions where applicable.
- Public API or typo changes in Solidity are called out as compatibility risks.

## CI

GitHub Actions runs on every pushed commit and pull request. The workflow installs dependencies with `npm ci`, compiles contracts, then runs smoke, unit, integration, upgradeability, and full Hardhat suites.
