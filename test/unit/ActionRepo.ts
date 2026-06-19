import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFullProtocol } from "../helpers/deployProtocol";
import { makeAction } from "../helpers/ruleData";

describe("ActionRepoTrackerUp", function () {
  it("hashes semantic actions deterministically", async function () {
    const { actionRepo } = await deployFullProtocol();
    const action = makeAction();

    expect(await actionRepo.actionHash(action)).to.equal(await actionRepo.actionHash(action));
  });

  it("stores and reads semantic actions and metadata", async function () {
    const { actionRepo } = await deployFullProtocol();
    const action = makeAction();
    const guid = await actionRepo.callStatic.actionAdd(action, "ipfs://action");

    await actionRepo.actionAdd(action, "ipfs://action");

    const stored = await actionRepo.actionGet(guid);
    const [subject, object, verb, tool] = await actionRepo.actionGetStr(guid);

    expect(stored.subject).to.equal(action.subject);
    expect(stored.verb).to.equal(action.verb);
    expect(stored.object).to.equal(action.object);
    expect(stored.tool).to.equal(action.tool);
    expect(subject).to.equal(action.subject);
    expect(object).to.equal(action.object);
    expect(verb).to.equal(action.verb);
    expect(tool).to.equal(action.tool);
    expect(await actionRepo.actionGetURI(guid)).to.equal("ipfs://action");

    await actionRepo.actionSetURI(guid, "ipfs://updated-action");

    expect(await actionRepo.actionGetURI(guid)).to.equal("ipfs://updated-action");
  });

  it("rejects duplicate semantic actions", async function () {
    const { actionRepo } = await deployFullProtocol();
    const action = makeAction();

    await actionRepo.actionAdd(action, "");

    await expect(actionRepo.actionAdd(action, "")).to.be.revertedWith(
      "Action Already Exists"
    );
  });

  it("rejects reads for unknown GUIDs", async function () {
    const { actionRepo } = await deployFullProtocol();
    const unknownGuid = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("missing"));

    await expect(actionRepo.actionGet(unknownGuid)).to.be.revertedWith("INEXISTENT_GUID");
    await expect(actionRepo.actionGetURI(unknownGuid)).to.be.revertedWith(
      "INEXISTENT_GUID"
    );
  });

  it("documents current batch-add boundary", async function () {
    const { actionRepo } = await deployFullProtocol();
    const actions = [
      makeAction(),
      { subject: "authority", verb: "review", object: "claim", tool: "game" },
    ];

    await expect(actionRepo.actionAddBatch(actions, ["", ""])).to.be.reverted;
  });
});
