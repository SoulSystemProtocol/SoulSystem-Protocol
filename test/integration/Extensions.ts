import { expect } from "chai";
import { ethers } from "hardhat";
import { deployContract } from "../../utils/deployment";
import { deployFullProtocol } from "../helpers/deployProtocol";
import { test_uri } from "../../utils/consts";

async function createGame(type = "NOEXT") {
  const deployment = await deployFullProtocol();
  const gameAddress = await deployment.hub.callStatic.makeGame(
    type,
    "Extension Game",
    test_uri
  );
  await deployment.hub.makeGame(type, "Extension Game", test_uri);
  const game = await ethers.getContractAt("GameUpgradable", gameAddress);
  return { ...deployment, game, gameAddress };
}

describe("Game extension routing", function () {
  it("reverts routed extension calls when no extension is registered", async function () {
    const { gameAddress } = await createGame("NOEXT");
    const actionGame = await ethers.getContractAt("ActionExt", gameAddress);

    await expect(actionGame.test()).to.be.revertedWith("NO_FALLBACK_CONTRACTS");
  });

  it("routes calls through registered game extensions", async function () {
    const deployment = await deployFullProtocol();
    const actionExt = await deployContract("ActionExt", []);
    await deployment.hub.assocAdd("GAME_MDAO", actionExt.address);

    const gameAddress = await deployment.hub.callStatic.makeGame(
      "MDAO",
      "Extension Game",
      test_uri
    );
    await deployment.hub.makeGame("MDAO", "Extension Game", test_uri);

    const actionGame = await ethers.getContractAt("ActionExt", gameAddress);

    expect(await actionGame.test()).to.equal("WORKS");
  });
});
