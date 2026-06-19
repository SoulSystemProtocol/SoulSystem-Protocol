import { expect } from "chai";
import { deployContract, deployHub, deployUUPS } from "../../utils/deployment";

describe("deployment helpers", function () {
  it("deploys regular contracts", async function () {
    const gameImpl = await deployContract("GameUpgradable", []);

    expect(gameImpl.address).to.match(/^0x[a-fA-F0-9]{40}$/);
  });

  it("deploys UUPS proxies", async function () {
    const repo = await deployUUPS("OpenRepoUpgradable", []);

    expect(await repo.name()).to.equal("Open Edge Repository");
  });

  it("deploys the hub with game, claim, and task beacons", async function () {
    const repo = await deployUUPS("OpenRepoUpgradable", []);
    const hub = await deployHub(repo.address);

    expect(await hub.role()).to.equal("Hub");
    expect(await hub.symbol()).to.equal("HUB");
    expect(await hub.getRepoAddr()).to.equal(repo.address);
  });
});
