# Test Checklist

Run before merging contract or dependency changes:

- `npm install`
- `npx hardhat compile`
- `npm run test:smoke`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:upgradeability`
- `npx hardhat size-contracts`
- `npm audit --audit-level=critical`

Contract changes require:

- direct unit coverage for changed contract behavior;
- negative permission tests for new permission checks;
- upgradeability validation for changed upgradeable contracts;
- storage-layout review for any storage variable change.
