import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFullProtocol } from "../helpers/deployProtocol";
import {
  impersonateAddress,
  stopImpersonatingAddress,
} from "../helpers/impersonation";
import { test_uri } from "../../utils/consts";

async function createClaim() {
  const deployment = await deployFullProtocol();
  const gameAddress = await deployment.hub.callStatic.makeGame(
    "PROJECT",
    "Claims Game",
    test_uri
  );
  await deployment.hub.makeGame("PROJECT", "Claims Game", test_uri);

  const gameSigner = await impersonateAddress(gameAddress);
  const hubAsGame = deployment.hub.connect(gameSigner);
  const claimAddress = await hubAsGame.callStatic.makeClaim(
    "CLAIM",
    "Claim One",
    test_uri
  );
  await hubAsGame.makeClaim("CLAIM", "Claim One", test_uri);
  await stopImpersonatingAddress(gameAddress);

  const claim = await ethers.getContractAt("ClaimUpgradable", claimAddress);
  const game = await ethers.getContractAt("GameUpgradable", gameAddress);
  return { ...deployment, game, gameAddress, claim, claimAddress };
}

describe("Claim lifecycle", function () {
  it("starts claims in draft stage", async function () {
    const { claim } = await createClaim();

    expect(await claim.stage()).to.equal(0);
  });

  it("rejects filing without a subject", async function () {
    const { claim, gameAddress } = await createClaim();
    const gameSigner = await impersonateAddress(gameAddress);

    await expect(claim.connect(gameSigner).stageFile()).to.be.revertedWith(
      "ROLE:MISSING_SUBJECT"
    );

    await stopImpersonatingAddress(gameAddress);
  });

  it("rejects unauthorized stage transitions before the claim is open", async function () {
    const { claim } = await createClaim();
    const [, outsider] = await ethers.getSigners();

    await expect(claim.connect(outsider).stageWaitForDecision()).to.be.revertedWith(
      "STAGE:OPEN_ONLY"
    );
  });
});
