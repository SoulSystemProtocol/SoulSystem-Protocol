import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFullProtocol } from "../helpers/deployProtocol";
import { test_uri } from "../../utils/consts";

describe("VotesRepoTrackerUp", function () {
  it("tracks voting unit mint, transfer, and burn for the caller scope", async function () {
    const { soul, votesRepo } = await deployFullProtocol();
    const [, alice, bob] = await ethers.getSigners();
    const aliceAddress = await alice.getAddress();
    const bobAddress = await bob.getAddress();

    await soul.connect(alice).mint(test_uri);
    await soul.connect(bob).mint(test_uri);
    const aliceSoul = await soul.tokenByAddress(aliceAddress);
    const bobSoul = await soul.tokenByAddress(bobAddress);

    expect(await votesRepo.getVotesForToken(aliceSoul)).to.equal(0);
    expect(await votesRepo.getTotalSupply()).to.equal(0);

    await votesRepo.transferVotingUnits(0, aliceSoul, 1);
    expect(await votesRepo.getVotesForToken(aliceSoul)).to.equal(1);
    expect(await votesRepo.getTotalSupply()).to.equal(1);

    await votesRepo.transferVotingUnits(aliceSoul, bobSoul, 1);
    expect(await votesRepo.getVotesForToken(aliceSoul)).to.equal(0);
    expect(await votesRepo.getVotesForToken(bobSoul)).to.equal(1);
    expect(await votesRepo.getTotalSupply()).to.equal(1);

    await votesRepo.transferVotingUnits(bobSoul, 0, 1);
    expect(await votesRepo.getVotesForToken(bobSoul)).to.equal(0);
    expect(await votesRepo.getTotalSupply()).to.equal(0);
  });
});
