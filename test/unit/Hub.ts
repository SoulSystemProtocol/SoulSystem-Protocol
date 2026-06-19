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
    expect(await game.name()).to.equal("Test Game");
    expect(await game.confGet("type")).to.equal("MDAO");
    expect(await game.roleHas(creatorAddress, "admin")).to.equal(true);
    expect(await game.roleHas(creatorAddress, "member")).to.equal(true);
  });

  it("rejects claim and task creation from non-game accounts", async function () {
    const [, outsider] = await ethers.getSigners();
    const { hub } = await deployCoreProtocol();

    await expect(
      hub.connect(outsider).makeClaim("CLAIM", "Bad Claim", test_uri)
    ).to.be.revertedWith("UNAUTHORIZED: Valid Game Only");

    await expect(
      hub.connect(outsider).makeTask("TASK", "Bad Task", test_uri)
    ).to.be.revertedWith("UNAUTHORIZED: Valid Game Only");
  });
});
