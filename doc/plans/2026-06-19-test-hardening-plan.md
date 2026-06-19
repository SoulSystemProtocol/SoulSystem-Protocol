# SoulSystem Protocol Test Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** In progress. Tasks 1 through 5 are implemented and verified. Task 6 is the next active slice. Commits are skipped unless explicitly requested by the user.

**Goal:** Build a reliable, maintainable test suite that documents and verifies the SoulSystem Protocol's core contract behavior, upgradeability assumptions, permissions, lifecycle flows, extension routing, and deployment helpers.

**Architecture:** Start with deterministic fixtures and small focused contract tests, then add integration flows that exercise Hub, Soul, Game, repositories, claims, tasks, rules, votes, and extensions together. Keep migration-sensitive tests separate from behavior tests so dependency upgrades can quickly identify whether a failure is caused by protocol behavior, test infrastructure, or package/tooling changes.

**Tech Stack:** Hardhat, TypeScript, Mocha, Chai, ethers v5 currently, OpenZeppelin Hardhat Upgrades, Solidity 0.8.9/0.8.14, TypeChain.

---

## Current Test State

Existing tests:

- `test/deployment.ts`: deployment smoke tests with limited assertions.
- `test/Hub.ts`: basic owner permission and `hubChange` tests.
- `test/Game.ts`: extension-heavy integration tests.
- `test/index.ts`: large broad integration suite.
- `test/preliminary.ts`: newer focused tests for core deployment, soul minting, game creation, and claim/task factory permissions.

Current gaps:

- No shared fixture layer, so tests duplicate deployments and are harder to maintain.
- Most tests assert only happy paths.
- Repository behavior is not independently covered.
- Soul identity behavior is only lightly covered.
- Claim and task lifecycle stages need direct tests.
- Rules, effects, votes, and extension routing need isolated and integration coverage.
- Upgradeability and storage-layout safety are not tested directly.
- Deployment scripts and helper utilities are not tested.
- Negative permission cases are incomplete.
- Full suite behavior under dependency migration is not pinned by a clear regression gate.

## Testing Principles

- Use fixtures for deterministic setup.
- Prefer small focused files over one large integration file.
- Every behavior test should assert a protocol outcome, not just "transaction did not revert."
- Add negative tests for every permissioned function.
- Test events where they are part of the external contract API.
- Keep upgradeability/storage tests separate from business behavior tests.
- Keep extension tests separate from core Game tests.
- Do not rewrite production contract code while adding tests unless a test exposes a bug and the fix is explicitly authorized.

## Target Test Structure

Create or reorganize tests into this shape:

```text
test/
  helpers/
    deployProtocol.ts
    addresses.ts
    assertions.ts
    impersonation.ts
    ruleData.ts
  unit/
    OpenRepo.ts
    Soul.ts
    Hub.ts
    GameRoles.ts
    RuleRepo.ts
    VotesRepo.ts
  integration/
    ProtocolDeployment.ts
    GameFactory.ts
    ClaimLifecycle.ts
    TaskLifecycle.ts
    RuleEffects.ts
    Extensions.ts
    HubMigration.ts
  upgradeability/
    UUPSValidation.ts
    BeaconValidation.ts
    StorageLayout.ts
  scripts/
    DeploymentHelpers.ts
```

Keep existing files during transition, but new focused tests should live in the new directories. Once coverage is equivalent, retire or split `test/index.ts`.

---

## Phase 1: Test Infrastructure

### Task 1: Add Shared Protocol Fixtures

**Files:**
- Create: `test/helpers/deployProtocol.ts`
- Create: `test/helpers/addresses.ts`
- Create: `test/helpers/assertions.ts`
- Create: `test/helpers/impersonation.ts`
- Test: `test/preliminary.ts`

- [x] **Step 1: Create `test/helpers/addresses.ts`**

```typescript
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function isNonZeroAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value) && value !== ZERO_ADDRESS;
}
```

- [x] **Step 2: Create `test/helpers/assertions.ts`**

```typescript
import { expect } from "chai";
import { BigNumberish } from "ethers";
import { isNonZeroAddress } from "./addresses";

export function expectAddress(value: string): void {
  expect(isNonZeroAddress(value)).to.equal(true);
}

export function expectZero(value: BigNumberish): void {
  expect(value).to.equal(0);
}

export function expectNonZeroTokenId(value: BigNumberish): void {
  expect(value).to.not.equal(0);
}
```

- [x] **Step 3: Create `test/helpers/impersonation.ts`**

