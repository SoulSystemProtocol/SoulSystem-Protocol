import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { ethers } from "hardhat";
import { deployHub, deployUUPS } from "../utils/deployment";
import { test_uri, test_uri2 } from "../utils/consts";

describe("Preliminary protocol behavior", function () {
  let owner: Signer;
  let member: Signer;
  let outsider: Signer;
  let ownerAddress: string;
  let memberAddress: string;

  let dataRepo: Contract;
  let hub: Contract;
  let soul: Contract;

  beforeEach(async function () {
    [owner, member, outsider] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    memberAddress = await member.getAddress();

    dataRepo = await deployUUPS("OpenRepoUpgradable", []);
    hub = await deployHub(dataRepo.address);
    soul = await deployUUPS("SoulUpgradable", [hub.address]);

    await hub.assocSet("SBT", soul.address);
  });

  it("wires the hub to the shared repository and SBT association", async function () {
    expect(await hub.getRepoAddr()).to.equal(dataRepo.address);
    expect(await hub.assocGet("SBT")).to.equal(soul.address);
  });

  it("mints one non-transferable soul token per account", async function () {
    const tokenId = await soul.connect(member).callStatic.mint(test_uri);

    await soul.connect(member).mint(test_uri);

    expect(await soul.tokenByAddress(memberAddress)).to.equal(tokenId);
    expect(await soul.balanceOf(memberAddress)).to.equal(1);
    expect(await soul.tokenURI(tokenId)).to.equal(test_uri);

    await expect(soul.connect(member).mint(test_uri2)).to.be.revertedWith(
      "Account already has a token"
    );

    await expect(
      soul.connect(member).transferFrom(memberAddress, ownerAddress, tokenId)
    ).to.be.revertedWith("SOUL:NON_TRANSFERABLE");
  });

  it("creates a game, registers it, mints souls, and assigns creator roles", async function () {
    const gameAddress = await hub
      .connect(member)
      .callStatic.makeGame("MDAO", "Guild Alpha", test_uri);

    await expect(hub.connect(member).makeGame("MDAO", "Guild Alpha", test_uri))
      .to.emit(hub, "ContractCreated")
      .withArgs("game", gameAddress);

    const game = await ethers.getContractAt("GameUpgradable", gameAddress);

    expect(await dataRepo.addressHasOf(hub.address, "game", gameAddress)).to.equal(true);
    expect(await soul.tokenByAddress(memberAddress)).to.not.equal(0);
    expect(await soul.tokenByAddress(gameAddress)).to.not.equal(0);
    expect(await game.name()).to.equal("Guild Alpha");
    expect(await game.confGet("type")).to.equal("MDAO");
    expect(await game.confGet("role")).to.equal("MDAO");
    expect(await game.roleHas(memberAddress, "admin")).to.equal(true);
    expect(await game.roleHas(memberAddress, "member")).to.equal(true);
  });

  it("allows an active game to create claim and task procedures", async function () {
    const gameAddress = await hub.callStatic.makeGame("PROJECT", "Project Room", test_uri);
    await hub.makeGame("PROJECT", "Project Room", test_uri);

    await ethers.provider.send("hardhat_impersonateAccount", [gameAddress]);
    await ethers.provider.send("hardhat_setBalance", [
      gameAddress,
      ethers.utils.hexValue(ethers.utils.parseEther("1")),
    ]);
    const gameAsHub = hub.connect(await ethers.getSigner(gameAddress));

    const claimAddress = await gameAsHub.callStatic.makeClaim(
      "CLAIM",
      "First Claim",
      test_uri
    );
    await expect(gameAsHub.makeClaim("CLAIM", "First Claim", test_uri))
      .to.emit(hub, "ContractCreated")
      .withArgs("process", claimAddress);

    const taskAddress = await gameAsHub.callStatic.makeTask("TASK", "First Task", test_uri);
    await expect(gameAsHub.makeTask("TASK", "First Task", test_uri))
      .to.emit(hub, "ContractCreated")
      .withArgs("process", taskAddress);

    const claim = await ethers.getContractAt("ClaimUpgradable", claimAddress);
    const task = await ethers.getContractAt("TaskUpgradable", taskAddress);

    expect(await claim.name()).to.equal("First Claim");
    expect(await claim.symbol()).to.equal("CLAIM");
    expect(await claim.confGet("type")).to.equal("CLAIM");
    expect(await task.name()).to.equal("First Task");
    expect(await task.symbol()).to.equal("TASK");
    expect(await task.confGet("type")).to.equal("TASK");

    await ethers.provider.send("hardhat_stopImpersonatingAccount", [gameAddress]);
  });

  it("rejects claim and task creation from non-game accounts", async function () {
    await expect(
      hub.connect(outsider).makeClaim("CLAIM", "Invalid Claim", test_uri)
    ).to.be.revertedWith("UNAUTHORIZED: Valid Game Only");

    await expect(
      hub.connect(outsider).makeTask("TASK", "Invalid Task", test_uri)
    ).to.be.revertedWith("UNAUTHORIZED: Valid Game Only");
  });
});
