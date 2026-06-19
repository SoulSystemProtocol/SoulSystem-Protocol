export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function isNonZeroAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value) && value !== ZERO_ADDRESS;
}
