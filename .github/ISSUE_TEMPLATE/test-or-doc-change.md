---
name: Test or documentation change
about: Track no-contract test, documentation, or repository hygiene work
title: "[No-contract]: "
labels: no-contract
assignees: ""
---

## Summary

Describe the test, documentation, or workflow improvement.

## Scope

- [ ] Tests only.
- [ ] Documentation only.
- [ ] CI/workflow only.
- [ ] Helper code only.

## Verification

List the narrowest commands that cover the change.

- [ ] `npx hardhat compile` if TypeScript, scripts, or CI changed.
- [ ] Focused test command:
- [ ] `npm test` if broad behavior or CI changed.

## Follow-Up

List any contract-change tasks discovered while doing this work.
