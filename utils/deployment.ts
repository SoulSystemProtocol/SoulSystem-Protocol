import { Contract } from "ethers";
import { run } from "hardhat";
import { ethers } from "hardhat";
import contractAddrs from "../scripts/_contractAddr";
import { ZERO_ADDR } from "../utils/consts";
// import { deployments, ethers } from "hardhat"
const { upgrades } = require("hardhat");
const hre = require("hardhat");
const chain = hre.hardhatArguments.network;
const contractAddr = contractAddrs[chain];
const shouldLogDeployment = Boolean(chain && chain !== "hardhat");
const deploymentLog = (...args: unknown[]) => {
  if (shouldLogDeployment) {
    console.log(...args);
  }
};

// export const deployRepoRules = async (contractAddress: string, args: any[]) => {
// }

/// Deploy Regular Contrac
export const deployContract = async (contractName: string, args: any[]) => {
  return await ethers.getContractFactory(contractName).then(res => res.deploy(args));
}

/// Deploy Upgradable Contract (UUPS)
export const deployUUPS = async (contractName: string, args: any[]) => {
  return await ethers.getContractFactory(contractName)
    .then(Contract => upgrades.deployProxy(Contract, args, {kind: "uups", timeout: 120000}));
}

/// Deploy Game Extensions
export const deployGameExt = async (hubContract: Contract) => {
  let verification:any = [];
  deploymentLog("Start Deploying Game Extensions...");

  /* [mumbai] FAILS W/reason: 'replacement fee too low', code: 'REPLACEMENT_UNDERPRICED', */
  // if(chain!=='mumbai'){
    //Game Extension: Court of Law
    await deployContract("CourtExt", []).then(async res => {
      deploymentLog("(i) Deployed Game Extension: CourtExt", res.address);
      verification.push({name:"CourtExt", address:res.address, params:[]});
      await hubContract.assocSet("GAME_COURT", res.address);
    });
  // }
  
  //Game Extension: mDAO
  await deployContract("MicroDAOExt", []).then(async res => {
    deploymentLog("(i) Deployed Game Extension: MicroDAOExt", res.address);
    verification.push({name:"MicroDAOExt", address:res.address, params:[]});
    await hubContract.assocSet("GAME_MDAO", res.address);
  });
  //Game Extension: Project
  await deployContract("ProjectExt", []).then(async res => {
    deploymentLog("(i) Deployed Game Extension: ProjectExt", res.address);
    verification.push({name:"ProjectExt", address:res.address, params:[]});
    await hubContract.assocSet("GAME_PROJECT", res.address);
  });
  //Game Extension: Fund Management
  await deployContract("FundManExt", []).then(async res => {
    deploymentLog("(i) Deployed Game Extension: FundManExt", res.address);
    verification.push({name:"FundManExt", address:res.address, params:[]});
    // await hubContract.assocAdd("GAME_DAO", res.address);
    await hubContract.assocAdd("GAME_MDAO", res.address);
    await hubContract.assocAdd("GAME_PROJECT", res.address);
  });
  
  //Game Extension: Votes Support
  await deployContract("VotesExt", []).then(async res => {
    deploymentLog("(i) Deployed Game Extension: VotesExt", res.address);
    verification.push({name:"VotesExt", address:res.address, params:[]});
    await hubContract.assocAdd("GAME_MDAO", res.address);
  });
  

  //[WIP] Game Extension: Actions
  await deployContract("ActionExt", []).then(async res => {
    deploymentLog("(i) Deployed Game Extension: ActionExt", res.address);
    verification.push({name:"ActionExt", address:res.address, params:[]});
    await hubContract.assocAdd("GAME_MDAO", res.address);
  });
  


  //Verify Contracts
  for(let item of verification){
    await verify(item.address, item.params);
  }
}

/// Deploy Hub
export const deployHub = async (openRepoAddress: String) => {
  
    //--- Game Upgradable Implementation
    let gameUpContract = await deployContract("GameUpgradable", []);

    //--- Claim Implementation
    let claimContract = await deployContract("ClaimUpgradable", []);
    
    //--- Task Implementation
    let taskContract = await deployContract("TaskUpgradable", []);
    
    //--- Hub Upgradable (UUPS)
    let hubContract = await deployUUPS("HubUpgradable", [
      openRepoAddress,
        gameUpContract.address, 
        claimContract.address,
        taskContract.address,
      ]);
    await hubContract.deployed();
    //Return
    return hubContract;
}

/**
 * Set / Update Hub Assoc
 */
export const hubAssocUpdate = async () => {
  let hubContract = await ethers.getContractFactory("HubUpgradable").then(res => res.attach(contractAddr.hub));
  if(hubContract){
    console.log("Validate Hub ", hubContract.address);
    let assoc: any = {};
    assoc.sbt = await hubContract.assocGet("SBT");
    // console.log("Hub: ", hubContract.address, " Assoc:", assoc, contractAddr);
    if(assoc.sbt != contractAddr.avatar){
      await hubContract.assocSet("SBT", contractAddr.avatar);
      console.log("Hub: Updated SBT to: ", contractAddr.avatar);
    }
    assoc.history = await hubContract.assocGet("action");
    if(assoc.history == contractAddr.history){
      await hubContract.assocSet("action", contractAddr.history);
      console.log("Hub: Updated History to: ", contractAddr.history);
    }
    // else console.log("Not the same", contractAddr.history, ZERO_ADDR, (assoc.history == ZERO_ADDR));
  }
  else console.error("Failed to attach to Hub Contract at: " +contractAddr.hub);
}

/// Verify Contract on Etherscan
export const verify = async (contractAddress: string, args: any[]) => {
  if(!!chain && chain ! in ['aurora_test','aurora_plus','aurora']){
    // console.log("Verifying contract...")
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    })
    .catch(error => {
      if (error.message.toLowerCase().includes("already verified")) {
        console.log("Contract already verified");
      } else {
        console.log("[CAUGHT] Verification Error on Chain:"+chain, error);
      }
    });
  }
  // else console.log("Skip verification on Chain:"+chain);
}
