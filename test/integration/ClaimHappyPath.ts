import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFullProtocol } from "../helpers/deployProtocol";
import {
  impersonateAddress,
  stopImpersonatingAddress,
} from "../helpers/impersonation";
import { makeAction, makeConfirmation, makeEffect, makeRule } from "../helpers/ruleData";
import { test_uri } from "../../utils/consts";

async function createClaimHappyPathFixture() {
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

describe("Claim happy path", function () {
  it("files, decides, closes, and executes confirmed rule effects", async function () {
    const { authority, claim, gameAddress, soul, subjectAddress } =
      await createClaimHappyPathFixture();
    const gameSoul = await soul.tokenByAddress(gameAddress);
    const subjectSoul = await soul.tokenByAddress(subjectAddress);

    const gameSigner = await impersonateAddress(gameAddress);

    await expect(claim.connect(gameSigner).stageFile())
      .to.emit(claim, "Stage")
      .withArgs(1);
    await stopImpersonatingAddress(gameAddress);

    await expect(claim.connect(authority).stageWaitForDecision())
      .to.emit(claim, "Stage")
      .withArgs(2);
    await expect(
      claim.connect(authority).stageDecision([{ ruleId: 1, decision: true }], test_uri)
    )
      .to.emit(claim, "Verdict")
      .withArgs(test_uri, await authority.getAddress());

    expect(await claim.stage()).to.equal(6);
    expect(await claim.decision(1)).to.equal(true);
    expect(await soul.getOpinion(gameSoul, soul.address, subjectSoul, "professional")).to.equal(
      9
    );
  });
});
