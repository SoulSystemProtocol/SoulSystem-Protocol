import { ethers, upgrades } from "hardhat";

describe("UUPS upgradeability validation", function () {
  for (const contractName of [
    "HubUpgradable",
    "SoulUpgradable",
    "OpenRepoUpgradable",
    "ActionRepoTrackerUp",
    "VotesRepoTrackerUp",
    "VotesRepoTrackerUpInt",
    "VotesRoleRepoTrackerUp",
  ]) {
    it(`validates ${contractName} as upgrade safe`, async function () {
      const factory = await ethers.getContractFactory(contractName);
      await upgrades.validateImplementation(factory, { kind: "uups" });
    });
  }
});
