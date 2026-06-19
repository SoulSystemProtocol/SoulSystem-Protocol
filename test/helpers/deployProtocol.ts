import { Contract } from "ethers";
import { deployContract, deployHub, deployUUPS } from "../../utils/deployment";

export interface CoreProtocolDeployment {
  dataRepo: Contract;
  hub: Contract;
  soul: Contract;
}

export interface FullProtocolDeployment extends CoreProtocolDeployment {
  ruleRepo: Contract;
  actionRepo: Contract;
  votesRepo: Contract;
}

export async function deployCoreProtocol(): Promise<CoreProtocolDeployment> {
  const dataRepo = await deployUUPS("OpenRepoUpgradable", []);
  const hub = await deployHub(dataRepo.address);
  const soul = await deployUUPS("SoulUpgradable", [hub.address]);

  await hub.assocSet("SBT", soul.address);

  return { dataRepo, hub, soul };
}

export async function deployFullProtocol(): Promise<FullProtocolDeployment> {
  const core = await deployCoreProtocol();
  const ruleRepo = await deployContract("RuleRepo", []);
  const actionRepo = await deployUUPS("ActionRepoTrackerUp", [core.hub.address]);
  const votesRepo = await deployUUPS("VotesRepoTrackerUp", [core.hub.address]);

  await core.hub.assocSet("RULE_REPO", ruleRepo.address);
  await core.hub.assocSet("action", actionRepo.address);
  await core.hub.assocSet("VOTES_REPO", votesRepo.address);

  return { ...core, ruleRepo, actionRepo, votesRepo };
}
