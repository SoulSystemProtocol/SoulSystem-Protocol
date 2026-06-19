import { expect } from "chai";
import { ethers } from "hardhat";
import { deployCoreProtocol } from "../helpers/deployProtocol";
import { test_uri, test_uri2 } from "../../utils/consts";

describe("SoulUpgradable", function () {
  it("mints one soulbound token per account", async function () {
    const [, alice] = await ethers.getSigners();
    const aliceAddress = await alice.getAddress();
    const { soul } = await deployCoreProtocol();

    const tokenId = await soul.connect(alice).callStatic.mint(test_uri);
    await soul.connect(alice).mint(test_uri);

    expect(await soul.tokenByAddress(aliceAddress)).to.equal(tokenId);
    expect(await soul.balanceOf(aliceAddress)).to.equal(1);
    expect(await soul.tokenURI(tokenId)).to.equal(test_uri);
    await expect(soul.connect(alice).mint(test_uri2)).to.be.revertedWith(
      "Account already has a token"
    );
  });

  it("prevents normal account transfers", async function () {
    const [, alice, bob] = await ethers.getSigners();
    const aliceAddress = await alice.getAddress();
    const bobAddress = await bob.getAddress();
    const { soul } = await deployCoreProtocol();

    const tokenId = await soul.connect(alice).callStatic.mint(test_uri);
    await soul.connect(alice).mint(test_uri);

    await expect(
      soul.connect(alice).transferFrom(aliceAddress, bobAddress, tokenId)
    ).to.be.revertedWith("SOUL:NON_TRANSFERABLE");
  });

  it("sets and resolves unique handles", async function () {
    const [, alice] = await ethers.getSigners();
    const { soul } = await deployCoreProtocol();

    const tokenId = await soul.connect(alice).callStatic.mint(test_uri);
    await soul.connect(alice).mint(test_uri);
    await soul.connect(alice).handleSet(tokenId, "alice");

    expect(await soul.handleGet(tokenId)).to.equal("alice");
    expect(await soul.handleFind("alice")).to.equal(tokenId);
  });

  it("rejects duplicate handles", async function () {
    const [, alice, bob] = await ethers.getSigners();
    const bobAddress = await bob.getAddress();
    const { soul } = await deployCoreProtocol();

    const aliceToken = await soul.connect(alice).callStatic.mint(test_uri);
    await soul.connect(alice).mint(test_uri);
    await soul.connect(alice).handleSet(aliceToken, "alice");

    await soul.connect(bob).mint(test_uri2);
    const bobToken = await soul.tokenByAddress(bobAddress);

    await expect(soul.connect(bob).handleSet(bobToken, "alice")).to.be.revertedWith(
      "HANDLE_TAKEN"
    );
  });

  it("lets a token controller add a secondary owner", async function () {
    const [, alice, secondary] = await ethers.getSigners();
    const secondaryAddress = await secondary.getAddress();
    const { soul } = await deployCoreProtocol();

    const tokenId = await soul.connect(alice).callStatic.mint(test_uri);
    await soul.connect(alice).mint(test_uri);
    await soul.connect(alice).addSecondaryOwner(secondaryAddress, tokenId);

    expect(await soul.tokenByAddress(secondaryAddress)).to.equal(tokenId);
    expect(await soul.balanceOf(secondaryAddress)).to.equal(1);
  });
});
