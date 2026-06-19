---
name: Contract change
about: Track a Solidity contract behavior, API, or storage change
title: "[Contract]: "
labels: contract, needs-review
assignees: ""
---

## Summary

Describe the contract change and the behavior it is intended to support.

## Scope

- Contract(s):
- Public API touched:
- Storage touched:
- Events touched:
- Upgrade pattern touched:

## Compatibility Review

- [ ] No public function, event, storage-facing behavior, or revert string compatibility risk.
- [ ] If compatibility risk exists, migration/consumer impact is documented.
- [ ] Upgradeable storage layout has been reviewed.
- [ ] Contract-side debug logging has been reviewed.

## Required Tests

- [ ] Focused positive behavior test.
- [ ] Negative permission or invalid-state test.
- [ ] `npm run test:upgradeability`.
- [ ] `npm test` before merge.

## Notes

Add links to plan docs, failing tests, or storage-layout notes.
