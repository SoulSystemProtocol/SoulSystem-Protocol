import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFullProtocol } from "../helpers/deployProtocol";
import { makeAction, makeConfirmation, makeEffect, makeRule } from "../helpers/ruleData";
import { test_uri } from "../../utils/consts";

async function createRuleGame() {
  const deployment = await deployFullProtocol();
  const [, creator] = await ethers.getSigners();
  const creatorAddress = await creator.getAddress();
  const gameAddress = await deployment.hub
    .connect(creator)
    .callStatic.makeGame("MDAO", "Rule Game", test_uri);
  await deployment.hub.connect(creator).makeGame("MDAO", "Rule Game", test_uri);
  const game = await ethers.getContractAt("GameUpgradable", gameAddress);

  const action = makeAction();
  const actionGuid = await deployment.actionRepo.callStatic.actionAdd(action, "");
  await deployment.actionRepo.actionAdd(action, "");

  return { ...deployment, creator, creatorAddress, game, gameAddress, actionGuid };
}

describe("Rule effects", function () {
  it("lets game admins add rules and read stored rule data", async function () {
    const { game, creator, actionGuid } = await createRuleGame();
    const rule = await makeRule("subject", "ipfs://rule-admin");
    const effect = makeEffect("professional", 5);
    const confirmation = makeConfirmation();
    rule.about = actionGuid;

    const ruleId = await game.connect(creator).callStatic.ruleAdd(rule, [effect], confirmation);
    await game.connect(creator).ruleAdd(rule, [effect], confirmation);

    const storedRule = await game.ruleGet(ruleId);
    const storedEffects = await game.effectsGet(ruleId);
    const storedConfirmation = await game.confirmationGet(ruleId);

    expect(storedRule.about).to.equal(actionGuid);
    expect(storedRule.affected).to.equal("subject");
    expect(storedRule.uri).to.equal("ipfs://rule-admin");
    expect(storedRule.disabled).to.equal(false);
    expect(storedEffects).to.have.length(1);
    expect(storedEffects[0].domain).to.equal("professional");
    expect(storedEffects[0].value).to.equal(5);
    expect(storedEffects[0].disabled).to.equal(false);
    expect(storedConfirmation.ruling).to.equal("authority");
    expect(storedConfirmation.evidence).to.equal(false);
    expect(storedConfirmation.quorum).to.equal(0);
  });

  it("rejects rule creation from non-admin accounts", async function () {
    const { game, actionGuid } = await createRuleGame();
    const [, , outsider] = await ethers.getSigners();
    const rule = await makeRule("subject", "ipfs://rule-outsider");
    rule.about = actionGuid;

    await expect(
      game.connect(outsider).ruleAdd(rule, [makeEffect()], makeConfirmation())
    ).to.be.revertedWith("Admin Only");
  });

  it("executes rule effects through authority-confirmed events", async function () {
    const { game, soul, creator, gameAddress, actionGuid } = await createRuleGame();
    const [, , authority, target] = await ethers.getSigners();
    const authorityAddress = await authority.getAddress();
    const targetAddress = await target.getAddress();
    const rule = await makeRule("subject", "ipfs://rule-effect");
    const effect = makeEffect("professional", 5);
    rule.about = actionGuid;

    const ruleId = await game
      .connect(creator)
      .callStatic.ruleAdd(rule, [effect], makeConfirmation());
    await game.connect(creator).ruleAdd(rule, [effect], makeConfirmation());

    await soul.connect(authority).mint(test_uri);
    await soul.connect(target).mint(test_uri);
    await game.connect(creator).roleAssign(authorityAddress, "authority", 1);

    const gameSoul = await soul.tokenByAddress(gameAddress);
    const targetSoul = await soul.tokenByAddress(targetAddress);

    await game.connect(authority).reportEvent(ruleId, targetAddress, test_uri);

    expect(
      await soul.getOpinion(gameSoul, soul.address, targetSoul, "professional")
    ).to.equal(5);
  });
});
