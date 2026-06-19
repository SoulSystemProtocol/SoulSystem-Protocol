import { ethers, upgrades } from "hardhat";

const upgradeableContracts = [
  "HubUpgradable",
  "SoulUpgradable",
  "OpenRepoUpgradable",
  "ActionRepoTrackerUp",
  "VotesRepoTrackerUp",
  "VotesRepoTrackerUpInt",
  "VotesRoleRepoTrackerUp",
];

describe("Storage layout validation", function () {
  for (const contractName of upgradeableContracts) {
    it(`keeps ${contractName} compatible with the current upgrade safety gate`, async function () {
      const factory = await ethers.getContractFactory(contractName);
      await upgrades.validateImplementation(factory, { kind: "uups" });
    });
  }
});
