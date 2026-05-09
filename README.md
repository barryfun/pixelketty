# KETTY Launchpad Test Version

Full-stack Web3 test version for a memecoin launchpad where memecoin balance controls NFT state.

## What is included

- `contracts/MegaMemeLaunchpad.sol`: local demo launchpad, memecoin, NFT, and v4-style hook mock
- `test/MegaMemeLaunchpad.test.cjs`: tests for buy, partial sell, full sell burn, rebuy, and transfer sync
- `scripts/deploy.cjs`: deploys the demo system and writes ABI/address to the frontend
- `src/App.jsx`: wallet connection, buy/sell controls, approval flow, and NFT state display
- `src/styles.css`: responsive test frontend

## Run locally

Install dependencies:

```bash
npm install
```

Compile and test the contract:

```bash
npm run compile
npm test
```

Start a local blockchain in one terminal:

```bash
npm run node
```

Deploy the contract in another terminal:

```bash
npm run deploy:local
```

Start the website:

```bash
npm run dev
```

To show a live Dexscreener chart in the Trade tab after the Ethereum pool exists, create `.env` and set the KETTY pair URL:

```bash
VITE_DEXSCREENER_URL=https://dexscreener.com/ethereum/YOUR_KETTY_PAIR_ADDRESS
```

Open the Vite URL, connect MetaMask, switch to the Hardhat Localhost network, and test:

- Buy KETTY: linked NFT is generated.
- Sell partial KETTY: NFT stays alive and its power updates.
- Sell all KETTY: NFT burns.
- Buy again after zero balance: a fresh NFT is generated.

## Next customizations

- Replace the local `MemeV4HookMock` with a real Uniswap v4 hook once Ethereum PoolManager/router addresses are selected.
- Add a real launch factory so creators can deploy new meme tokens.
- Add pool creation, initial liquidity, token metadata uploads, and charts.
- Add Ethereum Sepolia/mainnet config and deployment scripts.