```typescript
import { ethers } from "hardhat";

export async function impersonateAddress(address: string) {
  await ethers.provider.send("hardhat_impersonateAccount", [address]);
  await ethers.provider.send("hardhat_setBalance", [
    address,
    ethers.utils.hexValue(ethers.utils.parseEther("1")),
  ]);
  return ethers.getSigner(address);
}

export async function stopImpersonatingAddress(address: string): Promise<void> {
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [address]);
}
```

- [x] **Step 4: Create `test/helpers/deployProtocol.ts`**

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

- [x] **Step 5: Refactor `test/preliminary.ts` to use `deployCoreProtocol`**

Replace direct deployment in `beforeEach` with:

```typescript
const deployed = await deployCoreProtocol();
dataRepo = deployed.dataRepo;
hub = deployed.hub;
soul = deployed.soul;
```

- [x] **Step 6: Verify fixture works**

Run:

```shell
npx hardhat test test/preliminary.ts
```

Expected: `5 passing`.

- [ ] **Step 7: Commit**

Skipped for now because the user has not requested a commit.

```shell
git add test/preliminary.ts test/helpers
git commit -m "test: add shared protocol fixtures"
```

---

## Phase 2: Focused Unit Tests

### Task 2: Test OpenRepo Storage Semantics

**Files:**
- Create: `test/unit/OpenRepo.ts`
- Test: `test/unit/OpenRepo.ts`

- [x] **Step 1: Create address storage tests**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployUUPS } from "../../utils/deployment";

describe("OpenRepoUpgradable", function () {
  it("sets and returns the first address value for the caller scope", async function () {
    const [owner] = await ethers.getSigners();
    const repo = await deployUUPS("OpenRepoUpgradable", []);
    const ownerAddress = await owner.getAddress();

    await repo.addressSet("SBT", ownerAddress);

    expect(await repo.addressGet("SBT")).to.equal(ownerAddress);
  });

  it("adds multiple address values and removes only the selected value", async function () {
    const [owner, second] = await ethers.getSigners();
    const repo = await deployUUPS("OpenRepoUpgradable", []);
    const ownerAddress = await owner.getAddress();
    const secondAddress = await second.getAddress();

    await repo.addressSet("game", ownerAddress);
    await repo.addressAdd("game", secondAddress);
    await repo.addressRemove("game", ownerAddress);

    expect(await repo.addressGet("game")).to.equal(secondAddress);
    expect(await repo.addressHas("game", ownerAddress)).to.equal(false);
    expect(await repo.addressHas("game", secondAddress)).to.equal(true);
  });
});
```

- [x] **Step 2: Add caller-scope isolation tests**

Add to `test/unit/OpenRepo.ts`:

```typescript
it("keeps values isolated by caller address", async function () {
  const [owner, other] = await ethers.getSigners();
  const repo = await deployUUPS("OpenRepoUpgradable", []);
  const ownerAddress = await owner.getAddress();

  await repo.addressSet("SBT", ownerAddress);

  expect(await repo.connect(other).addressGet("SBT")).to.equal(
    "0x0000000000000000000000000000000000000000"
  );
});

it("sets and reads strings, booleans, and uints", async function () {
  const repo = await deployUUPS("OpenRepoUpgradable", []);

  await repo.stringSet("type", "MDAO");
  await repo.boolSet("isClosed", true);
  await repo.uintSet("score", 7);

  expect(await repo.stringGet("type")).to.equal("MDAO");
  expect(await repo.boolGet("isClosed")).to.equal(true);
  expect(await repo.uintGet("score")).to.equal(7);
});
```

- [x] **Step 3: Verify**

Run:

```shell
npx hardhat test test/unit/OpenRepo.ts
```

Expected: all OpenRepo tests pass.

### Task 3: Test Soul Identity Behavior

**Files:**
- Create: `test/unit/Soul.ts`
- Test: `test/unit/Soul.ts`

- [x] **Step 1: Add minting and one-token-per-account tests**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployCoreProtocol } from "../helpers/deployProtocol";
import { test_uri, test_uri2 } from "../../utils/consts";

describe("SoulUpgradable", function () {
  it("mints one soulbound token per account", async function () {
    const [, alice] = await ethers.getSigners();
    const aliceAddress = await alice.getAddress();
    const { soul } = await deployCoreProtocol();

    const tokenId = await soul.connect(alice).callStatic.mint(test_uri);
    await soul.connect(alice).mint(test_uri);

    expect(await soul.tokenByAddress(aliceAddress)).to.equal(tokenId);
    expect(await soul.balanceOf(aliceAddress)).to.equal(1);
    await expect(soul.connect(alice).mint(test_uri2)).to.be.revertedWith(
      "Account already has a token"
    );
  });
});
```

