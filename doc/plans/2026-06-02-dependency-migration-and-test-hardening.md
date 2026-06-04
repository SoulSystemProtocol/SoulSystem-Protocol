# Dependency Migration and Test Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate SoulSystem Protocol from the current Hardhat 2 / ethers 5 / OpenZeppelin 4 stack toward the latest supported major versions while expanding tests enough to catch upgradeability, protocol-flow, and dependency-migration regressions.

**Architecture:** Execute the work in risk-bounded phases. First stabilize the existing Hardhat 2 stack and test suite, then migrate test helpers and contract compatibility, then move the toolchain to Hardhat 3 / ethers 6, and only then evaluate OpenZeppelin Contracts 5 storage compatibility. Upgradeable contract storage safety is treated as a release gate rather than a best-effort cleanup.

**Tech Stack:** Solidity 0.8.x, Hardhat, OpenZeppelin Contracts Upgradeable, OpenZeppelin Hardhat Upgrades, ethers, TypeScript, Mocha/Chai, TypeChain, npm.

---

## Current Baseline

The project currently has these package states after the non-major update pass:

- `hardhat`: `2.28.6`, latest `3.7.0`
- `ethers`: `5.8.0`, latest `6.16.0`
- `@openzeppelin/contracts`: `4.9.6`, latest `5.6.1`
- `@openzeppelin/contracts-upgradeable`: `4.9.6`, latest `5.6.1`
- `@openzeppelin/hardhat-upgrades`: `1.28.0`, latest `4.0.0`
- `@typechain/ethers-v5`: `10.2.1`, latest `11.1.2`
- `@typechain/hardhat`: `6.1.6`, latest `9.1.0`
- `chai`: `4.5.0`, latest `6.2.2`
- `dotenv`: `16.6.1`, latest `17.4.2`
- `hardhat-gas-reporter`: `1.0.10`, latest `2.3.0`
- `prettier-plugin-solidity`: `1.4.3`, latest `2.3.1`

The package update also exposed two compatibility fixes that should be preserved:

- `contracts/SoulUpgradable.sol` needs explicit ERC721 override targets and an explicit Ownable initializer call.
- `tsconfig.json` needs `"rootDir": "."` for the newer TypeScript compiler.

## Source References

- Hardhat 3 docs: `https://hardhat.org/docs/getting-started`
- Hardhat ethers plugin docs: `https://hardhat.org/docs/plugins/hardhat-ethers`
- ethers v6 migration guide: `https://docs.ethers.org/v6/migrating/`
- OpenZeppelin Contracts 5 changelog: `https://docs.openzeppelin.com/contracts/5.x/changelog`
- OpenZeppelin Hardhat Upgrades docs: `https://docs.openzeppelin.com/upgrades-plugins/hardhat-upgrades`

## Migration Strategy

Use this sequence:

1. Stabilize the current Hardhat 2 stack and clean package metadata.
2. Expand tests on the current stack until core protocol flows are documented by executable tests.
3. Remove or replace legacy dependencies that keep audit findings alive.
4. Migrate to ethers 6-compatible test and helper code.
5. Migrate Hardhat 2 plugins/config to Hardhat 3-compatible equivalents.
6. Evaluate OpenZeppelin 5 as a separate storage-layout migration with explicit go/no-go criteria.

Do not combine OpenZeppelin 5 with the Hardhat 3 migration commit. Storage-layout and initializer validation failures must be reviewed independently.

---

## File Structure

**Modify:**

- `package.json`: dependency versions, scripts, and deprecated package removals.
- `package-lock.json`: generated npm lockfile.
- `hardhat.config.ts`: plugin imports, config shape, network values, and verification config.
- `tsconfig.json`: TypeScript settings required by upgraded tooling.
- `utils/deployment.ts`: ethers 6 deployment helpers and OpenZeppelin upgrades API usage.
- `test/preliminary.ts`: keep as smoke coverage and migrate to ethers 6 if needed.
- `test/deployment.ts`: convert smoke tests into assertion-heavy tests.
- `test/Hub.ts`: expand hub permissions and association tests.
- `test/Game.ts`: stabilize extension tests and remove race-prone setup.
- `contracts/SoulUpgradable.sol`: keep compatibility fixes and later review OpenZeppelin 5 impacts.
- `contracts/**/*.sol`: only modify when a package migration requires explicit compiler/import/override changes.

**Create:**

