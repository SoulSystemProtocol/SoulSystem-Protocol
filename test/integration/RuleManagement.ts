import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFullProtocol } from "../helpers/deployProtocol";
import { makeAction, makeConfirmation, makeEffect, makeRule } from "../helpers/ruleData";
import { test_uri } from "../../utils/consts";

async function createRuleFixture() {
  const deployment = await deployFullProtocol();
  const [, creator, outsider] = await ethers.getSigners();
  const gameAddress = await deployment.hub
    .connect(creator)
    .callStatic.makeGame("MDAO", "Rule Management Game", test_uri);
  await deployment.hub.connect(creator).makeGame("MDAO", "Rule Management Game", test_uri);
  const game = await ethers.getContractAt("GameUpgradable", gameAddress);

  const action = makeAction();
  const actionGuid = await deployment.actionRepo.callStatic.actionAdd(action, "");
  await deployment.actionRepo.actionAdd(action, "");

  const rule = await makeRule("subject", "ipfs://managed-rule");
  rule.about = actionGuid;
  const ruleId = await game
    .connect(creator)
    .callStatic.ruleAdd(rule, [makeEffect("professional", 5)], makeConfirmation());
  await game.connect(creator).ruleAdd(rule, [makeEffect("professional", 5)], makeConfirmation());

  return { ...deployment, creator, outsider, game, gameAddress, ruleId };
}

describe("Rule management", function () {
  it("rejects rule updates from non-admin accounts", async function () {
    const { game, outsider, ruleId } = await createRuleFixture();

    await expect(
      game.connect(outsider).ruleUpdateURI(ruleId, "ipfs://outsider")
    ).to.be.revertedWith("Admin Only");
    await expect(
      game.connect(outsider).ruleUpdateEffects(ruleId, [makeEffect("community", 2)])
    ).to.be.revertedWith("Admin Only");
    await expect(
      game.connect(outsider).ruleUpdateConditions(ruleId, [
        {
          repo: "action",
          id: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("condition")),
        },
      ])
    ).to.be.revertedWith("Admin Only");
    await expect(
      game.connect(outsider).ruleUpdateConfirmation(ruleId, {
        ruling: "jury",
        evidence: true,
        quorum: 2,
      })
    ).to.be.revertedWith("Admin Only");
    await expect(game.connect(outsider).ruleDisable(ruleId, true)).to.be.revertedWith(
      "Admin Only"
    );
  });

  it("lets admins update rule data and reads the updated values", async function () {
    const { game, creator, ruleId } = await createRuleFixture();
    const conditionId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("condition"));

    await game.connect(creator).ruleUpdateURI(ruleId, "ipfs://updated-rule");
    await game.connect(creator).ruleUpdateEffects(ruleId, [makeEffect("community", -3)]);
    await game.connect(creator).ruleUpdateConditions(ruleId, [
      {
        repo: "action",
        id: conditionId,
      },
    ]);
    await game.connect(creator).ruleUpdateConfirmation(ruleId, {
      ruling: "jury",
      evidence: true,
      quorum: 2,
    });
    await game.connect(creator).ruleDisable(ruleId, true);

    const storedRule = await game.ruleGet(ruleId);
    const effects = await game.effectsGet(ruleId);
    const conditions = await game.conditionsGet(ruleId);
    const confirmation = await game.confirmationGet(ruleId);

    expect(storedRule.uri).to.equal("ipfs://updated-rule");
    expect(storedRule.disabled).to.equal(true);
    expect(effects).to.have.length(1);
    expect(effects[0].domain).to.equal("community");
    expect(effects[0].value).to.equal(-3);
    expect(conditions).to.have.length(1);
    expect(conditions[0].repo).to.equal("action");
    expect(conditions[0].id).to.equal(conditionId);
    expect(confirmation.ruling).to.equal("jury");
    expect(confirmation.evidence).to.equal(true);
    expect(confirmation.quorum).to.equal(2);
  });
});
