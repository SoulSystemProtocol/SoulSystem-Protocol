import { expect } from "chai";
import { deployFullProtocol } from "../helpers/deployProtocol";

describe("Protocol deployment flow", function () {
  it("deploys core contracts and registers required associations", async function () {
    const { dataRepo, hub, soul, ruleRepo, actionRepo, votesRepo } =
      await deployFullProtocol();

    expect(await hub.getRepoAddr()).to.equal(dataRepo.address);
    expect(await hub.assocGet("SBT")).to.equal(soul.address);
    expect(await hub.assocGet("RULE_REPO")).to.equal(ruleRepo.address);
    expect(await hub.assocGet("action")).to.equal(actionRepo.address);
    expect(await hub.assocGet("VOTES_REPO")).to.equal(votesRepo.address);
  });
});
