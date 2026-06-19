# Storage Layout Testing

Upgradeable contracts must not change storage order or remove storage variables without an explicit migration review.

Every dependency migration must run:

```shell
npx hardhat test test/upgradeability/UUPSValidation.ts
```

OpenZeppelin Contracts major-version upgrades require a separate storage-layout review before merge.
