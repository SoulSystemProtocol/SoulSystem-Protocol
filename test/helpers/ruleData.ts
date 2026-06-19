import { ethers } from "hardhat";

export function makeAction() {
  return {
    subject: "member",
    verb: "contribute",
    object: "project",
    tool: "soul",
  };
}

export async function makeRule(affected = "subject", uri = "ipfs://rule") {
  return {
    about: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`${affected}:${uri}`)),
    affected,
    negation: false,
    uri,
    disabled: false,
  };
}

export function makeEffect(domain = "professional", value = 5) {
  return {
    domain,
    value,
    disabled: false,
  };
}

export function makeConfirmation() {
  return {
    ruling: "authority",
    evidence: false,
    quorum: 0,
  };
}
