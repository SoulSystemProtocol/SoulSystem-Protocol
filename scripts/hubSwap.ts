// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

import { ethers } from "hardhat";
const { upgrades } = require("hardhat");
const hre = require("hardhat");
const chain = hre.hardhatArguments.network;

import contractAddrs from "./_contractAddr";
const contractAddr = contractAddrs[chain];

let oldHubAddr = "0x9956b603Eb5A081d23721e5e0c8839257A92c499";

/**
 * Migrate Contracts Between Hubs
 */
async function main() {
  
    //Old Hub
    let oldHubContract = await ethers.getContractFactory("HubUpgradable").then(res => res.attach(oldHubAddr));
    //Move Asset Contracts to new Hub
    oldHubContract.hubChange(contractAddr.hub);

    //New Hub
    let hubContract = await ethers.getContractFactory("HubUpgradable").then(res => res.attach(contractAddr.hub));
    //Set Contract Associations
    await hubContract.assocSet("SBT", contractAddr.avatar);
    await hubContract.assocSet("action", contractAddr.history);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
