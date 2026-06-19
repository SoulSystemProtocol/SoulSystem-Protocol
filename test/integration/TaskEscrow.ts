import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { createProjectTask } from "../helpers/procedureFixtures";
import { test_uri } from "../../utils/consts";

describe("Task escrow", function () {
  it("disburses native and ERC20 balances to an approved applicant", async function () {
    const nativeFunding = BigNumber.from(1000);
    const tokenFunding = BigNumber.from(7);
    const { creator, soul, task, taskAddress, token } = await createProjectTask(nativeFunding);
    const [, , applicant] = await ethers.getSigners();
    const applicantAddress = await applicant.getAddress();

    await soul.connect(applicant).mint(test_uri);
    const applicantSoul = await soul.tokenByAddress(applicantAddress);
    await token.mint(await creator.getAddress(), tokenFunding);
    await token.connect(creator).transfer(taskAddress, tokenFunding);

    expect(await task.contractBalance(ethers.constants.AddressZero)).to.equal(nativeFunding);
    expect(await task.contractBalance(token.address)).to.equal(tokenFunding);

    await task.connect(applicant).application(test_uri);
    await task.connect(creator).acceptApplicant(applicantSoul);
    await task.connect(creator).deliveryApprove(applicantSoul, 1);

    const applicantNativeBefore = await ethers.provider.getBalance(applicantAddress);
    const applicantTokenBefore = await token.balanceOf(applicantAddress);

    await task.connect(creator).stageExecusion([token.address]);

    expect(await task.stage()).to.equal(6);
    expect(await task.contractBalance(ethers.constants.AddressZero)).to.equal(0);
    expect(await task.contractBalance(token.address)).to.equal(0);
    expect(await ethers.provider.getBalance(applicantAddress)).to.equal(
      applicantNativeBefore.add(nativeFunding)
    );
    expect(await token.balanceOf(applicantAddress)).to.equal(
      applicantTokenBefore.add(tokenFunding)
    );
  });

  it("refunds ERC20 balances to the task creator after cancellation", async function () {
    const tokenFunding = BigNumber.from(5);
    const { creator, creatorAddress, task, taskAddress, token } = await createProjectTask();

    await token.mint(creatorAddress, tokenFunding);
    await token.connect(creator).transfer(taskAddress, tokenFunding);
    const creatorTokenBefore = await token.balanceOf(creatorAddress);

    await expect(task.connect(creator).disburse([token.address])).to.be.revertedWith(
      "NO_WINNERS_PICKED"
    );

    await task.connect(creator).cancel(test_uri, [token.address]);

    expect(await task.stage()).to.equal(7);
    expect(await task.contractBalance(token.address)).to.equal(0);
    expect(await token.balanceOf(creatorAddress)).to.equal(
      creatorTokenBefore.add(tokenFunding)
    );
  });
});
