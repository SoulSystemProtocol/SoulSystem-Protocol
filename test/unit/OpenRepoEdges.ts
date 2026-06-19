import { expect } from "chai";
import { ethers } from "hardhat";
import { deployUUPS } from "../../utils/deployment";
import { ZERO_ADDRESS } from "../helpers/addresses";

describe("OpenRepoUpgradable edge behavior", function () {
  it("preserves duplicate address entries and removes one selected entry", async function () {
    const [owner, second] = await ethers.getSigners();
    const repo = await deployUUPS("OpenRepoUpgradable", []);
    const ownerAddress = await owner.getAddress();
    const secondAddress = await second.getAddress();

    await repo.addressAdd("game", ownerAddress);
    await repo.addressAdd("game", ownerAddress);
    await repo.addressAdd("game", secondAddress);

    expect(await repo.addressGetAll("game")).to.deep.equal([
      ownerAddress,
      ownerAddress,
      secondAddress,
    ]);

    await repo.addressRemove("game", ownerAddress);

    const values = await repo.addressGetAll("game");
    expect(values).to.have.length(2);
    expect(values).to.include(ownerAddress);
    expect(values).to.include(secondAddress);
  });

  it("reverts when removing a missing address value", async function () {
    const [owner] = await ethers.getSigners();
    const repo = await deployUUPS("OpenRepoUpgradable", []);

    await expect(repo.addressRemove("missing", await owner.getAddress())).to.be.revertedWith(
      "AddressArray:ITEM_NOT_IN_ARRAY"
    );
  });

  it("keeps address arrays isolated by caller scope", async function () {
    const [owner, other, target] = await ethers.getSigners();
    const repo = await deployUUPS("OpenRepoUpgradable", []);
    const ownerAddress = await owner.getAddress();
    const targetAddress = await target.getAddress();

    await repo.addressAdd("member", ownerAddress);
    await repo.connect(other).addressAdd("member", targetAddress);

    expect(await repo.addressGetAll("member")).to.deep.equal([ownerAddress]);
    expect(await repo.connect(other).addressGetAll("member")).to.deep.equal([
      targetAddress,
    ]);
    expect(await repo.addressGetOf(await other.getAddress(), "member")).to.equal(
      targetAddress
    );
  });

  it("overwrites scalar values with set operations", async function () {
    const repo = await deployUUPS("OpenRepoUpgradable", []);

    await repo.stringSet("type", "MDAO");
    await repo.stringSet("type", "PROJECT");
    await repo.boolSet("isClosed", false);
    await repo.boolSet("isClosed", true);
    await repo.uintSet("score", 7);
    await repo.uintSet("score", 11);

    expect(await repo.stringGet("type")).to.equal("PROJECT");
    expect(await repo.boolGet("isClosed")).to.equal(true);
    expect(await repo.uintGet("score")).to.equal(11);
  });

  it("returns empty defaults for missing scalar and address values", async function () {
    const repo = await deployUUPS("OpenRepoUpgradable", []);

    expect(await repo.addressGet("missing")).to.equal(ZERO_ADDRESS);
    expect(await repo.stringGet("missing")).to.equal("");
    expect(await repo.boolGet("missing")).to.equal(false);
    expect(await repo.uintGet("missing")).to.equal(0);
  });
});