- [x] **Step 2: Add non-transferability tests**

```typescript
it("prevents normal account transfers", async function () {
  const [, alice, bob] = await ethers.getSigners();
  const aliceAddress = await alice.getAddress();
  const bobAddress = await bob.getAddress();
  const { soul } = await deployCoreProtocol();

  const tokenId = await soul.connect(alice).callStatic.mint(test_uri);
  await soul.connect(alice).mint(test_uri);

  await expect(
    soul.connect(alice).transferFrom(aliceAddress, bobAddress, tokenId)
  ).to.be.revertedWith("SOUL:NON_TRANSFERABLE");
});
```

- [x] **Step 3: Add handle tests**

```typescript
it("sets and resolves unique handles", async function () {
  const [, alice] = await ethers.getSigners();
  const { soul } = await deployCoreProtocol();

  const tokenId = await soul.connect(alice).callStatic.mint(test_uri);
  await soul.connect(alice).mint(test_uri);
  await soul.connect(alice).handleSet(tokenId, "alice");

  expect(await soul.handleGet(tokenId)).to.equal("alice");
  expect(await soul.handleFind("alice")).to.equal(tokenId);
});

it("rejects duplicate handles", async function () {
  const [, alice, bob] = await ethers.getSigners();
  const bobAddress = await bob.getAddress();
  const { soul } = await deployCoreProtocol();

  const aliceToken = await soul.connect(alice).callStatic.mint(test_uri);
  await soul.connect(alice).mint(test_uri);
  await soul.connect(alice).handleSet(aliceToken, "alice");

  await soul.connect(bob).mint(test_uri2);
  const bobToken = await soul.tokenByAddress(bobAddress);

  await expect(soul.connect(bob).handleSet(bobToken, "alice")).to.be.revertedWith(
    "HANDLE_TAKEN"
  );
});
```

- [x] **Step 4: Add secondary owner tests**

```typescript
it("lets a token controller add a secondary owner", async function () {
  const [, alice, secondary] = await ethers.getSigners();
  const secondaryAddress = await secondary.getAddress();
  const { soul } = await deployCoreProtocol();

  const tokenId = await soul.connect(alice).callStatic.mint(test_uri);
  await soul.connect(alice).mint(test_uri);
  await soul.connect(alice).addSecondaryOwner(secondaryAddress, tokenId);

  expect(await soul.tokenByAddress(secondaryAddress)).to.equal(tokenId);
  expect(await soul.balanceOf(secondaryAddress)).to.equal(1);
});
```

- [x] **Step 5: Verify**

Run:

```shell
npx hardhat test test/unit/Soul.ts
```

Expected: all Soul tests pass.

### Task 4: Test Hub Factory and Association Behavior

**Files:**
- Create: `test/unit/Hub.ts`
- Test: `test/unit/Hub.ts`

- [x] **Step 1: Add hub association permission tests**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployCoreProtocol } from "../helpers/deployProtocol";
import { test_uri } from "../../utils/consts";

