# SoulSystem Protocol

Composable architecture for representing society through soulbound identity, groups, roles, rules, procedures, and protocol extensions.

> **Status:** This project is under active development. The SoulSystem Protocol has not been audited, upgradeable storage layouts may still change, and production deployments should be treated as experimental until the migration and audit checklist is complete.

## Overview

A SoulSystem is a set of Solidity primitives built around a soulbound token contract. The protocol models accounts, groups, procedures, and reputation-like effects as composable on-chain entities.

The protocol supports:

- Minting soulbound identity tokens for users, contracts, and protocol entities.
- Creating games that represent groups, DAOs, pods, or other social contexts.
- Assigning contextual roles such as `admin`, `member`, and `authority`.
- Creating claims and tasks as procedure contracts inside games.
- Defining rules and executing effects against soul tokens.
- Recording opinions or reputation-like scores.
- Extending game behavior through optional extension contracts.
- Using repositories for shared protocol storage such as associations, rules, votes, and actions.

## Architecture

The main layers are:

- `HubUpgradable`: factory, registry, association manager, and beacon manager.
- `SoulUpgradable`: soulbound identity token and opinion/reputation store.
- `GameUpgradable`: group context with roles, rules, posts, claims/tasks, and extension routing.
- `ClaimUpgradable` and `TaskUpgradable`: procedure contracts created inside games.
- `OpenRepoUpgradable`: generic repository for owner-scoped addresses, strings, booleans, and uints.
- `RuleRepo`, `ActionRepoTrackerUp`, and vote repositories: specialized protocol data stores.
- `contracts/extensions/*`: optional game behavior modules.

For a fuller architecture explanation, see [doc/PROJECT_OVERVIEW.md](doc/PROJECT_OVERVIEW.md).

## Repository Layout

```text
contracts/              Solidity protocol contracts
contracts/abstract/     Shared protocol base contracts
contracts/extensions/   Optional game extension modules
contracts/interfaces/   Protocol interfaces
contracts/libraries/    Solidity libraries and shared data types
contracts/repositories/ Repository contracts
scripts/                Deployment, upgrade, validation, and utility scripts
test/                   Hardhat tests
utils/                  TypeScript deployment helpers and constants
doc/                    Project documentation and migration plans
```

## Prerequisites

- Node.js and npm.
- A local `.env` file for private keys, RPC URLs, and explorer API keys.

The current dependency stack is still based on Hardhat 2, ethers 5, and OpenZeppelin Contracts 4. Use a stable Node LTS version for day-to-day work. Node 22 can expose native dependency install issues in parts of the older Hardhat/Waffle dependency chain.

## Setup

Install dependencies:

```shell
npm install
```

Copy the environment template and fill in local values:

```shell
copy .env.example .env
```

Required values depend on the command being run. Local tests do not require production private keys.

## Common Commands

Compile contracts:

```shell
npx hardhat compile
```

Run all tests:

```shell
npx hardhat test
```

Run preliminary protocol tests:

```shell
npx hardhat test test/preliminary.ts
```

Check contract sizes:

```shell
npx hardhat size-contracts
```

Generate TypeChain bindings:

```shell
npm run typechain
```

Clean Hardhat output:

```shell
npx hardhat clean
```

## Deployment

Deploy foundation contracts:

```shell
npx hardhat run scripts/foundation.ts --network aurora
```

Deploy protocol contracts:

```shell
npx hardhat run scripts/deploy.ts --network aurora
```

Network configuration is defined in [hardhat.config.ts](hardhat.config.ts). Review RPC URLs, account configuration, and explorer API keys before using any public network.

## Verification

Verify a deployed contract:

```shell
npx hardhat verify --network <network> <DEPLOYED_CONTRACT_ADDRESS> <constructor-args>
```

Example:

```shell
npx hardhat verify --network aurora 0x0000000000000000000000000000000000000000
```

## Testing Notes

Existing tests include broad integration flows in:

- `test/deployment.ts`
- `test/Hub.ts`
- `test/Game.ts`
- `test/index.ts`
- `test/preliminary.ts`

The preliminary suite documents core assumptions around deployment, hub associations, soul token behavior, game creation, and claim/task factory permissions.

## Dependency Migration

Major dependency migrations are tracked in [doc/plans/2026-06-02-dependency-migration-and-test-hardening.md](doc/plans/2026-06-02-dependency-migration-and-test-hardening.md).

Remaining major-version work includes:

- Hardhat 2 to Hardhat 3.
- ethers 5 to ethers 6.
- OpenZeppelin Contracts 4 to 5.
- OpenZeppelin Hardhat Upgrades 1 to 4.
- Replacing deprecated Waffle/Web3/Truffle-related test dependencies.

OpenZeppelin Contracts 5 must be treated as a storage-layout migration, not a routine package update. Do not upgrade deployed proxy implementations across that boundary without explicit storage validation.

## Security Notes

- The protocol is unaudited.
- Upgradeable contracts use UUPS proxies and beacon proxies.
- String-keyed repository associations are flexible but spelling-sensitive.
- Some scripts contain historical network assumptions and should be reviewed before production use.
- `npm audit` currently reports vulnerabilities through legacy Hardhat/Waffle/Web3/Truffle dependency chains. The migration plan documents how to remove those chains safely.

## External Resources

- [Boilerplate/Demo](https://www.soulsystem.app)
- [Architecture Schemas (Miro)](https://miro.com/app/board/uXjVOH541OI=/?share_link_id=612732936883)
