import { expect } from "chai";
import { ethers } from "hardhat";
import { deployUUPS } from "../../utils/deployment";
import { ZERO_ADDRESS } from "../helpers/addresses";

describe("OpenRepoUpgradable", function () {
  it("sets and returns the first address value for the caller scope", async function () {
    const [owner] = await ethers.getSigners();
    const repo = await deployUUPS("OpenRepoUpgradable", []);
    const ownerAddress = await owner.getAddress();

    await repo.addressSet("SBT", ownerAddress);

    expect(await repo.addressGet("SBT")).to.equal(ownerAddress);
  });

  it("adds multiple address values and removes only the selected value", async function () {
    const [owner, second] = await ethers.getSigners();
    const repo = await deployUUPS("OpenRepoUpgradable", []);
    const ownerAddress = await owner.getAddress();
    const secondAddress = await second.getAddress();

    await repo.addressSet("game", ownerAddress);
    await repo.addressAdd("game", secondAddress);
    await repo.addressRemove("game", ownerAddress);

    expect(await repo.addressGet("game")).to.equal(secondAddress);
    expect(await repo.addressHas("game", ownerAddress)).to.equal(false);
    expect(await repo.addressHas("game", secondAddress)).to.equal(true);
  });

  it("keeps values isolated by caller address", async function () {
    const [owner, other] = await ethers.getSigners();
    const repo = await deployUUPS("OpenRepoUpgradable", []);
    const ownerAddress = await owner.getAddress();

    await repo.addressSet("SBT", ownerAddress);

    expect(await repo.connect(other).addressGet("SBT")).to.equal(ZERO_ADDRESS);
  });

  it("sets and reads strings, booleans, and uints", async function () {
    const repo = await deployUUPS("OpenRepoUpgradable", []);

    await repo.stringSet("type", "MDAO");
    await repo.boolSet("isClosed", true);
    await repo.uintSet("score", 7);

    expect(await repo.stringGet("type")).to.equal("MDAO");
    expect(await repo.boolGet("isClosed")).to.equal(true);
    expect(await repo.uintGet("score")).to.equal(7);
  });
});