- `test/helpers/deployProtocol.ts`: shared fixture for core protocol deployment.
- `test/helpers/assertions.ts`: small assertion helpers for addresses, soul IDs, and events.
- `test/Soul.ts`: focused tests for SBT identity behavior.
- `test/OpenRepo.ts`: focused tests for repository get/set/add/remove semantics.
- `test/ClaimTask.ts`: focused procedure factory and lifecycle tests.
- `test/upgradeability.ts`: validates UUPS/beacon upgrade assumptions and storage layout checks.
- `doc/migrations/dependency-migration-notes.md`: records package decisions and migration blockers.
- `doc/migrations/openzeppelin-5-storage-review.md`: records storage layout findings before any OpenZeppelin 5 upgrade.

---

## Task 1: Preserve Baseline and Clean Working Tree

**Files:**
- Modify: none
- Test: existing repo state

- [ ] **Step 1: Record current working tree**

Run:

```shell
git -c safe.directory=C:/GitHubs/SoulSystem-Protocol status --short --untracked-files=all
```

Expected: output lists the current local changes. Keep unrelated changes such as `scripts/_command.ts` out of migration commits.

- [ ] **Step 2: Run current smoke test**

Run:

```shell
npx hardhat test test\preliminary.ts
```

Expected: `5 passing`. If `.openzeppelin/unknown-31337.json` is deleted by the updated OpenZeppelin plugin, restore it after the run:

```shell
git -c safe.directory=C:/GitHubs/SoulSystem-Protocol restore -- .openzeppelin/unknown-31337.json
```

- [ ] **Step 3: Capture outdated package table**

Run:

```shell
npm outdated
```

Expected: `Wanted` equals `Current` for the non-major updates; remaining entries have a newer `Latest` major version.

- [ ] **Step 4: Commit only already-completed package compatibility changes**

Stage:

```shell
git add package-lock.json contracts/SoulUpgradable.sol tsconfig.json
git commit -m "chore: update dependency lockfile and compatibility fixes"
```

Expected: commit excludes `scripts/_command.ts`, generated OpenZeppelin manifest churn, and unrelated docs/tests unless those were intentionally added in a separate commit.

---

## Task 2: Add Shared Test Fixtures Before More Migration

**Files:**
- Create: `test/helpers/deployProtocol.ts`
- Create: `test/helpers/assertions.ts`
- Modify: `test/preliminary.ts`
- Test: `test/preliminary.ts`

- [ ] **Step 1: Write failing fixture import test**

Add this import and usage to `test/preliminary.ts`:

```typescript
import { deployCoreProtocol } from "./helpers/deployProtocol";
```

Replace the `beforeEach` deployment body with:

```typescript
beforeEach(async function () {
  [owner, member, outsider] = await ethers.getSigners();
  ownerAddress = await owner.getAddress();
  memberAddress = await member.getAddress();

  const deployed = await deployCoreProtocol();
  dataRepo = deployed.dataRepo;
  hub = deployed.hub;
  soul = deployed.soul;
});
```

Run:

```shell
npx hardhat test test\preliminary.ts
```

Expected: fail with `Cannot find module './helpers/deployProtocol'`.

- [ ] **Step 2: Create deployment fixture**

Create `test/helpers/deployProtocol.ts`:

```typescript
import { Contract } from "ethers";
import { deployHub, deployUUPS } from "../../utils/deployment";

export interface CoreProtocolDeployment {
  dataRepo: Contract;
  hub: Contract;
  soul: Contract;
}

export async function deployCoreProtocol(): Promise<CoreProtocolDeployment> {
  const dataRepo = await deployUUPS("OpenRepoUpgradable", []);
  const hub = await deployHub(dataRepo.address);
  const soul = await deployUUPS("SoulUpgradable", [hub.address]);

  await hub.assocSet("SBT", soul.address);

  return { dataRepo, hub, soul };
}
```

- [ ] **Step 3: Create assertion helpers**

Create `test/helpers/assertions.ts`:

```typescript
import { expect } from "chai";
import { BigNumberish } from "ethers";

export function expectNonZeroSoulId(tokenId: BigNumberish): void {
  expect(tokenId).to.not.equal(0);
}

export function expectAddress(value: string): void {
  expect(value).to.match(/^0x[a-fA-F0-9]{40}$/);
  expect(value).to.not.equal("0x0000000000000000000000000000000000000000");
}
```

- [ ] **Step 4: Verify fixture migration passes**

Run:

```shell
npx hardhat test test\preliminary.ts
```

Expected: `5 passing`.

- [ ] **Step 5: Commit**

```shell
git add test/preliminary.ts test/helpers/deployProtocol.ts test/helpers/assertions.ts
git commit -m "test: add shared core protocol fixture"
```

---

## Task 3: Add Focused Soul Tests

**Files:**
- Create: `test/Soul.ts`
- Test: `test/Soul.ts`

- [ ] **Step 1: Write failing tests for handle and secondary owner behavior**

Create `test/Soul.ts`:

