# Using the marketplace

## Connect MetaMask

Add the Hardhat network:
- Network name: Hardhat Local
- RPC URL: `http://localhost:8546`
- Chain ID: `31337`
- Currency symbol: ETH

Import test account #0 from the Hardhat node logs:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Owner)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This is the public Hardhat default test account. It ships with every Hardhat node and only holds funds on your local chain. Never use it on a public network.

## Buy, list, mint

After seeding:

1. Open the marketplace at http://localhost:3002 and press "Connect Wallet". Use a second MetaMask account (for example Hardhat account #1) to buy.
2. Open a listing and press "Buy Now for ... ETH", then "Confirm". The page confirms with "Purchase successful! The NFT is now yours." and the NFT appears under "My NFTs".
3. In "My NFTs" press "List" on an NFT you own. The first time, "Approve & List" approves the marketplace contract, then "List NFT" sets the price. "Update" and "Cancel" appear on listed NFTs.
4. The "Activity" tab is the live feed and the "Analytics" tab shows platform statistics, the volume chart, the price distribution, top traders and the most expensive sales.
5. Minting happens in the creator dashboard at http://localhost:3003 and needs Pinata: upload an image, fill in the metadata, upload to IPFS, then mint and confirm in MetaMask. That path is not covered by the demo clip.
