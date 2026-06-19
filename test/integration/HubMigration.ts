import { expect } from "chai";
import { ethers } from "hardhat";
import { deployHub, deployUUPS } from "../../utils/deployment";
import { deployFullProtocol } from "../helpers/deployProtocol";

describe("Hub migration", function () {
  it("moves configured protocol children to a new hub", async function () {
    const { actionRepo, dataRepo, hub, soul } = await deployFullProtocol();
    const newHub = await deployHub(dataRepo.address);

    await newHub.assocSet("SBT", soul.address);
    await newHub.assocSet("action", actionRepo.address);

    expect(await soul.getHub()).to.equal(hub.address);
    expect(await actionRepo.getHub()).to.equal(hub.address);

    await expect(hub.hubChange(newHub.address))
      .to.emit(hub, "HubChanged")
      .withArgs(newHub.address);

    expect(await soul.getHub()).to.equal(newHub.address);
    expect(await actionRepo.getHub()).to.equal(newHub.address);
    expect(await newHub.assocGet("SBT")).to.equal(soul.address);
    expect(await newHub.assocGet("action")).to.equal(actionRepo.address);
  });

  it("rejects hub migration from non-owner accounts", async function () {
    const { dataRepo, hub } = await deployFullProtocol();
    const [, outsider] = await ethers.getSigners();
    const newHub = await deployHub(dataRepo.address);

    await expect(hub.connect(outsider).hubChange(newHub.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("uses associations scoped to the new hub after migration", async function () {
    const { actionRepo, dataRepo, hub, soul } = await deployFullProtocol();
    const newHub = await deployHub(dataRepo.address);
    const replacementSoul = await deployUUPS("SoulUpgradable", [newHub.address]);

    await newHub.assocSet("SBT", replacementSoul.address);
    await newHub.assocSet("action", actionRepo.address);
    await hub.hubChange(newHub.address);

    expect(await soul.getHub()).to.equal(newHub.address);
    expect(await newHub.assocGet("SBT")).to.equal(replacementSoul.address);
    expect(await soul.getRepoAddr()).to.equal(dataRepo.address);
  });
});