describe("HubUpgradable", function () {
  it("lets the owner set and read associations", async function () {
    const [owner] = await ethers.getSigners();
    const ownerAddress = await owner.getAddress();
    const { hub } = await deployCoreProtocol();

    await hub.assocSet("custom", ownerAddress);

    expect(await hub.assocGet("custom")).to.equal(ownerAddress);
  });

  it("rejects association changes from non-owner accounts", async function () {
    const [, outsider] = await ethers.getSigners();
    const outsiderAddress = await outsider.getAddress();
    const { hub } = await deployCoreProtocol();

    await expect(
      hub.connect(outsider).assocSet("custom", outsiderAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
```

- [x] **Step 2: Add game factory tests**

```typescript
it("creates games and registers them in the hub-owned repository scope", async function () {
  const [, creator] = await ethers.getSigners();
  const creatorAddress = await creator.getAddress();
  const { dataRepo, hub, soul } = await deployCoreProtocol();

  const gameAddress = await hub
    .connect(creator)
    .callStatic.makeGame("MDAO", "Test Game", test_uri);

  await expect(hub.connect(creator).makeGame("MDAO", "Test Game", test_uri))
    .to.emit(hub, "ContractCreated")
    .withArgs("game", gameAddress);

  const game = await ethers.getContractAt("GameUpgradable", gameAddress);

  expect(await dataRepo.addressHasOf(hub.address, "game", gameAddress)).to.equal(true);
  expect(await soul.tokenByAddress(creatorAddress)).to.not.equal(0);
  expect(await soul.tokenByAddress(gameAddress)).to.not.equal(0);
  expect(await game.roleHas(creatorAddress, "admin")).to.equal(true);
  expect(await game.roleHas(creatorAddress, "member")).to.equal(true);
});
```

- [x] **Step 3: Add procedure factory permission tests**

```typescript
it("rejects claim and task creation from non-game accounts", async function () {
  const [, outsider] = await ethers.getSigners();
  const { hub } = await deployCoreProtocol();

  await expect(hub.connect(outsider).makeClaim("CLAIM", "Bad Claim", test_uri)).to.be.revertedWith(
    "UNAUTHORIZED: Valid Game Only"
  );

  await expect(hub.connect(outsider).makeTask("TASK", "Bad Task", test_uri)).to.be.revertedWith(
    "UNAUTHORIZED: Valid Game Only"
  );
});
```

- [x] **Step 4: Verify**

Run:

```shell
npx hardhat test test/unit/Hub.ts
```

Expected: all Hub tests pass.

### Task 5: Test Game Roles and Membership

**Files:**
- Create: `test/unit/GameRoles.ts`
- Test: `test/unit/GameRoles.ts`

- [x] **Step 1: Add game creation helper inside test file**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployCoreProtocol } from "../helpers/deployProtocol";
import { test_uri } from "../../utils/consts";

async function createGame(type = "MDAO", name = "Role Test Game") {
  const deployment = await deployCoreProtocol();
  const [owner, member] = await ethers.getSigners();
  const gameAddress = await deployment.hub
    .connect(member)
    .callStatic.makeGame(type, name, test_uri);
  await deployment.hub.connect(member).makeGame(type, name, test_uri);
  const game = await ethers.getContractAt("GameUpgradable", gameAddress);
  return { ...deployment, owner, member, game, gameAddress };
}
```

- [x] **Step 2: Add default role tests**

```typescript
describe("GameUpgradable roles", function () {
  it("assigns creator admin and member roles", async function () {
    const { member, game } = await createGame();
    const memberAddress = await member.getAddress();

    expect(await game.roleHas(memberAddress, "admin")).to.equal(true);
    expect(await game.roleHas(memberAddress, "member")).to.equal(true);
    expect(await game.roleExist("authority")).to.equal(true);
  });
});
```

- [x] **Step 3: Add join/leave tests**

```typescript
it("lets another account join and leave member role", async function () {
  const { game } = await createGame();
  const [, , joiner] = await ethers.getSigners();
  const joinerAddress = await joiner.getAddress();

  expect(await game.roleHas(joinerAddress, "member")).to.equal(false);

  await game.connect(joiner).join();
  expect(await game.roleHas(joinerAddress, "member")).to.equal(true);

  await game.connect(joiner).leave();
  expect(await game.roleHas(joinerAddress, "member")).to.equal(false);
});
```

- [x] **Step 4: Add closed game rejection test**

```typescript
it("rejects join when game is closed", async function () {
  const { game } = await createGame();
  const [, , joiner] = await ethers.getSigners();

  await game.confSet("isClosed", "true");

  await expect(game.connect(joiner).join()).to.be.revertedWith("CLOSED_SPACE");
});
```

- [x] **Step 5: Verify**

Run:

```shell
npx hardhat test test/unit/GameRoles.ts
```

Expected: all Game role tests pass.

---

## Phase 3: Integration Flow Tests

### Task 6: Test Protocol Deployment Flow

**Files:**
- Create: `test/integration/ProtocolDeployment.ts`
- Test: `test/integration/ProtocolDeployment.ts`

- [ ] **Step 1: Add core deployment assertions**

```typescript
import { expect } from "chai";
import { deployFullProtocol } from "../helpers/deployProtocol";

describe("Protocol deployment flow", function () {
  it("deploys core contracts and registers required associations", async function () {
    const { dataRepo, hub, soul, ruleRepo, actionRepo, votesRepo } = await deployFullProtocol();

    expect(await hub.getRepoAddr()).to.equal(dataRepo.address);
    expect(await hub.assocGet("SBT")).to.equal(soul.address);
    expect(await hub.assocGet("RULE_REPO")).to.equal(ruleRepo.address);
    expect(await hub.assocGet("action")).to.equal(actionRepo.address);
    expect(await hub.assocGet("VOTES_REPO")).to.equal(votesRepo.address);
  });
});
```

- [ ] **Step 2: Verify**

Run:

```shell
npx hardhat test test/integration/ProtocolDeployment.ts
```

Expected: test passes.

### Task 7: Test Claim Lifecycle

**Files:**
- Create: `test/integration/ClaimLifecycle.ts`
- Test: `test/integration/ClaimLifecycle.ts`

- [ ] **Step 1: Add claim factory setup**

Use `deployFullProtocol`, `impersonateAddress`, and `stopImpersonatingAddress` to create a game and claim.

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFullProtocol } from "../helpers/deployProtocol";
import { impersonateAddress, stopImpersonatingAddress } from "../helpers/impersonation";
import { test_uri } from "../../utils/consts";

async function createClaim() {
  const deployment = await deployFullProtocol();
  const gameAddress = await deployment.hub.callStatic.makeGame("PROJECT", "Claims Game", test_uri);
  await deployment.hub.makeGame("PROJECT", "Claims Game", test_uri);

  const gameSigner = await impersonateAddress(gameAddress);
  const hubAsGame = deployment.hub.connect(gameSigner);
  const claimAddress = await hubAsGame.callStatic.makeClaim("CLAIM", "Claim One", test_uri);
  await hubAsGame.makeClaim("CLAIM", "Claim One", test_uri);
  await stopImpersonatingAddress(gameAddress);

  const claim = await ethers.getContractAt("ClaimUpgradable", claimAddress);
  const game = await ethers.getContractAt("GameUpgradable", gameAddress);
  return { ...deployment, game, gameAddress, claim, claimAddress };
}
```

- [ ] **Step 2: Add draft validation tests**

```typescript
describe("Claim lifecycle", function () {
  it("starts claims in draft stage", async function () {
    const { claim } = await createClaim();

    expect(await claim.stage()).to.equal(0);
  });

  it("rejects filing without a subject", async function () {
    const { claim } = await createClaim();

    await expect(claim.stageFile()).to.be.revertedWith("ROLE:MISSING_SUBJECT");
  });
});
```

- [ ] **Step 3: Add stage permission tests**

```typescript
it("rejects unauthorized stage transitions", async function () {
  const { claim } = await createClaim();
  const [, outsider] = await ethers.getSigners();

  await expect(claim.connect(outsider).stageWaitForDecision()).to.be.revertedWith(
    "STAGE:OPEN_ONLY"
  );
});
```

- [ ] **Step 4: Verify**

Run:

```shell
npx hardhat test test/integration/ClaimLifecycle.ts
```

Expected: tests pass or expose current lifecycle setup requirements that must be documented before adding verdict/effect tests.

### Task 8: Test Task Lifecycle and Escrow Boundaries

**Files:**
- Create: `test/integration/TaskLifecycle.ts`
- Test: `test/integration/TaskLifecycle.ts`

- [ ] **Step 1: Add task creation helper**

Create a helper inside `TaskLifecycle.ts` following the same pattern as `createClaim`, but call `makeTask("TASK", "Task One", test_uri)`.

- [ ] **Step 2: Add stage tests**

```typescript
it("opens from draft stage", async function () {
  const { task } = await createTask();

  expect(await task.stage()).to.equal(0);
  await task.stageOpen();
  expect(await task.stage()).to.equal(1);
});

it("rejects applications before the task is open", async function () {
  const { task } = await createTask();
  const [, applicant] = await ethers.getSigners();

  await expect(task.connect(applicant).application(test_uri)).to.be.revertedWith(
    "STAGE:TOO_EARLY"
  );
});
```

- [ ] **Step 3: Add application acceptance test**

```typescript
it("accepts an applicant after opening", async function () {
  const { task, soul } = await createTask();
  const [, applicant] = await ethers.getSigners();
  const applicantAddress = await applicant.getAddress();

  await soul.connect(applicant).mint(test_uri);
  const applicantSoul = await soul.tokenByAddress(applicantAddress);

  await task.stageOpen();
  await task.connect(applicant).application(test_uri);
  await task.acceptApplicant(applicantSoul);

  expect(await task.roleHasByToken(applicantSoul, "applicant")).to.equal(true);
});
```

- [ ] **Step 4: Verify**

Run:

```shell
npx hardhat test test/integration/TaskLifecycle.ts
```

Expected: all task lifecycle tests pass.

### Task 9: Test Rules and Effects

**Files:**
- Create: `test/helpers/ruleData.ts`
- Create: `test/integration/RuleEffects.ts`
- Test: `test/integration/RuleEffects.ts`

- [ ] **Step 1: Create rule data helpers**

```typescript
export function makeRule(affected = "subject", uri = "ipfs://rule") {
  return {
    about: "",
    affected,
    uri,
    disabled: false,
  };
}

export function makeEffect(domain = "professional", value = 5) {
  return {
    domain,
    value,
  };
}

export function makeConfirmation() {
  return {
    ruling: 0,
    evidence: 0,
    witness: 0,
  };
}
```

If the current `DataTypes` structs differ from these field names, adjust this helper to match `contracts/libraries/DataTypes.sol` exactly before writing tests.

- [ ] **Step 2: Add rule creation tests**

Create `test/integration/RuleEffects.ts` and verify:

- game admin can add a rule;
- non-admin cannot add a rule;
- `ruleGet`, `effectsGet`, and `confirmationGet` return the stored values.

- [ ] **Step 3: Add effect execution test**

Test `GameUpgradable.reportEvent`:

- assign `authority` role to an account;
- mint or resolve the target soul token;
- add a rule with one effect;
- call `reportEvent`;
- assert `SoulUpgradable.getOpinion(...)` changes by the effect value.

- [ ] **Step 4: Verify**

Run:

```shell
npx hardhat test test/integration/RuleEffects.ts
```

Expected: rule and effect tests pass. If `DataTypes` shape makes helper code invalid, fix helper types first rather than weakening assertions.

### Task 10: Test Voting Power Tracking

**Files:**
- Create: `test/unit/VotesRepo.ts`
- Create: `test/integration/VotingPower.ts`
- Test: both files

- [ ] **Step 1: Add repository-level vote tests**

Cover:

- initial votes are zero;
- transfer voting units from zero to a soul token;
- transfer voting units between two soul tokens;
- total supply changes as expected.

- [ ] **Step 2: Add Game role transfer vote tests**

Cover:

- user joins game;
- member role token is minted;
- votes repo gets one voting unit for that member's soul;
- user leaves game;
- voting unit is removed or transferred according to current implementation.

- [ ] **Step 3: Verify**

Run:

```shell
npx hardhat test test/unit/VotesRepo.ts test/integration/VotingPower.ts
```

Expected: vote accounting matches role membership behavior.

### Task 11: Test Extension Routing

**Files:**
- Create: `test/integration/Extensions.ts`
- Test: `test/integration/Extensions.ts`

- [ ] **Step 1: Test missing extension routing**

Create a game with a type that has no registered extension and call a known extension function through the game address.

Expected revert:

```text
NO_FALLBACK_CONTRACTS
```

- [ ] **Step 2: Test registered extension routing**

Deploy `ActionExt`, `VotesExt`, or another known extension, register it under the correct `GAME_<type>` key, create a game of that type, attach extension ABI to the game address, and call a read function.

- [ ] **Step 3: Verify**

Run:

```shell
npx hardhat test test/integration/Extensions.ts
```

Expected: extension routing succeeds only when configured.

---

## Phase 4: Upgradeability and Storage Safety

### Task 12: Add UUPS Validation Tests

**Files:**
- Create: `test/upgradeability/UUPSValidation.ts`
- Test: `test/upgradeability/UUPSValidation.ts`

- [ ] **Step 1: Validate UUPS implementations**

```typescript
import { ethers, upgrades } from "hardhat";

describe("UUPS upgradeability validation", function () {
  for (const contractName of [
    "HubUpgradable",
    "SoulUpgradable",
    "OpenRepoUpgradable",
    "ActionRepoTrackerUp",
    "VotesRepoTrackerUp",
    "VotesRepoTrackerIntUp",
    "VotesRoleRepoTrackerUp",
  ]) {
    it(`validates ${contractName} as upgrade safe`, async function () {
      const factory = await ethers.getContractFactory(contractName);
      await upgrades.validateImplementation(factory, { kind: "uups" });
    });
  }
});
```

- [ ] **Step 2: Verify**

Run:

```shell
npx hardhat test test/upgradeability/UUPSValidation.ts
```

Expected: validation passes or reports exact initializer/storage warnings that must be reviewed.

### Task 13: Add Beacon Proxy Factory Tests

**Files:**
- Create: `test/upgradeability/BeaconValidation.ts`
- Test: `test/upgradeability/BeaconValidation.ts`

- [ ] **Step 1: Test owner can register and upgrade beacon implementations**

Cover:

- owner deploys a new implementation;
- owner calls `beaconAdd`;
- duplicate beacon name reverts with `Beacon already exists`;
- owner calls `upgradeImplementation`;
- non-owner upgrade attempt reverts.

- [ ] **Step 2: Verify**

Run:

```shell
npx hardhat test test/upgradeability/BeaconValidation.ts
```

Expected: beacon permissions and duplicate protections are enforced.

### Task 14: Add Storage Layout Gate

**Files:**
- Create: `test/upgradeability/StorageLayout.ts`
- Create: `doc/testing/storage-layout-testing.md`
- Test: `test/upgradeability/StorageLayout.ts`

- [ ] **Step 1: Document storage safety rule**

Create `doc/testing/storage-layout-testing.md`:

```markdown
# Storage Layout Testing

Upgradeable contracts must not change storage order or remove storage variables without an explicit migration review.

Every dependency migration must run:

```shell
npx hardhat test test/upgradeability/UUPSValidation.ts
```

OpenZeppelin Contracts major-version upgrades require a separate storage-layout review before merge.
```
```

- [ ] **Step 2: Add storage gate test**

Use `upgrades.validateImplementation` for each upgradeable contract. If the project later adds mock V2 contracts, extend this test to call `upgrades.validateUpgrade`.

- [ ] **Step 3: Verify**

Run:

```shell
npx hardhat test test/upgradeability/UUPSValidation.ts
```

Expected: all validations pass or produce documented blockers.

---

## Phase 5: Deployment Helper and Script Tests

### Task 15: Test Deployment Helpers

**Files:**
- Create: `test/scripts/DeploymentHelpers.ts`
- Modify: `utils/deployment.ts` only if tests expose helper bugs
- Test: `test/scripts/DeploymentHelpers.ts`

- [ ] **Step 1: Test `deployContract`**

```typescript
import { expect } from "chai";
import { deployContract, deployHub, deployUUPS } from "../../utils/deployment";

describe("deployment helpers", function () {
  it("deploys regular contracts", async function () {
    const gameImpl = await deployContract("GameUpgradable", []);

    expect(gameImpl.address).to.match(/^0x[a-fA-F0-9]{40}$/);
  });
});
```

- [ ] **Step 2: Test `deployUUPS`**

```typescript
it("deploys UUPS proxies", async function () {
  const repo = await deployUUPS("OpenRepoUpgradable", []);

  expect(await repo.name()).to.equal("Open Edge Repository");
});
```

- [ ] **Step 3: Test `deployHub`**

```typescript
it("deploys the hub with game, claim, and task beacons", async function () {
  const repo = await deployUUPS("OpenRepoUpgradable", []);
  const hub = await deployHub(repo.address);

  expect(await hub.role()).to.equal("Hub");
  expect(await hub.symbol()).to.equal("HUB");
  expect(await hub.getRepoAddr()).to.equal(repo.address);
});
```

- [ ] **Step 4: Verify**

Run:

```shell
npx hardhat test test/scripts/DeploymentHelpers.ts
```

Expected: all helper tests pass.

---

## Phase 6: Regression Gates and CI Readiness

### Task 16: Add Test Scripts to `package.json`

**Files:**
- Modify: `package.json`
- Test: npm scripts

- [ ] **Step 1: Replace placeholder `test` script**

Update scripts:

```json
{
  "scripts": {
    "test": "hardhat test",
    "test:unit": "hardhat test test/unit/**/*.ts",
    "test:integration": "hardhat test test/integration/**/*.ts",
    "test:upgradeability": "hardhat test test/upgradeability/**/*.ts",
    "test:smoke": "hardhat test test/preliminary.ts",
    "size": "hardhat size-contracts",
    "typechain": "hardhat typechain"
  }
}
```

- [ ] **Step 2: Verify scripts**

Run:

```shell
npm run test:smoke
npm run test:unit
npm run test:integration
npm run test:upgradeability
```

Expected: scripts execute the intended test subsets.

### Task 17: Add CI Test Checklist

**Files:**
- Create: `doc/testing/test-checklist.md`
- Optional create: `.github/workflows/test.yml`

- [ ] **Step 1: Create test checklist**

```markdown
# Test Checklist

Run before merging contract or dependency changes:

- `npm install`
- `npx hardhat compile`
- `npm run test:smoke`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:upgradeability`
- `npx hardhat size-contracts`
- `npm audit --audit-level=critical`

Contract changes require:

- direct unit coverage for changed contract behavior;
- negative permission tests for new permission checks;
- upgradeability validation for changed upgradeable contracts;
- storage-layout review for any storage variable change.
```

- [ ] **Step 2: Add GitHub Actions workflow after scripts are stable**

Create `.github/workflows/test.yml`:

```yaml
name: tests

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  hardhat:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npx hardhat compile
      - run: npm run test:smoke
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:upgradeability
```

- [ ] **Step 3: Verify locally**

Run:

```shell
npm run test:smoke
```

Expected: smoke test script passes before CI workflow is committed.

---

## Coverage Matrix

| Area | Test Files | Required Coverage |
| --- | --- | --- |
| Repository storage | `test/unit/OpenRepo.ts` | address/string/bool/uint set/add/remove/get and caller scope |
| Soul identity | `test/unit/Soul.ts` | minting, one-token limit, non-transferability, handles, secondary owners, token URI |
| Hub | `test/unit/Hub.ts`, `test/integration/GameFactory.ts` | owner associations, factory events, active game tracking, child creation permissions |
| Game roles | `test/unit/GameRoles.ts` | default roles, join, leave, closed game rejection, admin-only role assignment |
| Claims | `test/integration/ClaimLifecycle.ts` | draft/open/decision/closed transitions, subject requirements, authority/admin permissions |
| Tasks | `test/integration/TaskLifecycle.ts` | open/application/acceptance/execution/cancel/refund stage guards |
| Rules | `test/integration/RuleEffects.ts` | rule add/update/disable, effects execution, opinion changes |
| Votes | `test/unit/VotesRepo.ts`, `test/integration/VotingPower.ts` | vote unit transfer, member role vote tracking |
| Extensions | `test/integration/Extensions.ts` | configured routing, missing routing failures |
| Upgradeability | `test/upgradeability/*.ts` | UUPS validation, beacon permissions, storage-layout gate |
| Deployment helpers | `test/scripts/DeploymentHelpers.ts` | regular deploy, UUPS deploy, hub deploy |

## Acceptance Criteria

- `npx hardhat compile` passes.
- `npm run test:smoke` passes.
- `npm run test:unit` passes.
- `npm run test:integration` passes.
- `npm run test:upgradeability` passes.
- `npx hardhat test` passes or legacy failures are documented with exact test names and reasons.
- New tests do not require live networks.
- New tests do not require private keys.
- New tests do not mutate tracked OpenZeppelin manifest files after cleanup.
- Test helpers support the current ethers v5 stack and can be adapted for ethers v6 migration.

## Execution Order

1. Add helpers.
2. Add unit tests.
3. Add integration tests.
4. Add upgradeability tests.
5. Add script/helper tests.
6. Add package scripts.
7. Add checklist and CI.
8. Split or retire `test/index.ts` only after equivalent focused coverage exists.

## Risks and Mitigations

- **Risk:** Current broad tests may rely on implicit order or shared state.
  **Mitigation:** New tests must use fresh deployments per file or per case.

- **Risk:** Extension tests may fail because game fallback routing depends on repository keys.
  **Mitigation:** Test missing and configured extension routes separately.

- **Risk:** OpenZeppelin upgrades validation may flag initializer ordering.
  **Mitigation:** Treat validation failures as contract safety findings, not test noise.

- **Risk:** Hardhat local tests can delete or rewrite `.openzeppelin/unknown-31337.json`.
  **Mitigation:** Restore generated manifest churn after test runs unless explicitly testing manifest changes.

- **Risk:** Large `test/index.ts` may obscure failures.
  **Mitigation:** Do not edit it heavily. Build focused coverage first, then replace it in small commits.

## Follow-Up Tasks

- Decide whether `GameUpgradable.join()` should auto-mint a Soul token for soulless callers, matching `roleAssign`, or whether clients must mint a Soul before joining. Current Task 5 tests document the existing precondition by minting a Soul before `join()`.

## Self-Review

- Scope covers unit, integration, upgradeability, scripts, and CI.
- Tasks specify exact files, commands, and expected outcomes.
- Test examples use current Hardhat/ethers v5 style.
- No production contract changes are required by this plan unless tests expose bugs.
- OpenZeppelin storage safety is included as a required testing gate.