```typescript
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { deployCoreProtocol } from "./helpers/deployProtocol";
import { test_uri, test_uri2 } from "../utils/consts";

describe("SoulUpgradable", function () {
  let owner: Signer;
  let alice: Signer;
  let secondary: Signer;
  let aliceAddress: string;
  let secondaryAddress: string;
  let soul: any;

  beforeEach(async function () {
    [owner, alice, secondary] = await ethers.getSigners();
    aliceAddress = await alice.getAddress();
    secondaryAddress = await secondary.getAddress();
    ({ soul } = await deployCoreProtocol());
  });

  it("lets a token controller set a unique handle", async function () {
    const tokenId = await soul.connect(alice).callStatic.mint(test_uri);
    await soul.connect(alice).mint(test_uri);

    await soul.connect(alice).handleSet(tokenId, "alice");

    expect(await soul.handleGet(tokenId)).to.equal("alice");
    expect(await soul.handleFind("alice")).to.equal(tokenId);
  });

  it("rejects duplicate handles", async function () {
    const tokenId = await soul.connect(alice).callStatic.mint(test_uri);
    await soul.connect(alice).mint(test_uri);
    await soul.connect(alice).handleSet(tokenId, "alice");

    await soul.connect(secondary).mint(test_uri2);
    const secondTokenId = await soul.tokenByAddress(secondaryAddress);

    await expect(soul.connect(secondary).handleSet(secondTokenId, "alice")).to.be.revertedWith(
      "HANDLE_TAKEN"
    );
  });

  it("lets a controller add a secondary owner for an existing soul", async function () {
    const tokenId = await soul.connect(alice).callStatic.mint(test_uri);
    await soul.connect(alice).mint(test_uri);

    await soul.connect(alice).addSecondaryOwner(secondaryAddress, tokenId);

    expect(await soul.tokenByAddress(secondaryAddress)).to.equal(tokenId);
    expect(await soul.balanceOf(secondaryAddress)).to.equal(1);
  });
});
```

Run:

```shell
npx hardhat test test\Soul.ts
```

Expected: pass if current behavior is already implemented. If any assertion fails, preserve the failing output and treat it as a behavior decision before changing contracts.

- [ ] **Step 2: Commit**

```shell
git add test/Soul.ts
git commit -m "test: cover soul handles and secondary owners"
```

---

## Task 4: Add OpenRepo Tests

**Files:**
- Create: `test/OpenRepo.ts`
- Test: `test/OpenRepo.ts`

- [ ] **Step 1: Write repository behavior tests**

Create `test/OpenRepo.ts`:

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployUUPS } from "../utils/deployment";

describe("OpenRepoUpgradable", function () {
  it("sets, adds, returns, and removes address values by caller scope", async function () {
    const [owner, other] = await ethers.getSigners();
    const repo = await deployUUPS("OpenRepoUpgradable", []);
    const ownerAddress = await owner.getAddress();
    const otherAddress = await other.getAddress();

    await repo.addressSet("SBT", ownerAddress);
    await repo.addressAdd("SBT", otherAddress);

    expect(await repo.addressGet("SBT")).to.equal(ownerAddress);
    expect(await repo.addressGetIndex("SBT", 1)).to.equal(otherAddress);
    expect(await repo.addressHas("SBT", otherAddress)).to.equal(true);

    await repo.addressRemove("SBT", ownerAddress);

    expect(await repo.addressGet("SBT")).to.equal(otherAddress);
    expect(await repo.addressHas("SBT", ownerAddress)).to.equal(false);
  });

  it("keeps string, bool, and uint values scoped to the calling contract or account", async function () {
    const [owner, other] = await ethers.getSigners();
    const repo = await deployUUPS("OpenRepoUpgradable", []);

    await repo.stringSet("type", "MDAO");
    await repo.boolSet("isClosed", true);
    await repo.uintSet("score", 7);

    expect(await repo.stringGet("type")).to.equal("MDAO");
    expect(await repo.boolGet("isClosed")).to.equal(true);
    expect(await repo.uintGet("score")).to.equal(7);

    expect(await repo.connect(other).stringGet("type")).to.equal("");
    expect(await repo.connect(other).boolGet("isClosed")).to.equal(false);
    expect(await repo.connect(other).uintGet("score")).to.equal(0);
  });
});
```

Run:

```shell
npx hardhat test test\OpenRepo.ts
```

Expected: tests pass or expose current repository semantics that need explicit documentation.

- [ ] **Step 2: Commit**

```shell
git add test/OpenRepo.ts
git commit -m "test: cover open repository primitives"
```

---

## Task 5: Add Claim and Task Flow Tests

**Files:**
- Create: `test/ClaimTask.ts`
- Modify: `test/helpers/deployProtocol.ts`
- Test: `test/ClaimTask.ts`

- [ ] **Step 1: Extend fixture with optional rule/action/votes repositories**

Modify `test/helpers/deployProtocol.ts`:

```typescript
import { Contract } from "ethers";
import { deployContract, deployHub, deployUUPS } from "../../utils/deployment";

