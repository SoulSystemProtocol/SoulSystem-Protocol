---
name: Dependency migration
about: Track package, Hardhat, ethers, OpenZeppelin, or tooling migrations
title: "[Dependency]: "
labels: dependencies, needs-plan
assignees: ""
---

## Summary

Describe the dependency or tooling change and why it is needed.

## Packages

- Package(s):
- Current version(s):
- Target version(s):

## Migration Checks

- [ ] Review official migration notes.
- [ ] Identify breaking API changes.
- [ ] Update scripts/configuration in the same migration branch.
- [ ] Revisit `npx hardhat coverage` if the change affects coverage tooling.
- [ ] Record lockfile changes.

## Required Verification

- [ ] `npm ci`.
- [ ] `npx hardhat compile`.
- [ ] `npm run test:smoke`.
- [ ] `npm run test:unit`.
- [ ] `npm run test:integration`.
- [ ] `npm run test:upgradeability`.
- [ ] `npm test`.

## Rollback Plan

Document how to revert if the migration fails CI or blocks local development.
