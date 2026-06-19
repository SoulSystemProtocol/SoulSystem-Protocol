import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFullProtocol } from "../helpers/deployProtocol";
import {
  impersonateAddress,
  stopImpersonatingAddress,
} from "../helpers/impersonation";
import { test_uri } from "../../utils/consts";

async function createVotingGame() {
  const deployment = await deployFullProtocol();
  const [, creator] = await ethers.getSigners();
  const gameAddress = await deployment.hub
    .connect(creator)
    .callStatic.makeGame("MDAO", "Voting Game", test_uri);
  await deployment.hub.connect(creator).makeGame("MDAO", "Voting Game", test_uri);
  const game = await ethers.getContractAt("GameUpgradable", gameAddress);
  return { ...deployment, creator, game, gameAddress };
}

describe("Voting power integration", function () {
  it("tracks member-role voting power when a user joins and leaves", async function () {
    const { game, gameAddress, soul, votesRepo } = await createVotingGame();
    const [, , member] = await ethers.getSigners();
    const memberAddress = await member.getAddress();

    await soul.connect(member).mint(test_uri);
    const memberSoul = await soul.tokenByAddress(memberAddress);
    const gameSigner = await impersonateAddress(gameAddress);
    const votesRepoAsGame = votesRepo.connect(gameSigner);

    expect(await votesRepoAsGame.getVotesForToken(memberSoul)).to.equal(0);
    expect(await votesRepoAsGame.getTotalSupply()).to.equal(1);

    await game.connect(member).join();
    expect(await votesRepoAsGame.getVotesForToken(memberSoul)).to.equal(1);
    expect(await votesRepoAsGame.getTotalSupply()).to.equal(2);

    await game.connect(member).leave();
    expect(await votesRepoAsGame.getVotesForToken(memberSoul)).to.equal(0);
    expect(await votesRepoAsGame.getTotalSupply()).to.equal(1);

    await stopImpersonatingAddress(gameAddress);
  });
});
