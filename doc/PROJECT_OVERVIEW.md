# SoulSystem Protocol Project Overview

This repository contains Solidity contracts, deployment scripts, and Hardhat tests for the SoulSystem Protocol. The protocol models social organizations as composable on-chain primitives built around soulbound identity tokens.

## What the Protocol Provides

- Soulbound profiles for accounts, contracts, and protocol entities.
- Games, which represent groups, organizations, DAOs, pods, or other social contexts.
- Roles inside games, such as `admin`, `member`, and `authority`.
- Claims and tasks as procedure contracts created inside a game.
- Rule and effect execution, including reputation or opinion changes recorded against soul tokens.
- Repository contracts for shared address, string, boolean, uint, rule, vote, and action storage.
- Extension contracts that can add specialized behavior to game instances through proxy fallback routing.

## Main Contract Layers

### Hub

`contracts/HubUpgradable.sol` is the protocol factory and registry.

Responsibilities:

- Stores the protocol-wide `OpenRepoUpgradable` repository address.
- Owns upgradeable beacons for child contract implementations.
- Creates new `GameUpgradable`, `ClaimUpgradable`, and `TaskUpgradable` beacon proxies.
- Tracks active games.
- Maintains named associations such as `SBT`, `action`, `RULE_REPO`, and `VOTES_REPO`.
- Mints or requests soul tokens for newly created protocol entities.
- Moves known children to a replacement hub through `hubChange`.

### Soul

`contracts/SoulUpgradable.sol` is the soulbound identity token contract.

Responsibilities:

- Mints one primary soulbound ERC721-style token per account.
- Allows the hub or owner to mint tokens for other accounts or contracts.
- Prevents normal user-driven token transfers.
- Tracks secondary account ownership for a token.
- Stores token URIs, handles, soul types, and token relationships.
- Records opinions or reputation-like scores about other tokens.

### Game

`contracts/GameUpgradable.sol` represents a social context or organization.

Responsibilities:

- Initializes default roles: `admin`, `member`, and `authority`.
- Lets users join and leave the `member` role.
- Stores the game type and role configuration through the shared repository.
- Creates and routes claims or tasks through the hub.
- Reads rules from `RuleRepo`.
- Executes rule effects against soul tokens.
- Tracks voting power for member role transfers when a votes repository is configured.
- Delegates extension calls through `ProxyMulti` based on the configured game type.

### Procedures

`contracts/abstract/Procedure.sol` is the base lifecycle for claim-like entities.

`contracts/ClaimUpgradable.sol` extends it for claims.

`contracts/TaskUpgradable.sol` extends it for tasks and escrow/disbursement flows.

Shared procedure concepts:

- Stages such as draft, open, decision, execution, closed, and cancelled.
- Parent container game.
- Default roles: `admin`, `creator`, `subject`, and `authority`.
- Role assignment and posting by token.

### Repositories

Repositories hold protocol data outside the business contracts.

Important examples:

- `contracts/repositories/OpenRepoUpgradable.sol`: generic owner-scoped storage for addresses, strings, booleans, and uints.
- `contracts/repositories/RuleRepo.sol`: stores rules, conditions, confirmations, and effects.
- `contracts/ActionRepoTrackerUp.sol`: stores action definitions.
- `contracts/repositories/VotesRepoTrackerUp.sol`: tracks voting units for soul tokens.

Most contracts access repositories through `ContractBase` and the hub association map.

### Extensions

Extension contracts in `contracts/extensions/` add optional game behavior.

Examples:

- `ActionExt`
- `CourtExt`
- `FundManExt`
- `MicroDAOExt`
- `ProjectExt`
- `RuleExt`
- `VotesExt`

Games resolve extensions through repository keys such as `GAME_MDAO` or `GAME_PROJECT`.

## Typical Local Deployment Flow

1. Deploy `OpenRepoUpgradable`.
2. Deploy `HubUpgradable`, initialized with the repo and implementation addresses for games, claims, and tasks.
3. Deploy `SoulUpgradable` and register it on the hub as `SBT`.
4. Deploy supporting repositories such as action, rule, and votes repositories.
5. Register supporting contracts on the hub with `assocSet` or `assocAdd`.
6. Create games through `hub.makeGame(type, name, uri)`.
7. Create claims and tasks from an active game through the hub.

## Common Commands

Install dependencies:

```shell
npm install
```

Compile contracts:

```shell
npx hardhat compile
```

Run tests:

```shell
npx hardhat test
```

Run the preliminary documentation tests:

```shell
npx hardhat test test/preliminary.ts
```

Deploy foundation contracts:

```shell
npx hardhat run scripts/foundation.ts --network aurora
```

Deploy protocol contracts:

```shell
npx hardhat run scripts/deploy.ts --network aurora
```

## Testing Notes

The existing test suite contains broad integration flows in `test/index.ts`, `test/Game.ts`, `test/Hub.ts`, and `test/deployment.ts`.

The preliminary suite in `test/preliminary.ts` is intended to be a readable starting point. It documents baseline assumptions about deployment, hub associations, soulbound token behavior, game creation, and factory permissions.

## Design Caveats

- The contracts are upgradeable and use both UUPS proxies and beacon proxies.
- The protocol relies heavily on string keys in `OpenRepoUpgradable`; spelling and naming conventions matter.
- Some deployment helpers and scripts contain network-specific values and older comments.
- The README states that the protocol is still under development and unaudited.
- Several files contain TODOs or WIP comments, especially around governance, permissions, and procedure flows.
