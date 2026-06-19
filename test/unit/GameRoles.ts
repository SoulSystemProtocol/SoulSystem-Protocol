import { expect } from "chai";
import { ethers } from "hardhat";
import { deployCoreProtocol } from "../helpers/deployProtocol";
import { test_uri } from "../../utils/consts";

async function createGame(type = "MDAO", name = "Role Test Game") {
  const deployment = await deployCoreProtocol();
  const [owner, member] = await ethers.getSigners();
  const gameAddress = await deployment.hub
    .connect(member)
    .callStatic.makeGame(type, name, test_uri);

  await deployment.hub.connect(member).makeGame(type, name, test_uri);

  const game = await ethers.getContractAt("GameUpgradable", gameAddress);

  return { ...deployment, owner, member, game, gameAddress };
}

describe("GameUpgradable roles", function () {
  it("assigns creator admin and member roles", async function () {
    const { member, game } = await createGame();
    const memberAddress = await member.getAddress();

    expect(await game.roleHas(memberAddress, "admin")).to.equal(true);
    expect(await game.roleHas(memberAddress, "member")).to.equal(true);
    expect(await game.roleExist("authority")).to.equal(true);
  });

  it("lets another account join and leave the member role", async function () {
    const { game, soul } = await createGame();
    const [, , joiner] = await ethers.getSigners();
    const joinerAddress = await joiner.getAddress();

    await soul.connect(joiner).mint(test_uri);

    expect(await game.roleHas(joinerAddress, "member")).to.equal(false);

    await game.connect(joiner).join();
    expect(await game.roleHas(joinerAddress, "member")).to.equal(true);

    await game.connect(joiner).leave();
    expect(await game.roleHas(joinerAddress, "member")).to.equal(false);
  });

  it("rejects join when game is closed", async function () {
    const { game } = await createGame();
    const [, , joiner] = await ethers.getSigners();

    await game.confSet("isClosed", "true");

    await expect(game.connect(joiner).join()).to.be.revertedWith("CLOSED_SPACE");
  });
});
