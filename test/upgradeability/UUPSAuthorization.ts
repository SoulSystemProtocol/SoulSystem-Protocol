import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { deployCoreProtocol } from "../helpers/deployProtocol";
import { deployUUPS } from "../../utils/deployment";

describe("UUPS upgrade authorization", function () {
  it("rejects OpenRepo upgrades from non-owner accounts", async function () {
    const [, outsider] = await ethers.getSigners();
    const repo = await deployUUPS("OpenRepoUpgradable", []);
    const factory = await ethers.getContractFactory("OpenRepoUpgradable", outsider);

    await expect(upgrades.upgradeProxy(repo.address, factory)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("allows OpenRepo upgrades from the owner account", async function () {
    const repo = await deployUUPS("OpenRepoUpgradable", []);
    const factory = await ethers.getContractFactory("OpenRepoUpgradable");

    const upgraded = await upgrades.upgradeProxy(repo.address, factory);

    expect(upgraded.address).to.equal(repo.address);
    expect(await upgraded.name()).to.equal("Open Edge Repository");
  });

  it("rejects protocol entity upgrades from non-hub-owner accounts", async function () {
    const [, outsider] = await ethers.getSigners();
    const { soul } = await deployCoreProtocol();
    const factory = await ethers.getContractFactory("SoulUpgradable", outsider);

    await expect(upgrades.upgradeProxy(soul.address, factory)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });
});