export interface CoreProtocolDeployment {
  dataRepo: Contract;
  hub: Contract;
  soul: Contract;
}

export interface FullProtocolDeployment extends CoreProtocolDeployment {
  ruleRepo: Contract;
  actionRepo: Contract;
  votesRepo: Contract;
}

export async function deployCoreProtocol(): Promise<CoreProtocolDeployment> {
  const dataRepo = await deployUUPS("OpenRepoUpgradable", []);
  const hub = await deployHub(dataRepo.address);
  const soul = await deployUUPS("SoulUpgradable", [hub.address]);

  await hub.assocSet("SBT", soul.address);

  return { dataRepo, hub, soul };
}

export async function deployFullProtocol(): Promise<FullProtocolDeployment> {
  const core = await deployCoreProtocol();
  const ruleRepo = await deployContract("RuleRepo", []);
  const actionRepo = await deployUUPS("ActionRepoTrackerUp", [core.hub.address]);
  const votesRepo = await deployUUPS("VotesRepoTrackerUp", [core.hub.address]);

  await core.hub.assocSet("RULE_REPO", ruleRepo.address);
  await core.hub.assocSet("action", actionRepo.address);
  await core.hub.assocSet("VOTES_REPO", votesRepo.address);

  return { ...core, ruleRepo, actionRepo, votesRepo };
}
```

- [ ] **Step 2: Write procedure factory tests**

Create `test/ClaimTask.ts`:

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFullProtocol } from "./helpers/deployProtocol";
import { test_uri } from "../utils/consts";

describe("Claim and Task procedures", function () {
  it("creates claim and task children with parent game context", async function () {
    const { hub } = await deployFullProtocol();
    const gameAddress = await hub.callStatic.makeGame("PROJECT", "Project Room", test_uri);
    await hub.makeGame("PROJECT", "Project Room", test_uri);

    await ethers.provider.send("hardhat_impersonateAccount", [gameAddress]);
    await ethers.provider.send("hardhat_setBalance", [
      gameAddress,
      ethers.utils.hexValue(ethers.utils.parseEther("1")),
    ]);
    const gameSigner = await ethers.getSigner(gameAddress);
    const hubAsGame = hub.connect(gameSigner);

    const claimAddress = await hubAsGame.callStatic.makeClaim("CLAIM", "Claim One", test_uri);
    await hubAsGame.makeClaim("CLAIM", "Claim One", test_uri);
    const taskAddress = await hubAsGame.callStatic.makeTask("TASK", "Task One", test_uri);
    await hubAsGame.makeTask("TASK", "Task One", test_uri);

    const claim = await ethers.getContractAt("ClaimUpgradable", claimAddress);
    const task = await ethers.getContractAt("TaskUpgradable", taskAddress);

    expect(await claim.name()).to.equal("Claim One");
    expect(await claim.symbol()).to.equal("CLAIM");
    expect(await task.name()).to.equal("Task One");
    expect(await task.symbol()).to.equal("TASK");

    await ethers.provider.send("hardhat_stopImpersonatingAccount", [gameAddress]);
  });

  it("opens a task and accepts an applicant during the active stage", async function () {
    const { hub, soul } = await deployFullProtocol();
    const [, applicant] = await ethers.getSigners();
    const applicantAddress = await applicant.getAddress();
    await soul.connect(applicant).mint(test_uri);
    const applicantSoul = await soul.tokenByAddress(applicantAddress);

    const gameAddress = await hub.callStatic.makeGame("PROJECT", "Project Room", test_uri);
    await hub.makeGame("PROJECT", "Project Room", test_uri);

    await ethers.provider.send("hardhat_impersonateAccount", [gameAddress]);
    await ethers.provider.send("hardhat_setBalance", [
      gameAddress,
      ethers.utils.hexValue(ethers.utils.parseEther("1")),
    ]);
    const hubAsGame = hub.connect(await ethers.getSigner(gameAddress));
    const taskAddress = await hubAsGame.callStatic.makeTask("TASK", "Task One", test_uri);
    await hubAsGame.makeTask("TASK", "Task One", test_uri);
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [gameAddress]);

    const task = await ethers.getContractAt("TaskUpgradable", taskAddress);
    await task.stageOpen();
    await task.connect(applicant).application(test_uri);
    await task.acceptApplicant(applicantSoul);

    expect(await task.roleHasByToken(applicantSoul, "applicant")).to.equal(true);
  });
});
```

