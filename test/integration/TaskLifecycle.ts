import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFullProtocol } from "../helpers/deployProtocol";
import {
  impersonateAddress,
  stopImpersonatingAddress,
} from "../helpers/impersonation";
import { test_uri } from "../../utils/consts";

async function createTask() {
  const deployment = await deployFullProtocol();
  const gameAddress = await deployment.hub.callStatic.makeGame(
    "PROJECT",
    "Tasks Game",
    test_uri
  );
  await deployment.hub.makeGame("PROJECT", "Tasks Game", test_uri);

  const gameSigner = await impersonateAddress(gameAddress);
  const hubAsGame = deployment.hub.connect(gameSigner);
  const taskAddress = await hubAsGame.callStatic.makeTask("TASK", "Task One", test_uri);
  await hubAsGame.makeTask("TASK", "Task One", test_uri);
  await stopImpersonatingAddress(gameAddress);

  const task = await ethers.getContractAt("TaskUpgradable", taskAddress);
  const game = await ethers.getContractAt("GameUpgradable", gameAddress);
  return { ...deployment, game, gameAddress, task, taskAddress };
}

describe("Task lifecycle", function () {
  it("opens from draft stage", async function () {
    const { task } = await createTask();

    expect(await task.stage()).to.equal(0);
    await task.stageOpen();
    expect(await task.stage()).to.equal(1);
  });

  it("rejects applications before the task is open", async function () {
    const { task } = await createTask();
    const [, applicant] = await ethers.getSigners();

    await expect(task.connect(applicant).application(test_uri)).to.be.revertedWith(
      "STAGE:TOO_EARLY"
    );
  });

  it("accepts an applicant after opening", async function () {
    const { task, soul } = await createTask();
    const [, applicant] = await ethers.getSigners();
    const applicantAddress = await applicant.getAddress();

    await soul.connect(applicant).mint(test_uri);
    const applicantSoul = await soul.tokenByAddress(applicantAddress);

    await task.stageOpen();
    await task.connect(applicant).application(test_uri);
    await task.acceptApplicant(applicantSoul);

    expect(await task.roleHasByToken(applicantSoul, "applicant")).to.equal(true);
  });
});
