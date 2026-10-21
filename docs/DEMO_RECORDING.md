# How the demo was recorded

The clip at the top of the README is the real marketplace frontend, backend, indexer and contracts running in the Docker stack from the quick start on a local Hardhat chain. Nothing in it is mocked on the server side. Three things make it a recording and not a manual session:

- **No MetaMask.** The browser was headless Chromium driven by a Playwright script, which has no wallet extension. [`scripts/demo/wallet-stub.js`](../scripts/demo/wallet-stub.js) is a small stand-in for `window.ethereum` that answers account, connect and chain-switch requests itself and forwards everything else, including `eth_sendTransaction`, to the local Hardhat node, which signs for its unlocked test account #1. It holds no keys. It is a recording aid, not part of the app. The Playwright driver script itself is not in this repo.
- **Seeded data.** The marketplace was filled with `scripts/seed-demo.ts` as described in the README: 13 NFTs, 8 listed, 3 already sold, art embedded as `data:` URIs, no Pinata.
- **Captions.** The captions were burned in afterwards with ffmpeg, and the GIF was made from that video.

What it does not show: minting and IPFS upload, the real MetaMask confirmation popups, the creator dashboard, and any deployed network. There is none.