Run:

```shell
npx hardhat test test\ClaimTask.ts
```

Expected: tests pass or expose a task lifecycle permission issue to resolve before major package migration.

- [ ] **Step 3: Commit**

```shell
git add test/helpers/deployProtocol.ts test/ClaimTask.ts
git commit -m "test: cover claim and task procedure flows"
```

---

## Task 6: Replace Deprecated Waffle Usage

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `hardhat.config.ts`
- Modify: `test/**/*.ts`
- Test: full TypeScript test suite

- [ ] **Step 1: Remove Waffle plugin from config**

Modify `hardhat.config.ts`:

```typescript
import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
```

Run:

```shell
npx hardhat test test\preliminary.ts
```

Expected: tests still pass without `@nomiclabs/hardhat-waffle` imported.

- [ ] **Step 2: Remove Waffle dependency**

Run:

```shell
npm uninstall @nomiclabs/hardhat-waffle ethereum-waffle
```

Expected: `package.json` and `package-lock.json` remove Waffle packages.

- [ ] **Step 3: Run full tests**

Run:

```shell
npx hardhat test
```

Expected: tests pass or fail only because existing broad integration tests contain pre-existing behavior assumptions. Record all failures in `doc/migrations/dependency-migration-notes.md`.

- [ ] **Step 4: Commit**

```shell
git add package.json package-lock.json hardhat.config.ts test doc/migrations/dependency-migration-notes.md
git commit -m "chore: remove deprecated waffle test stack"
```

---

## Task 7: Migrate Tests and Helpers Toward ethers 6

**Files:**
- Modify: `utils/deployment.ts`
- Modify: `test/**/*.ts`
- Modify: `scripts/**/*.ts`
- Create: `doc/migrations/ethers-6-notes.md`
- Test: full TypeScript test suite

- [ ] **Step 1: Document ethers 6 API changes used by this repo**

Create `doc/migrations/ethers-6-notes.md`:

```markdown
# ethers 6 Migration Notes

Repo changes required:

- Replace `.address` with `await contract.getAddress()` for deployed contracts.
- Replace `contract.deployed()` with `contract.waitForDeployment()`.
- Replace `ethers.utils.parseEther` with `ethers.parseEther`.
- Replace `ethers.utils.hexValue` with `ethers.toQuantity`.
- Replace `ethers.utils.defaultAbiCoder` with `ethers.AbiCoder.defaultAbiCoder()`.
- Replace BigNumber equality assumptions with bigint-aware assertions where ethers 6 returns bigint.
- Replace `Contract` imports from ethers only where the upgraded API still exposes compatible types.
```

- [ ] **Step 2: Write a compatibility helper test**

Create `test/helpers/ethersCompat.ts`:

```typescript
export async function contractAddress(contract: any): Promise<string> {
  if (typeof contract.getAddress === "function") {
    return await contract.getAddress();
  }
  return contract.address;
}

export async function waitForDeployment(contract: any): Promise<void> {
  if (typeof contract.waitForDeployment === "function") {
    await contract.waitForDeployment();
    return;
  }
  if (typeof contract.deployed === "function") {
    await contract.deployed();
  }
}
```

Run:

```shell
npx hardhat test test\preliminary.ts
```

Expected: tests still pass under ethers 5.

- [ ] **Step 3: Refactor deployment helper through compatibility functions**

Modify `utils/deployment.ts` to use `waitForDeployment` and `contractAddress` equivalents, or duplicate those helpers locally in `utils/deployment.ts` if importing from test helpers would couple production scripts to tests.

Expected helper shape:

```typescript
const waitForDeploymentCompat = async (contract: any) => {
  if (typeof contract.waitForDeployment === "function") {
    await contract.waitForDeployment();
  } else if (typeof contract.deployed === "function") {
    await contract.deployed();
  }
};

const contractAddressCompat = async (contract: any): Promise<string> => {
  if (typeof contract.getAddress === "function") {
    return await contract.getAddress();
  }
  return contract.address;
};
```

Run:

```shell
npx hardhat test test\preliminary.ts test\Soul.ts test\OpenRepo.ts test\ClaimTask.ts
```

Expected: all focused tests pass under ethers 5.

- [ ] **Step 4: Commit**

```shell
git add utils/deployment.ts test/helpers/ethersCompat.ts doc/migrations/ethers-6-notes.md test
git commit -m "test: prepare helpers for ethers 6 migration"
```

---

## Task 8: Migrate Hardhat Plugins to Foundation Packages

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `hardhat.config.ts`
- Modify: `tsconfig.json`
- Test: `npx hardhat compile`, focused tests

- [ ] **Step 1: Update package dependencies for Hardhat 3 track**

Run:

