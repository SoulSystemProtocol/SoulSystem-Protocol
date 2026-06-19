---
name: Storage layout change
about: Track upgradeable-contract storage additions, removals, or inheritance changes
title: "[Storage]: "
labels: contract, upgradeability, storage-review
assignees: ""
---

## Summary

Describe the storage layout change and the protocol behavior that requires it.

## Storage Impact

- Contract(s):
- Added variables:
- Removed variables:
- Renamed variables:
- Reordered variables:
- Inheritance changes:

## Review Checklist

- [ ] Storage change is append-only or compatibility impact is explicitly documented.
- [ ] Existing initializer behavior is unchanged or migration path is documented.
- [ ] OpenZeppelin upgrade validation passes.
- [ ] Human storage review notes are linked.

## Required Verification

- [ ] `npm run test:upgradeability`.
- [ ] Focused behavior tests for the feature using the storage change.
- [ ] `npm test`.
