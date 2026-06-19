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

  it("routes selectors across multiple registered extensions for one game type", async function () {
    const deployment = await deployFullProtocol();
    const actionExt = await deployContract("ActionExt", []);
    const votesExt = await deployContract("VotesExt", []);
    await deployment.hub.assocAdd("GAME_MDAO", votesExt.address);
    await deployment.hub.assocAdd("GAME_MDAO", actionExt.address);

    const [, voter] = await ethers.getSigners();
    const voterAddress = await voter.getAddress();
    const gameAddress = await deployment.hub.callStatic.makeGame(
      "MDAO",
      "Multi Extension Game",
      test_uri
    );
    await deployment.hub.makeGame("MDAO", "Multi Extension Game", test_uri);

    await deployment.soul.connect(voter).mint(test_uri);
    const game = await ethers.getContractAt("GameUpgradable", gameAddress);
    await game.connect(voter).join();

    const actionGame = await ethers.getContractAt("ActionExt", gameAddress);
    const votesGame = await ethers.getContractAt("VotesExt", gameAddress);

    expect(await actionGame.test()).to.equal("WORKS");
    expect(await votesGame.getVotes(voterAddress)).to.equal(1);
  });
});