```shell
npm uninstall @nomiclabs/hardhat-ethers @nomiclabs/hardhat-etherscan @typechain/ethers-v5 @typechain/hardhat
npm install --save-dev hardhat@3.7.0 @nomicfoundation/hardhat-ethers @nomicfoundation/hardhat-verify @nomicfoundation/hardhat-ethers-chai-matchers @typechain/hardhat@9.1.0 typechain@8.3.2
npm install ethers@6.16.0
```

Expected: install completes on Node `v22.13.0` or newer. If native scripts fail, run:

```shell
npm install --ignore-scripts
```

Then record the skipped script in `doc/migrations/dependency-migration-notes.md`.

- [ ] **Step 2: Update Hardhat config imports**

Modify `hardhat.config.ts` imports:

```typescript
import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ethers-chai-matchers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";

require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
```

Expected: `@nomiclabs/*` imports are gone.

- [ ] **Step 3: Compile and record config errors**

Run:

```shell
npx hardhat compile
```

Expected: compile succeeds or emits Hardhat 3 config migration errors. Fix config errors before touching contracts.

- [ ] **Step 4: Run focused tests**

Run:

```shell
npx hardhat test test\preliminary.ts test\Soul.ts test\OpenRepo.ts test\ClaimTask.ts
```

Expected: tests pass after ethers 6 syntax changes are applied.

- [ ] **Step 5: Commit**

```shell
git add package.json package-lock.json hardhat.config.ts tsconfig.json utils test doc/migrations/dependency-migration-notes.md
git commit -m "chore: migrate hardhat plugins and tests to ethers 6"
```

---

## Task 9: Update OpenZeppelin Hardhat Upgrades Plugin

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `utils/deployment.ts`
- Modify: `contracts/**/*.sol` only for validation failures
- Test: upgradeability tests and focused tests

- [ ] **Step 1: Upgrade plugin without Contracts 5**

Run:

```shell
npm install --save-dev @openzeppelin/hardhat-upgrades@4.0.0
```

Expected: OpenZeppelin Contracts packages remain pinned to `4.9.6`.

- [ ] **Step 2: Run upgrades validation**

Run:

```shell
npx hardhat test test\preliminary.ts
```

Expected: validation passes. If the plugin flags missing initializer calls, patch only the affected initializer order and add the exact warning to `doc/migrations/dependency-migration-notes.md`.

- [ ] **Step 3: Add upgradeability tests**

Create `test/upgradeability.ts`:

```typescript
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { deployCoreProtocol } from "./helpers/deployProtocol";

describe("Upgradeability validation", function () {
  it("deploys core UUPS contracts through the upgrades plugin", async function () {
    const { dataRepo, hub, soul } = await deployCoreProtocol();

    expect(await dataRepo.getAddress?.() ?? dataRepo.address).to.match(/^0x[a-fA-F0-9]{40}$/);
    expect(await hub.getRepoAddr()).to.equal(await dataRepo.getAddress?.() ?? dataRepo.address);
    expect(await soul.getHub()).to.equal(await hub.getAddress?.() ?? hub.address);
  });

  it("validates SoulUpgradable implementation as upgrade safe", async function () {
    const Soul = await ethers.getContractFactory("SoulUpgradable");
    await upgrades.validateImplementation(Soul, { kind: "uups" });
  });
});
```

Run:

```shell
npx hardhat test test\upgradeability.ts
```

Expected: tests pass.

- [ ] **Step 4: Commit**

```shell
git add package.json package-lock.json contracts utils test/upgradeability.ts doc/migrations/dependency-migration-notes.md
git commit -m "chore: update openzeppelin upgrades plugin"
```

---

## Task 10: OpenZeppelin Contracts 5 Storage Review

**Files:**
- Create: `doc/migrations/openzeppelin-5-storage-review.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `contracts/**/*.sol` in a separate branch only
- Test: storage-layout validation

- [ ] **Step 1: Create storage review document**

Create `doc/migrations/openzeppelin-5-storage-review.md`:

```markdown
# OpenZeppelin Contracts 5 Storage Review

Decision: OpenZeppelin Contracts 5 is blocked until storage layout compatibility is proven for every deployed or upgradeable contract.

Upgradeable contracts reviewed:

- HubUpgradable
- SoulUpgradable
- GameUpgradable
- ClaimUpgradable
- TaskUpgradable
- OpenRepoUpgradable
- ActionRepoTrackerUp
- VotesRepoTrackerUp
- VotesRepoTrackerIntUp
- VotesRoleRepoTrackerUp

Acceptance criteria:

