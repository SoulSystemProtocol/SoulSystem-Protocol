import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { deployContract } from "../../utils/deployment";
import { test_uri } from "../../utils/consts";
import { deployFullProtocol, FullProtocolDeployment } from "./deployProtocol";
import {
  impersonateAddress,
  stopImpersonatingAddress,
} from "./impersonation";
import { makeAction, makeConfirmation, makeEffect, makeRule } from "./ruleData";

export interface ClaimHappyPathFixture extends FullProtocolDeployment {
  authority: SignerWithAddress;
  authorityAddress: string;
  claim: Contract;
  claimAddress: string;
  game: Contract;
  gameAddress: string;
  ruleId: BigNumber;
  subjectAddress: string;
}

export interface ProjectTaskFixture extends FullProtocolDeployment {
  creator: SignerWithAddress;
  creatorAddress: string;
  gameAddress: string;
  projectGame: Contract;
  task: Contract;
  taskAddress: string;
  token: Contract;
}

export async function createClaimHappyPathFixture(): Promise<ClaimHappyPathFixture> {
  const deployment = await deployFullProtocol();
  const [, creator, subject, authority] = await ethers.getSigners();
  const subjectAddress = await subject.getAddress();
  const authorityAddress = await authority.getAddress();

  const gameAddress = await deployment.hub
    .connect(creator)
    .callStatic.makeGame("COURT", "Claim Happy Path Game", test_uri);
  await deployment.hub.connect(creator).makeGame("COURT", "Claim Happy Path Game", test_uri);

  const game = await ethers.getContractAt("GameUpgradable", gameAddress);
  const action = makeAction();
  const actionGuid = await deployment.actionRepo.callStatic.actionAdd(action, "");
  await deployment.actionRepo.actionAdd(action, "");

  const rule = await makeRule("subject", "ipfs://claim-rule");
  rule.about = actionGuid;
  const ruleId = await game
    .connect(creator)
    .callStatic.ruleAdd(rule, [makeEffect("professional", 9)], makeConfirmation());
  await game.connect(creator).ruleAdd(rule, [makeEffect("professional", 9)], makeConfirmation());

  await deployment.soul.connect(subject).mint(test_uri);
  await deployment.soul.connect(authority).mint(test_uri);

  const gameSigner = await impersonateAddress(gameAddress);
  const hubAsGame = deployment.hub.connect(gameSigner);
  const claimAddress = await hubAsGame.callStatic.makeClaim(
    "CLAIM",
    "Happy Claim",
    test_uri
  );
  await hubAsGame.makeClaim("CLAIM", "Happy Claim", test_uri);

  const claim = await ethers.getContractAt("ClaimUpgradable", claimAddress);
  await deployment.dataRepo.connect(gameSigner).addressAdd("claim", claimAddress);
  await claim.connect(gameSigner).roleAssign(subjectAddress, "subject", 1);
  await claim.connect(gameSigner).roleAssign(authorityAddress, "authority", 1);
  await claim.connect(gameSigner).ruleRefAdd(gameAddress, ruleId);
  await stopImpersonatingAddress(gameAddress);

  return {
    ...deployment,
    authority,
    authorityAddress,
    claim,
    claimAddress,
    game,
    gameAddress,
    ruleId,
    subjectAddress,
  };
}

export async function createProjectTask(
  nativeFunding = BigNumber.from(0)
): Promise<ProjectTaskFixture> {
  const deployment = await deployFullProtocol();
  const [, creator] = await ethers.getSigners();
  const creatorAddress = await creator.getAddress();
  const projectExt = await deployContract("ProjectExt", []);
  await deployment.hub.assocAdd("GAME_PROJECT", projectExt.address);

  const gameAddress = await deployment.hub
    .connect(creator)
    .callStatic.makeGame("PROJECT", "Escrow Project", test_uri);
  await deployment.hub.connect(creator).makeGame("PROJECT", "Escrow Project", test_uri);

  const projectGame = await ethers.getContractAt("ProjectExt", gameAddress);
  const taskAddress = await projectGame
    .connect(creator)
    .callStatic.makeTask("TASK", "Escrow Task", test_uri, {
      value: nativeFunding,
    });
  await projectGame.connect(creator).makeTask("TASK", "Escrow Task", test_uri, {
    value: nativeFunding,
  });

  const task = await ethers.getContractAt("TaskUpgradable", taskAddress);
  const token = await deployContract("Token", []);

  return {
    ...deployment,
    creator,
    creatorAddress,
    gameAddress,
    projectGame,
    task,
    taskAddress,
    token,
  };
}
