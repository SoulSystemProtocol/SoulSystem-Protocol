# Reproducibility Notes

Date: 2026-06-19

## Fresh Install Check

Command:

```shell
npm ci
```

Result: blocked locally.

The install resolves the lockfile, but the Windows local install failed while running a native optional dependency build:

```text
npm error path C:\GitHubs\SoulSystem-Protocol\node_modules\bufferutil
npm error command C:\WINDOWS\system32\cmd.exe /d /s /c node-gyp-build
npm error Error: spawn EINVAL
```

The same run also reported temporary cleanup locks under `node_modules\utf-8-validate`, `node_modules\ganache`, and related native package folders.

## Recovery Used

Local dependencies were restored with:

```shell
npm install --ignore-scripts
```

This was used only to recover the local workspace after the failed clean install. It should not replace `npm ci` in CI.

## Interpretation

This is a local native-install/toolchain blocker, not a protocol compile or test failure.

Follow-up should happen in the dependency migration workstream:

- confirm whether CI passes `npm ci` on Ubuntu;
- decide whether optional native packages can be omitted safely;
- revisit Hardhat, Ganache, Waffle, and Truffle-era dependencies that pull deprecated native packages;
- keep dependency and lockfile changes isolated from behavior or documentation changes.