- `npx hardhat compile` passes.
- `npx hardhat test test/upgradeability.ts` passes.
- OpenZeppelin storage layout validation reports no unsafe storage changes.
- Any import path changes from `@openzeppelin/contracts-upgradeable` to `@openzeppelin/contracts` are documented contract by contract.
- No deployed proxy is upgraded to an OpenZeppelin 5-based implementation without a storage-layout review signed off in this file.
```

- [ ] **Step 2: Try Contracts 5 in an isolated branch**

Run:

```shell
git switch -c codex/oz5-storage-review
npm install --save-dev @openzeppelin/contracts@5.6.1
npm install @openzeppelin/contracts-upgradeable@5.6.1
npx hardhat compile
```

Expected: compile fails on import/API changes or passes. Record every compile error in `doc/migrations/openzeppelin-5-storage-review.md`.

- [ ] **Step 3: Fix compile errors without changing protocol behavior**

Examples of allowed fixes:

```solidity
// Allowed: explicit override targets required by newer OpenZeppelin contracts.
function balanceOf(address owner)
  public
  view
  override(ERC721Upgradeable, IERC721Upgradeable)
  returns (uint256)
{
  ...
}
```

Examples of blocked fixes:

```solidity
// Blocked: changing storage variable order to silence validation.
mapping(address => bool) internal _games;
mapping(string => address) internal _beacons;
```

Expected: compile passes with no storage changes except explicitly reviewed parent-library layout effects.

- [ ] **Step 4: Run storage validation**

Run:

```shell
npx hardhat test test\upgradeability.ts
```

Expected: tests pass. If storage validation fails, do not merge OpenZeppelin 5. Document the failure and keep the project on OpenZeppelin 4.9.6.

- [ ] **Step 5: Commit review result**

If safe:

```shell
git add package.json package-lock.json contracts doc/migrations/openzeppelin-5-storage-review.md
git commit -m "chore: migrate openzeppelin contracts to v5"
```

If blocked:

```shell
git add doc/migrations/openzeppelin-5-storage-review.md
git commit -m "docs: record openzeppelin 5 migration blocker"
```

---

## Task 11: Modernize Audit and Dependency Health

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `doc/migrations/audit-review.md`
- Test: `npm audit --audit-level=critical`

- [ ] **Step 1: Generate audit report**

Run:

```shell
npm audit --audit-level=critical
```

Expected: report lists remaining critical vulnerabilities or exits with code `0`.

- [ ] **Step 2: Record unavoidable audit chains**

Create `doc/migrations/audit-review.md`:

```markdown
# Audit Review

Current critical chains:

- `elliptic` through ethers v5 / ganache / truffle stack.
- `form-data` through request-based resolver dependencies.

Resolution strategy:

- Remove Waffle and legacy Web3/Truffle dependencies first.
- Migrate ethers 5 to ethers 6.
- Keep OpenZeppelin 5 separate because storage safety is a protocol risk.
- Do not use `npm audit fix --force` unless the resulting package downgrades and breaking changes are explicitly reviewed.
```

- [ ] **Step 3: Run non-forced audit fix**

Run:

```shell
npm audit fix --ignore-scripts
```

Expected: npm either applies safe lockfile changes or reports that remaining fixes require `--force`.

- [ ] **Step 4: Commit audit notes**

```shell
git add package.json package-lock.json doc/migrations/audit-review.md
git commit -m "docs: record dependency audit migration path"
```

---

## Task 12: Improve Scripts and Secret Hygiene

**Files:**
- Modify: `hardhat.config.ts`
- Modify: `.env.example`
- Modify: `scripts/**/*.ts`
- Create: `doc/migrations/network-config-review.md`
- Test: compile and dry-run scripts where safe

- [ ] **Step 1: Remove committed RPC keys from config**

Modify `hardhat.config.ts` network URLs to use environment variables:

```typescript
mumbai: {
  url: process.env.MUMBAI_RPC || "",
  accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
},
polygon: {
  url: process.env.POLYGON_RPC || "",
  accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
},
```

Expected: no literal Alchemy or RPC secrets remain in `hardhat.config.ts`.

- [ ] **Step 2: Update `.env.example`**

Set `.env.example` keys:

```dotenv
PRIVATE_KEY=
MUMBAI_RPC=
POLYGON_RPC=
AURORA_RPC=
OP_RPC=
OP_TEST_RPC=
ETHERSCAN_API_KEY=
ETHERSCAN_API_KEY_POLY=
ETHERSCAN_API_KEY_OP=
ETHERSCAN_API_KEY_AURORA=
REPORT_GAS=
```

- [ ] **Step 3: Record network config decisions**

Create `doc/migrations/network-config-review.md`:

```markdown
# Network Config Review

All RPC URLs and private keys are loaded from environment variables.

