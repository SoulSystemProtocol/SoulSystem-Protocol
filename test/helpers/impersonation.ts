import { ethers } from "hardhat";

export async function impersonateAddress(address: string) {
  await ethers.provider.send("hardhat_impersonateAccount", [address]);
  await ethers.provider.send("hardhat_setBalance", [
    address,
    ethers.utils.hexValue(ethers.utils.parseEther("1")),
  ]);

  return ethers.getSigner(address);
}

export async function stopImpersonatingAddress(address: string): Promise<void> {
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [address]);
}
