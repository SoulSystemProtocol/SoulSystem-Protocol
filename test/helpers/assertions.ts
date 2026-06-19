import { expect } from "chai";
import { BigNumberish } from "ethers";
import { isNonZeroAddress } from "./addresses";

export function expectAddress(value: string): void {
  expect(isNonZeroAddress(value)).to.equal(true);
}

export function expectZero(value: BigNumberish): void {
  expect(value).to.equal(0);
}

export function expectNonZeroTokenId(value: BigNumberish): void {
  expect(value).to.not.equal(0);
}