No deployment script should hard-code production private keys, RPC keys, or explorer API keys.
```

- [ ] **Step 4: Verify compile**

Run:

```shell
npx hardhat compile
```

Expected: compile passes.

- [ ] **Step 5: Commit**

```shell
git add hardhat.config.ts .env.example scripts doc/migrations/network-config-review.md
git commit -m "chore: move network secrets to env config"
```

---

## Task 13: Full Regression and Release Gate

**Files:**
- Modify: `README.md`
- Modify: `doc/PROJECT_OVERVIEW.md`
- Create: `doc/migrations/release-checklist.md`
- Test: all tests, compile, size, audit

- [ ] **Step 1: Run full compile**

Run:

```shell
npx hardhat compile
```

Expected: compile passes.

- [ ] **Step 2: Run focused tests**

Run:

```shell
npx hardhat test test\preliminary.ts test\Soul.ts test\OpenRepo.ts test\ClaimTask.ts test\upgradeability.ts
```

Expected: all focused tests pass.

- [ ] **Step 3: Run full tests**

Run:

```shell
npx hardhat test
```

Expected: full suite passes or known legacy failures are documented with exact failing test names in `doc/migrations/release-checklist.md`.

- [ ] **Step 4: Run contract size**

Run:

```shell
npx hardhat size-contracts
```

Expected: size report completes. Any contract over the EIP-170 limit is listed in `doc/migrations/release-checklist.md`.

- [ ] **Step 5: Run audit**

Run:

```shell
npm audit --audit-level=critical
```

Expected: no critical vulnerabilities, or remaining criticals are documented as dev-only tooling chains with a migration issue linked in `doc/migrations/audit-review.md`.

- [ ] **Step 6: Update docs**

Update `README.md` command section:

```markdown
- Install environment: `npm install`
- Compile contracts: `npx hardhat compile`
- Run focused migration tests: `npx hardhat test test/preliminary.ts test/Soul.ts test/OpenRepo.ts test/ClaimTask.ts test/upgradeability.ts`
- Run all tests: `npx hardhat test`
- Check contract size: `npx hardhat size-contracts`
```

Update `doc/PROJECT_OVERVIEW.md` Testing Notes to mention:

```markdown
The migration test suite covers core deployment, soul token behavior, repository storage, procedure factories, and upgradeability validation.
```

- [ ] **Step 7: Create release checklist**

Create `doc/migrations/release-checklist.md`:

```markdown
# Dependency Migration Release Checklist

- `npx hardhat compile`: pass
- Focused migration tests: pass
- `npx hardhat test`: pass or documented legacy failures
- `npx hardhat size-contracts`: pass
- `npm audit --audit-level=critical`: pass or documented dev-only blockers
- OpenZeppelin 5 storage review: safe or explicitly deferred
- Network secrets removed from committed config
- README and project overview updated
```

- [ ] **Step 8: Commit final docs**

```shell
git add README.md doc/PROJECT_OVERVIEW.md doc/migrations/release-checklist.md
git commit -m "docs: add dependency migration release checklist"
```

---

## Suggested Work Beyond Package Migration

1. Add CI with Node version matrix:
   - Node `20` for Hardhat 2 compatibility while migration is in progress.
   - Node `22.13+` for Hardhat 3 readiness.

2. Add storage-layout artifacts to CI:
   - Run OpenZeppelin upgrades validation on every PR.
   - Fail PRs that modify upgradeable storage without review.

3. Replace deprecated test dependencies:
   - Remove Waffle.
   - Replace `@openzeppelin/test-helpers` usages with native Hardhat/ethers helpers.
   - Remove Web3/Truffle transitive chains where possible.

4. Add contract-level risk tests:
   - Hub factory permissions.
   - Soulbound non-transferability and secondary owner rules.
   - Game role assignment and voting-unit tracking.
   - Claim/task lifecycle stage guards.
   - Rule effect execution and opinion changes.

5. Add script safety:
   - Make deploy scripts refuse production networks without explicit `--network`.
   - Validate required env vars before sending transactions.
   - Remove hard-coded RPC URLs and old Mumbai references.

6. Add migration documentation:
   - Record every major dependency decision.
   - Record storage-layout decisions for every upgradeable contract.
   - Record audit findings that cannot be removed without a major migration.

## Self-Review

- Spec coverage: package migrations, tests, audit work, OpenZeppelin storage safety, script hygiene, and docs are all represented.
- Placeholder scan: no task uses open-ended `TBD`, `TODO`, or unspecified implementation steps.
- Type consistency: helper names are consistent across tasks: `deployCoreProtocol`, `deployFullProtocol`, `contractAddress`, and `waitForDeployment`.
- Scope check: the plan is intentionally phased because Hardhat 3, ethers 6, and OpenZeppelin 5 are independent migration risks.
