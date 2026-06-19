import { expect } from "chai";
import { ethers } from "hardhat";
import { deployContract } from "../../utils/deployment";
import { deployCoreProtocol } from "../helpers/deployProtocol";

describe("Hub beacon validation", function () {
  it("lets the owner add and upgrade beacon implementations", async function () {
    const { hub } = await deployCoreProtocol();
    const implementation = await deployContract("GameUpgradable", []);
    const replacement = await deployContract("GameUpgradable", []);

    await hub.beaconAdd("customGame", implementation.address);
    await expect(hub.beaconAdd("customGame", implementation.address)).to.be.revertedWith(
      "Beacon already exists"
    );

    await expect(hub.upgradeImplementation("customGame", replacement.address))
      .to.emit(hub, "UpdatedImplementation")
      .withArgs("customGame", replacement.address);
  });

  it("rejects beacon changes from non-owner accounts", async function () {
    const { hub } = await deployCoreProtocol();
    const [, outsider] = await ethers.getSigners();
    const implementation = await deployContract("GameUpgradable", []);

    await expect(
      hub.connect(outsider).beaconAdd("customGame", implementation.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      hub.connect(outsider).upgradeImplementation("game", implementation.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
