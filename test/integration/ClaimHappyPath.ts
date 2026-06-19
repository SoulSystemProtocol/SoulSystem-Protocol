import { expect } from "chai";
import { ethers } from "hardhat";
import {
  impersonateAddress,
  stopImpersonatingAddress,
} from "../helpers/impersonation";
import { createClaimHappyPathFixture } from "../helpers/procedureFixtures";
import { test_uri } from "../../utils/consts";

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
