import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  ExternalLink,
  Flame,
  GalleryVerticalEnd,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Wallet,
  Waves
} from "lucide-react";
import megaMeme from "./contracts/MegaMemeLaunchpad.json";

const chains = {
  31337: {
    chainId: "0x7a69",
    chainName: "Hardhat Localhost",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["http://127.0.0.1:8545"],
    blockExplorerUrls: []
  },
  11155111: {
    chainId: "0xaa36a7",
    chainName: "Sepolia",
    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"]
  }
};

const pricePerToken = 0.0005;
const sellRefundRate = 0.7;
const pricePerTokenWei = ethers.parseEther("0.0005");
const nftCostWei = ethers.parseEther("10");
const dynamicPreviewCostWei = ethers.parseEther("60");
const saleSupplyWei = ethers.parseEther("50000");
const shortAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;
const formatToken = (value) => Number(ethers.formatEther(value || 0n)).toLocaleString(undefined, { maximumFractionDigits: 4 });
const formatEth = (value) => Number(ethers.formatEther(value || 0n)).toLocaleString(undefined, { maximumFractionDigits: 5 });
const formatEthQuote = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 6 });
const decodeTokenUri = (uri) => JSON.parse(atob(uri.replace("data:application/json;base64,", "")));
const accessoryTraits = ["Crown Rank", "Earrings Rank", "Visor Rank", "Star Rank", "Collar Rank"];
const configuredDexScreenerUrl = (import.meta.env.VITE_DEXSCREENER_URL || "").trim();
const dexScreenerFallbackUrl = "https://dexscreener.com/ethereum";
const targetChain = chains[megaMeme.chainId] || chains[31337];
const svgToImage = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
const fallbackMarketImage = svgToImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges"><rect width="512" height="512" fill="#202624"/><rect x="116" y="190" width="280" height="190" fill="#c9d0cd" stroke="#0d1010" stroke-width="16"/><rect x="148" y="134" width="76" height="88" fill="#bfc7c4" stroke="#0d1010" stroke-width="14"/><rect x="288" y="134" width="76" height="88" fill="#bfc7c4" stroke="#0d1010" stroke-width="14"/><rect x="188" y="244" width="136" height="118" fill="#f0e3d2"/><rect x="184" y="244" width="28" height="48" fill="#0d1010"/><rect x="300" y="244" width="28" height="48" fill="#0d1010"/><rect x="244" y="292" width="24" height="22" fill="#0d1010"/><rect x="214" y="322" width="84" height="18" fill="#0d1010"/><text x="34" y="52" fill="#fff" font-family="monospace" font-size="22" font-weight="900">KETTY LISTING</text><text x="34" y="456" fill="#fff" font-family="monospace" font-size="18" font-weight="900">METADATA LOADING</text></svg>`);

const showcaseCats = [
  {
    name: "KETTY Rain Hoodie",
    image: svgToImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges"><style>@keyframes rain{from{transform:translateY(-80px)}to{transform:translateY(120px)}}.rain{animation:rain 1.8s linear infinite}</style><rect width="512" height="512" fill="#1f2b31"/><g class="rain" fill="#8fd6ff"><rect x="82" y="20" width="8" height="28"/><rect x="170" y="70" width="8" height="28"/><rect x="318" y="24" width="8" height="28"/><rect x="426" y="88" width="8" height="28"/><rect x="120" y="222" width="8" height="28"/><rect x="366" y="220" width="8" height="28"/></g><rect x="122" y="332" width="268" height="78" fill="#40524b" stroke="#0d1010" stroke-width="16"/><rect x="148" y="134" width="76" height="88" fill="#bfc7c4" stroke="#0d1010" stroke-width="14"/><rect x="288" y="134" width="76" height="88" fill="#bfc7c4" stroke="#0d1010" stroke-width="14"/><rect x="118" y="190" width="276" height="188" fill="#c9d0cd" stroke="#0d1010" stroke-width="16"/><rect x="188" y="238" width="136" height="118" fill="#f0e3d2"/><rect x="184" y="244" width="28" height="48" fill="#0d1010"/><rect x="300" y="244" width="28" height="48" fill="#0d1010"/><rect x="244" y="290" width="24" height="24" fill="#0d1010"/><rect x="220" y="318" width="72" height="18" fill="#0d1010"/><rect x="104" y="360" width="304" height="70" fill="#586b61" stroke="#0d1010" stroke-width="14"/><rect x="166" y="108" width="180" height="34" fill="#5b6f65" stroke="#0d1010" stroke-width="12"/><text x="34" y="52" fill="#ffffff" font-family="monospace" font-size="22" font-weight="900">KETTY CAT</text></svg>`)
  },
  {
    name: "KETTY Thunder Crown",
    image: svgToImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges"><style>@keyframes flash{0%,80%,100%{opacity:.2}84%{opacity:1}}.flash{animation:flash 2.4s steps(1) infinite}</style><rect width="512" height="512" fill="#171a29"/><rect class="flash" width="512" height="512" fill="#fff2a8"/><path d="M368 42h42l-40 90h46l-86 138 28-100h-42z" fill="#ffd447"/><rect x="104" y="338" width="304" height="74" fill="#392f55" stroke="#0b0c10" stroke-width="16"/><rect x="144" y="136" width="78" height="92" fill="#d3d3d0" stroke="#0b0c10" stroke-width="14"/><rect x="290" y="136" width="78" height="92" fill="#d3d3d0" stroke="#0b0c10" stroke-width="14"/><rect x="116" y="194" width="280" height="190" fill="#d8d8d2" stroke="#0b0c10" stroke-width="16"/><rect x="188" y="244" width="136" height="118" fill="#efe3cf"/><rect x="184" y="244" width="28" height="48" fill="#0b0c10"/><rect x="300" y="244" width="28" height="48" fill="#0b0c10"/><rect x="244" y="292" width="24" height="22" fill="#0b0c10"/><rect x="214" y="322" width="84" height="18" fill="#0b0c10"/><rect x="180" y="108" width="42" height="34" fill="#f7c531" stroke="#0b0c10" stroke-width="10"/><rect x="236" y="82" width="42" height="60" fill="#f7c531" stroke="#0b0c10" stroke-width="10"/><rect x="292" y="108" width="42" height="34" fill="#f7c531" stroke="#0b0c10" stroke-width="10"/><text x="34" y="52" fill="#ffffff" font-family="monospace" font-size="22" font-weight="900">RARE ROLL</text></svg>`)
  },
  {
    name: "KETTY Neon Visor",
    image: svgToImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges"><style>@keyframes pulse{50%{opacity:.35}}.pulse{animation:pulse 1.6s ease-in-out infinite}</style><rect width="512" height="512" fill="#161f1c"/><rect class="pulse" x="0" y="0" width="512" height="512" fill="#6effc4"/><rect x="42" y="78" width="72" height="72" fill="#25352e"/><rect x="398" y="62" width="58" height="58" fill="#25352e"/><rect x="88" y="346" width="336" height="76" fill="#303a35" stroke="#0c0f0e" stroke-width="16"/><rect x="144" y="136" width="78" height="90" fill="#b8c0bd" stroke="#0c0f0e" stroke-width="14"/><rect x="290" y="136" width="78" height="90" fill="#b8c0bd" stroke="#0c0f0e" stroke-width="14"/><rect x="116" y="194" width="280" height="190" fill="#c4ccc8" stroke="#0c0f0e" stroke-width="16"/><rect x="188" y="244" width="136" height="118" fill="#eadfcf"/><rect x="168" y="238" width="176" height="42" fill="#0c0f0e"/><rect x="184" y="248" width="144" height="14" fill="#75ffdc"/><rect x="244" y="292" width="24" height="22" fill="#0c0f0e"/><rect x="214" y="324" width="84" height="18" fill="#0c0f0e"/><rect x="128" y="354" width="256" height="76" fill="#1f3c37" stroke="#0c0f0e" stroke-width="14"/><text x="34" y="52" fill="#ffffff" font-family="monospace" font-size="22" font-weight="900">VISOR MODE</text></svg>`)
  },
  {
    name: "KETTY Star Collar",
    image: svgToImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges"><style>@keyframes drift{from{transform:translateX(-30px)}to{transform:translateX(30px)}}.cloud{animation:drift 4s ease-in-out infinite alternate}</style><rect width="512" height="512" fill="#d9cbb2"/><g class="cloud" fill="#f7f2e6"><rect x="56" y="78" width="92" height="28"/><rect x="320" y="104" width="110" height="28"/><rect x="160" y="52" width="78" height="28"/></g><rect x="100" y="342" width="312" height="72" fill="#5f4a3c" stroke="#0f0d0c" stroke-width="16"/><rect x="148" y="136" width="76" height="90" fill="#b9b2aa" stroke="#0f0d0c" stroke-width="14"/><rect x="288" y="136" width="76" height="90" fill="#b9b2aa" stroke="#0f0d0c" stroke-width="14"/><rect x="118" y="194" width="276" height="190" fill="#c8c0b5" stroke="#0f0d0c" stroke-width="16"/><rect x="188" y="244" width="136" height="118" fill="#efe1ce"/><rect x="184" y="244" width="28" height="48" fill="#0f0d0c"/><rect x="300" y="244" width="28" height="48" fill="#0f0d0c"/><rect x="244" y="292" width="24" height="22" fill="#0f0d0c"/><rect x="214" y="322" width="84" height="18" fill="#0f0d0c"/><rect x="188" y="354" width="136" height="28" fill="#a93422" stroke="#0f0d0c" stroke-width="10"/><path d="M256 338l14 26h30l-24 18 10 28-30-18-30 18 10-28-24-18h30z" fill="#ffd447" stroke="#0f0d0c" stroke-width="8"/><text x="34" y="52" fill="#141414" font-family="monospace" font-size="22" font-weight="900">COLLAR RANK</text></svg>`)
  },
  {
    name: "KETTY Aurora Jacket",
    image: svgToImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges"><style>@keyframes aurora{50%{transform:translateY(22px);opacity:.65}}.a{animation:aurora 2.8s ease-in-out infinite alternate}</style><rect width="512" height="512" fill="#111820"/><path class="a" d="M0 108h512v88c-96-52-170 62-256 20C164 172 94 94 0 146z" fill="#64ffd2"/><path class="a" d="M0 170h512v86c-112-36-150 66-256 26C158 246 88 164 0 224z" fill="#7f8cff" opacity=".8"/><rect x="96" y="338" width="320" height="76" fill="#26364e" stroke="#090b0e" stroke-width="16"/><rect x="144" y="136" width="78" height="90" fill="#ccd4d1" stroke="#090b0e" stroke-width="14"/><rect x="290" y="136" width="78" height="90" fill="#ccd4d1" stroke="#090b0e" stroke-width="14"/><rect x="116" y="194" width="280" height="190" fill="#d4dcda" stroke="#090b0e" stroke-width="16"/><rect x="188" y="244" width="136" height="118" fill="#efe2d0"/><rect x="184" y="244" width="28" height="48" fill="#090b0e"/><rect x="300" y="244" width="28" height="48" fill="#090b0e"/><rect x="244" y="292" width="24" height="22" fill="#090b0e"/><rect x="214" y="322" width="84" height="18" fill="#090b0e"/><rect x="126" y="352" width="260" height="78" fill="#2d4b68" stroke="#090b0e" stroke-width="14"/><rect x="182" y="116" width="148" height="26" fill="#b884ff" stroke="#090b0e" stroke-width="10"/><text x="34" y="52" fill="#ffffff" font-family="monospace" font-size="22" font-weight="900">AURORA DROP</text></svg>`)
  },
  {
    name: "KETTY Meteor Glasses",
    image: svgToImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges"><style>@keyframes meteor{from{transform:translate(140px,-120px)}to{transform:translate(-160px,180px)}}.m{animation:meteor 1.9s linear infinite}</style><rect width="512" height="512" fill="#191515"/><rect x="60" y="90" width="12" height="12" fill="#ffffff"/><rect x="260" y="54" width="12" height="12" fill="#ffffff"/><rect x="430" y="132" width="12" height="12" fill="#ffffff"/><g class="m"><rect x="330" y="52" width="86" height="14" fill="#ffdd72"/><rect x="402" y="52" width="28" height="14" fill="#ff7048"/></g><rect x="98" y="340" width="316" height="76" fill="#3d3430" stroke="#0b0908" stroke-width="16"/><rect x="146" y="136" width="76" height="90" fill="#bfc3c0" stroke="#0b0908" stroke-width="14"/><rect x="290" y="136" width="76" height="90" fill="#bfc3c0" stroke="#0b0908" stroke-width="14"/><rect x="118" y="194" width="276" height="190" fill="#cbd0cd" stroke="#0b0908" stroke-width="16"/><rect x="188" y="244" width="136" height="118" fill="#efe2d0"/><rect x="166" y="238" width="68" height="50" fill="#0b0908"/><rect x="278" y="238" width="68" height="50" fill="#0b0908"/><rect x="228" y="254" width="56" height="12" fill="#0b0908"/><rect x="180" y="252" width="40" height="16" fill="#ffdd72"/><rect x="292" y="252" width="40" height="16" fill="#ffdd72"/><rect x="244" y="292" width="24" height="22" fill="#0b0908"/><rect x="214" y="322" width="84" height="18" fill="#0b0908"/><text x="34" y="52" fill="#ffffff" font-family="monospace" font-size="22" font-weight="900">METEOR CAT</text></svg>`)
  }
];

const emptyState = {
  ethBalance: 0n,
  tokenBalance: 0n,
  allowance: 0n,
  nftId: 0n,
  nftActive: false,
  nftPower: 0n,
  accessoryCount: 0n,
  nftImage: "",
  nftName: "",
  nftTraits: [],
  ownedNfts: [],
  marketListings: [],
  remainingForSale: saleSupplyWei,
  liquidityEthSeeded: 0n,
  liquidityTokenSeeded: 0n,
  liquiditySeeded: false,
  devEthCollected: 0n,
  taxEthToDev: 0n,
  taxEthToHolders: 0n,
  dynamicMinted: 0n,
  dynamicRemaining: 0n,
  lastUpdated: 0
};

function buildDexScreenerEmbedUrl(url) {
  if (!url) return "";

  try {
    const embedUrl = new URL(url);
    if (!embedUrl.hostname.endsWith("dexscreener.com")) return "";
    embedUrl.searchParams.set("embed", "1");
    embedUrl.searchParams.set("theme", "light");
    return embedUrl.toString();
  } catch {
    return "";
  }
}

export function App() {
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState("");
  const [chainId, setChainId] = useState(0);
  const [activeTab, setActiveTab] = useState("launch");
  const [buyAmount, setBuyAmount] = useState(10);
  const [sellAmount, setSellAmount] = useState(10);
  const [swapMode, setSwapMode] = useState("buy");
  const [swapAmount, setSwapAmount] = useState(10);
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [listingPrice, setListingPrice] = useState("0.05");
  const [status, setStatus] = useState("Connect wallet and deploy the local launchpad to start testing.");
  const [busyAction, setBusyAction] = useState("");
  const [marketStatus, setMarketStatus] = useState("Market syncing...");
  const [state, setState] = useState(emptyState);

  const hasContracts = Boolean(megaMeme.launchpad.address && megaMeme.launchpad.abi.length);
  const buyCost = useMemo(() => formatEthQuote(Number(buyAmount || 0) * pricePerToken), [buyAmount]);
  const sellReturn = useMemo(() => formatEthQuote(Number(sellAmount || 0) * pricePerToken * sellRefundRate), [sellAmount]);
  const swapQuote = useMemo(() => {
    const gross = Number(swapAmount || 0) * pricePerToken;
    return formatEthQuote(swapMode === "sell" ? gross * sellRefundRate : gross);
  }, [swapAmount, swapMode]);
  const sellWei = useMemo(() => ethers.parseEther(String(Math.max(0, Number(sellAmount || 0)))), [sellAmount]);
  const swapSellWei = useMemo(() => ethers.parseEther(String(Math.max(0, Number(swapAmount || 0)))), [swapAmount]);
  const needsApproval = state.allowance < sellWei;
  const swapNeedsApproval = swapMode === "sell" && state.allowance < swapSellWei;
  const dexScreenerEmbedUrl = useMemo(() => buildDexScreenerEmbedUrl(configuredDexScreenerUrl), []);
  const dexScreenerUrl = configuredDexScreenerUrl || dexScreenerFallbackUrl;

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccounts = ([activeAccount]) => {
      setAccount(activeAccount || "");
      if (activeAccount) {
        refreshState(activeAccount);
      } else {
        setState(emptyState);
      }
    };
    const handleChainChanged = () => {
      refreshState(account);
    };

    window.ethereum.on?.("accountsChanged", handleAccounts);
    window.ethereum.on?.("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccounts);
      window.ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [account]);

  useEffect(() => {
    if (!account || !hasContracts || !window.ethereum) return undefined;

    refreshState(account);
    const intervalId = window.setInterval(() => refreshState(account), 6000);
    const handleFocus = () => refreshState(account);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshState(account);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [account, hasContracts, selectedTokenId]);

  useEffect(() => {
    if (activeTab !== "market" || !hasContracts) return undefined;

    refreshMarketListings();
    const intervalId = window.setInterval(refreshMarketListings, 6000);
    return () => window.clearInterval(intervalId);
  }, [activeTab, account, hasContracts]);

  async function getContracts() {
    if (!window.ethereum) throw new Error("Install MetaMask or another EIP-1193 wallet first.");
    if (!hasContracts) throw new Error("Run a deploy script first so the frontend has contract addresses.");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const activeNetwork = await provider.getNetwork();
    if (megaMeme.chainId && Number(activeNetwork.chainId) !== megaMeme.chainId) {
      throw new Error(`Switch wallet network to ${targetChain.chainName} before using KETTY contracts.`);
    }

    const signer = await provider.getSigner();
    return {
      provider,
      signer,
      launchpad: new ethers.Contract(megaMeme.launchpad.address, megaMeme.launchpad.abi, signer),
      token: new ethers.Contract(megaMeme.token.address, megaMeme.token.abi, signer),
      nft: new ethers.Contract(megaMeme.nft.address, megaMeme.nft.abi, signer)
    };
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) throw new Error("Install MetaMask or another EIP-1193 wallet first.");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const activeNetwork = await provider.getNetwork();
      setAccount(accounts[0]);
      setChainId(Number(activeNetwork.chainId));
      setNetwork(activeNetwork.name === "unknown" ? `Chain ${activeNetwork.chainId}` : activeNetwork.name);
      setStatus("Wallet connected. Buy KETTY, mint NFTs, upgrade accessories, or trade in the market.");
      await refreshState(accounts[0]);
    } catch (error) {
      setStatus(error.shortMessage || error.message);
    }
  }

  async function switchNetwork() {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChain.chainId }]
      });
      setStatus(`Switched to ${targetChain.chainName}.`);
    } catch (error) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [targetChain]
        });
      } else {
        setStatus(error.message);
      }
    }
  }

  async function readNftCard(nft, tokenId, listing = null, launchpad = null) {
    const metadata = decodeTokenUri(await nft.tokenURI(tokenId));
    const accessoryCount = Number(await nft.accessoryCountOf(tokenId));
    const dynamicTrait = (metadata.attributes || []).find((trait) => trait.trait_type === "Dynamic NFT");
    const dynamicBackgroundTrait = (metadata.attributes || []).find((trait) => trait.trait_type === "Dynamic Background");
    const claimableReward = launchpad ? await launchpad.claimableTaxReward(tokenId) : 0n;
    return {
      id: tokenId.toString(),
      name: metadata.name,
      image: metadata.image,
      traits: metadata.attributes || [],
      accessoryCount,
      claimableReward,
      isDynamic: dynamicTrait?.value === "Yes",
      dynamicBackground: dynamicBackgroundTrait?.value || "Static",
      ranks: (metadata.attributes || []).filter((trait) => accessoryTraits.includes(trait.trait_type)),
      listing
    };
  }

  async function loadMarketListings(provider) {
    const readProvider = provider || new ethers.JsonRpcProvider(targetChain.rpcUrls[0]);
    const launchpad = new ethers.Contract(megaMeme.launchpad.address, megaMeme.launchpad.abi, readProvider);
    const nft = new ethers.Contract(megaMeme.nft.address, megaMeme.nft.abi, readProvider);
    const marketListings = [];
    const marketTokenIds = await launchpad.marketTokenIds();
    const seen = new Set();

    for (const id of marketTokenIds) {
      const key = id.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        const listing = await launchpad.listings(id);
        if (!listing.active) continue;
        const listingData = {
          seller: listing.seller,
          price: listing.price,
          priceEth: ethers.formatEther(listing.price)
        };

        try {
          marketListings.push(await readNftCard(nft, id, listingData));
        } catch (metadataError) {
          console.warn(`Market listing ${key} metadata failed`, metadataError);
          marketListings.push({
            id: key,
            name: `KETTY Cat #${key}`,
            image: fallbackMarketImage,
            traits: [],
            accessoryCount: 0,
            claimableReward: 0n,
            isDynamic: false,
            dynamicBackground: "Static",
            ranks: [],
            listing: listingData
          });
        }
      } catch (error) {
        console.warn(`Skipped stale market listing ${key}`, error);
      }
    }

    return marketListings;
  }

  async function refreshMarketListings() {
    if (!hasContracts) return;

    try {
      setMarketStatus("Market syncing...");
      const marketListings = await loadMarketListings();
      setState((currentState) => ({
        ...currentState,
        marketListings,
        lastUpdated: Date.now()
      }));
      setMarketStatus(`Market synced: ${marketListings.length} active listing${marketListings.length === 1 ? "" : "s"}.`);
    } catch (error) {
      const message = error.shortMessage || error.message || "Market refresh failed.";
      setMarketStatus(message);
      setStatus(message);
    }
  }

  async function refreshState(nextAccount = account) {
    if (!hasContracts) return;

    try {
      if (!window.ethereum) {
        const marketListings = await loadMarketListings();
        setState({ ...emptyState, marketListings, lastUpdated: Date.now() });
        return;
      }

      const walletProvider = new ethers.BrowserProvider(window.ethereum);
      const walletAccounts = await walletProvider.send("eth_accounts", []);
      const activeAccount = walletAccounts[0] || nextAccount;

      if (!activeAccount) {
        const marketListings = await loadMarketListings();
        setAccount("");
        setState({ ...emptyState, marketListings, lastUpdated: Date.now() });
        setStatus("Connect wallet to sync live KETTY state.");
        return;
      }

      if (activeAccount.toLowerCase() !== account.toLowerCase()) {
        setAccount(activeAccount);
      }

      const walletNetwork = await walletProvider.getNetwork();
      setChainId(Number(walletNetwork.chainId));
      setNetwork(walletNetwork.name === "unknown" ? `Chain ${walletNetwork.chainId}` : walletNetwork.name);
      if (megaMeme.chainId && Number(walletNetwork.chainId) !== megaMeme.chainId) {
        const marketListings = await loadMarketListings();
        setState({ ...emptyState, marketListings, lastUpdated: Date.now() });
        setStatus(`Wallet is on chain ${walletNetwork.chainId}. Switch to ${targetChain.chainName} to sync KETTY live state.`);
        return;
      }

      const launchpad = new ethers.Contract(megaMeme.launchpad.address, megaMeme.launchpad.abi, walletProvider);
      const token = new ethers.Contract(megaMeme.token.address, megaMeme.token.abi, walletProvider);
      const nft = new ethers.Contract(megaMeme.nft.address, megaMeme.nft.abi, walletProvider);
      const ethBalance = await walletProvider.getBalance(activeAccount, "latest");
      const [tokenBalance, primaryNftId] = await launchpad.userState(activeAccount, { blockTag: "latest" });
      const ownedNftIds = await nft.tokensOfOwner(activeAccount);
      const activeTokenId = selectedTokenId && ownedNftIds.some((id) => id.toString() === selectedTokenId)
        ? BigInt(selectedTokenId)
        : (ownedNftIds[0] || primaryNftId);
      const nftActive = activeTokenId > 0n;
      const nftId = activeTokenId;
      const nftPower = nftActive ? await nft.powerOf(nftId) : 0n;
      const accessoryCount = nftActive ? await nft.accessoryCountOf(nftId) : 0n;
      const allowance = await token.allowance(activeAccount, megaMeme.launchpad.address);
      const [
        remainingForSale,
        liquidityEthSeeded,
        liquidityTokenSeeded,
        liquiditySeeded,
        devEthCollected,
        taxEthToDev,
        taxEthToHolders,
        dynamicMinted,
        dynamicRemaining
      ] = await Promise.all([
        launchpad.remainingForSale(),
        launchpad.liquidityEthSeeded(),
        launchpad.liquidityTokenSeeded(),
        launchpad.liquiditySeeded(),
        launchpad.devEthCollected(),
        launchpad.taxEthToDev(),
        launchpad.taxEthToHolders(),
        nft.dynamicMinted(),
        nft.dynamicRemaining()
      ]);
      const ownedNfts = [];
      const marketListings = await loadMarketListings(walletProvider);
      let nftImage = "";
      let nftName = "";
      let nftTraits = [];

      for (const id of ownedNftIds) {
        ownedNfts.push(await readNftCard(nft, id, null, launchpad));
      }

      if (nftActive) {
        const selected = await readNftCard(nft, nftId, null, launchpad);
        nftImage = selected.image;
        nftName = selected.name;
        nftTraits = selected.traits;
      }

      setSelectedTokenId(nftActive ? nftId.toString() : "");
      setState({
        ethBalance,
        tokenBalance,
        allowance,
        nftId,
        nftActive,
        nftPower,
        accessoryCount,
        nftImage,
        nftName,
        nftTraits,
        ownedNfts,
        marketListings,
        remainingForSale,
        liquidityEthSeeded,
        liquidityTokenSeeded,
        liquiditySeeded,
        devEthCollected,
        taxEthToDev,
        taxEthToHolders,
        dynamicMinted,
        dynamicRemaining,
        lastUpdated: Date.now()
      });
    } catch (error) {
      setStatus(error.shortMessage || error.message);
    }
  }

  async function buyMeme(amountOverride) {
    const amount = Math.max(1, Math.floor(Number(amountOverride || buyAmount || 0)));
    const cost = BigInt(amount) * pricePerTokenWei;
    if (state.ethBalance > 0n && state.ethBalance < cost) {
      setStatus(`This buy needs ${ethers.formatEther(cost)} Sepolia ETH plus gas. Connected wallet only has ${formatEth(state.ethBalance)} ETH.`);
      return;
    }

    setBusyAction("buy");
    setStatus("Confirm buy transaction. KETTY costs 0.0005 ETH each.");

    try {
      const { launchpad } = await getContracts();
      const tx = await launchpad.buy(amount, { value: cost });
      setStatus("Buy submitted. Waiting for hook sync...");
      await tx.wait();
      await refreshState();
      setStatus("Buy complete. Use KETTY to mint NFTs, upgrade accessories, or trade.");
    } catch (error) {
      setStatus(error.shortMessage || error.message || "Buy failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function mintKettyNft() {
    setBusyAction("mintNft");
    setStatus("Confirm NFT mint. This uses 10 KETTY from your balance.");

    try {
      const { signer, launchpad, token, provider } = await getContracts();
      const signerAddress = await signer.getAddress();
      const [freshTokenBalance, freshEthBalance] = await Promise.all([
        token.balanceOf(signerAddress),
        provider.getBalance(signerAddress)
      ]);

      if (freshTokenBalance < nftCostWei) {
        setStatus(`You have ${formatToken(freshTokenBalance)} KETTY. Minting one KETTY NFT needs 10 KETTY.`);
        return;
      }
      if (freshEthBalance === 0n) {
        setStatus("You have 10+ KETTY, but this transaction still needs a little Sepolia ETH for gas.");
        return;
      }

      const tx = await launchpad.mintKettyNft();
      setStatus("Mint submitted. Contract is generating a fresh pixel cat...");
      await tx.wait();
      await refreshState();
      setActiveTab("cats");
      setStatus("New KETTY NFT minted. It is now visible in My KETTY CAT.");
    } catch (error) {
      setStatus(error.shortMessage || error.message || "NFT mint failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function mintDynamicPreviewNft() {
    setBusyAction("dynamicPreview");
    setStatus("Confirm dynamic preview mint. This uses 60 KETTY and creates a fully upgraded dynamic cat.");

    try {
      const { signer, launchpad, token, provider } = await getContracts();
      const signerAddress = await signer.getAddress();
      const [freshTokenBalance, freshEthBalance] = await Promise.all([
        token.balanceOf(signerAddress),
        provider.getBalance(signerAddress)
      ]);

      if (freshTokenBalance < dynamicPreviewCostWei) {
        setStatus(`You have ${formatToken(freshTokenBalance)} KETTY. Dynamic preview needs 60 KETTY.`);
        return;
      }
      if (freshEthBalance === 0n) {
        setStatus("You have enough KETTY, but this transaction still needs a little Sepolia ETH for gas.");
        return;
      }

      const tx = await launchpad.mintDynamicPreviewNft();
      setStatus("Dynamic preview mint submitted. Contract is creating a fully upgraded animated cat...");
      await tx.wait();
      await refreshState();
      setActiveTab("cats");
      setStatus("Dynamic KETTY CAT minted. It is now visible in My KETTY CAT.");
    } catch (error) {
      setStatus(error.shortMessage || error.message || "Dynamic preview mint failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function addAccessory() {
    setBusyAction("accessory");
    setStatus("Confirm NFT upgrade. This uses 10 KETTY and randomly rolls one accessory rank.");

    try {
      if (!selectedTokenId) throw new Error("Select an NFT to upgrade first.");
      const { signer, launchpad, token } = await getContracts();
      const freshTokenBalance = await token.balanceOf(await signer.getAddress());
      if (freshTokenBalance < nftCostWei) {
        setStatus(`You have ${formatToken(freshTokenBalance)} KETTY. Upgrading one accessory needs 10 KETTY.`);
        return;
      }

      const tx = await launchpad.addAccessory(selectedTokenId);
      setStatus("Upgrade submitted. Rolling accessory rank on-chain...");
      await tx.wait();
      await refreshState();
      setStatus("NFT upgraded. The cat image and traits are now updated.");
    } catch (error) {
      setStatus(error.shortMessage || error.message || "NFT upgrade failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function approveSell() {
    setBusyAction("approve");
    setStatus("Confirm approval so the launchpad can take KETTY when you sell.");

    try {
      const { signer, token } = await getContracts();
      const signerAddress = await signer.getAddress();
      const tx = await token.approve(megaMeme.launchpad.address, ethers.MaxUint256);
      await tx.wait();
      const freshAllowance = await token.allowance(signerAddress, megaMeme.launchpad.address);
      setState((currentState) => ({ ...currentState, allowance: freshAllowance }));
      await refreshState(signerAddress);
      setStatus("Approval complete. You can sell KETTY now.");
    } catch (error) {
      setStatus(error.shortMessage || error.message || "Approval failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function sellMeme(amountOverride) {
    const amount = Math.max(1, Number(amountOverride || sellAmount || 0));
    setBusyAction("sell");
    setStatus("Confirm sell transaction. Only unused wallet KETTY can be sold.");

    try {
      const { launchpad } = await getContracts();
      const tx = await launchpad.sell(amount);
      setStatus("Sell submitted. Waiting for hook sync...");
      await tx.wait();
      await refreshState();
      setStatus("Sell complete. NFT and accessories stay because KETTY was already used for them.");
    } catch (error) {
      setStatus(error.shortMessage || error.message || "Sell failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function listSelectedNft() {
    setBusyAction("list");
    setStatus("Confirm listing. Your selected NFT will appear in the market.");

    try {
      if (!selectedTokenId) throw new Error("Select an NFT to list first.");
      const { launchpad } = await getContracts();
      const tx = await launchpad.listNft(selectedTokenId, ethers.parseEther(String(listingPrice || "0")));
      await tx.wait();
      await refreshState();
      setStatus("NFT listed on the KETTY market.");
      setActiveTab("market");
    } catch (error) {
      setStatus(error.shortMessage || error.message || "Listing failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function cancelListing(tokenId) {
    setBusyAction(`cancel-${tokenId}`);
    setStatus("Canceling listing...");

    try {
      const { launchpad } = await getContracts();
      const tx = await launchpad.cancelListing(tokenId);
      await tx.wait();
      await refreshState();
      setStatus("Listing canceled.");
    } catch (error) {
      setStatus(error.shortMessage || error.message || "Cancel failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function buyListedNft(item) {
    setBusyAction(`buy-nft-${item.id}`);
    setStatus(`Buying ${item.name} from the KETTY market...`);

    try {
      const { launchpad } = await getContracts();
      const tx = await launchpad.buyListedNft(item.id, { value: item.listing.price });
      await tx.wait();
      await refreshState();
      setStatus("NFT purchased. It is now in your wallet.");
    } catch (error) {
      setStatus(error.shortMessage || error.message || "NFT purchase failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function claimTaxReward(tokenId) {
    setBusyAction(`claim-${tokenId}`);
    setStatus(`Claiming KETTY CAT #${tokenId} rewards...`);

    try {
      const { launchpad } = await getContracts();
      const tx = await launchpad.claimTaxReward(tokenId);
      await tx.wait();
      await refreshState();
      setStatus(`Rewards claimed for KETTY CAT #${tokenId}.`);
    } catch (error) {
      setStatus(error.shortMessage || error.message || "Reward claim failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function executeSwap() {
    if (swapMode === "buy") {
      await buyMeme(swapAmount);
      return;
    }
    if (swapNeedsApproval) {
      await approveSell();
      return;
    }
    await sellMeme(swapAmount);
  }

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark"><Flame size={19} /></span>
          KETTY Launchpad
        </div>
        <div className="nav-actions">
          <button className="icon-button" onClick={switchNetwork} aria-label="Switch network" title={`Switch to ${targetChain.chainName}`}>
            <ArrowUpRight size={18} />
          </button>
          <button className="wallet-button" onClick={connectWallet}>
            <Wallet size={18} />
            {account ? shortAddress(account) : "Connect wallet"}
          </button>
        </div>
      </nav>

      <div className="tabbar">
        <button className={activeTab === "launch" ? "active" : ""} onClick={() => setActiveTab("launch")}>Launch</button>
        <button className={activeTab === "cats" ? "active" : ""} onClick={() => setActiveTab("cats")}>My KETTY CAT</button>
        <button className={activeTab === "market" ? "active" : ""} onClick={() => setActiveTab("market")}>NFT Market</button>
      </div>

      <section className="hero">
        <div className="hero-art" aria-hidden="true">
          <RotatingKettyPreview />
        </div>

        <div className="hero-copy">
          <p className="eyebrow">Ethereum V4 hook concept</p>
          <h1>KETTY</h1>
          <p>
            KETTY tokens power a fully on-chain pixel cat economy. Trade KETTY, mint multiple NFTs,
            upgrade selected cats, and list ranked cats on the market.
          </p>
          <div className="hero-stats">
            <span><strong>{formatToken(state.tokenBalance)}</strong> KETTY held</span>
            <span><strong>{state.ownedNfts.length}</strong> NFTs owned</span>
            <span><strong>{state.marketListings.length}</strong> Listed</span>
          </div>
        </div>
      </section>

      {activeTab === "launch" && (
        <LaunchTab
          buyAmount={buyAmount}
          buyCost={buyCost}
          setBuyAmount={setBuyAmount}
          busyAction={busyAction}
          buyMeme={() => buyMeme()}
          mintKettyNft={mintKettyNft}
          addAccessory={addAccessory}
          selectedTokenId={selectedTokenId}
          setSelectedTokenId={setSelectedTokenId}
          state={state}
          refreshState={() => refreshState()}
          status={status}
          account={account}
          network={network}
          chainId={chainId}
        />
      )}

      {activeTab === "cats" && (
        <MyKettyCatTab
          state={state}
          selectedTokenId={selectedTokenId}
          setSelectedTokenId={setSelectedTokenId}
          claimTaxReward={claimTaxReward}
          busyAction={busyAction}
          refreshState={() => refreshState()}
          status={status}
        />
      )}

      {activeTab === "market" && (
        <MarketTab
          account={account}
          state={state}
          selectedTokenId={selectedTokenId}
          setSelectedTokenId={setSelectedTokenId}
          listingPrice={listingPrice}
          setListingPrice={setListingPrice}
          listSelectedNft={listSelectedNft}
          cancelListing={cancelListing}
          buyListedNft={buyListedNft}
          refreshState={() => refreshState()}
          marketStatus={marketStatus}
          busyAction={busyAction}
        />
      )}

      <section className="details-grid">
        <InfoCard icon={<BarChart3 />} title="Launch phase" text="KETTY cannot be sold back to the contract. Trading opens only after the DEV wallet adds pool liquidity." />
        <InfoCard icon={<ShoppingBag />} title="NFT Market" text="List, cancel, or buy ranked KETTY cats. Cards show each NFT's accessory ranks." />
        <InfoCard icon={<Flame />} title="ETH chain target" text="Local Hardhat first, then Ethereum Sepolia or mainnet with Uniswap v4 PoolManager and router addresses." />
      </section>
    </main>
  );
}

function LaunchTab(props) {
  const {
    buyAmount,
    buyCost,
    setBuyAmount,
    busyAction,
    buyMeme,
    mintKettyNft,
    addAccessory,
    selectedTokenId,
    setSelectedTokenId,
    state,
    refreshState,
    status,
    account,
    network,
    chainId
  } = props;

  return (
    <section className="trade-layout">
      <div className="trade-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Buy flow</p>
            <h2>Mint memecoin</h2>
          </div>
          <Sparkles size={22} />
        </div>
        <AmountInput label="KETTY amount" value={buyAmount} onChange={setBuyAmount} />
        <div className="price-line"><span>You pay</span><strong>{buyCost} ETH</strong></div>
        <button className="primary-button" onClick={buyMeme} disabled={busyAction === "buy"}>
          {busyAction === "buy" ? <Loader2 className="spin" size={18} /> : <Flame size={18} />}
          Buy KETTY
        </button>
      </div>

      <div className="trade-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">NFT flow</p>
            <h2>Mint or upgrade</h2>
          </div>
          <GalleryVerticalEnd size={22} />
        </div>
        <div className="cost-stack">
          <div className="price-line"><span>Mint NFT</span><strong>10 KETTY</strong></div>
          <div className="price-line"><span>Upgrade NFT</span><strong>10 KETTY</strong></div>
        </div>
        <NftSelector ownedNfts={state.ownedNfts} selectedTokenId={selectedTokenId} setSelectedTokenId={setSelectedTokenId} />
        <div className="button-stack">
          <button className="primary-button secondary" onClick={mintKettyNft} disabled={busyAction === "mintNft"}>
            {busyAction === "mintNft" ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            Mint New NFT
          </button>
          <button className="primary-button secondary alt" onClick={addAccessory} disabled={!state.nftActive || busyAction === "accessory" || Number(state.accessoryCount) >= 5}>
            {busyAction === "accessory" ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            Upgrade Selected NFT
          </button>
        </div>
      </div>

      <div className="state-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Live state</p>
            <h2>Hook synced</h2>
          </div>
          <button className="icon-button" onClick={refreshState} aria-label="Refresh state" title="Refresh state">
            <RefreshCw size={18} />
          </button>
        </div>
        <LiveState state={state} account={account} network={network} chainId={chainId} />
        <p className="status-text">{status}</p>
      </div>
    </section>
  );
}

function TradeTab({ state, swapMode, setSwapMode, swapAmount, setSwapAmount, swapQuote, swapNeedsApproval, busyAction, executeSwap, network, dexScreenerUrl, dexScreenerEmbedUrl }) {
  return (
    <section className="dex-layout">
      <div className="dexscreen">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Dexscreener</p>
            <h2>KETTY / ETH</h2>
          </div>
          <a className="icon-button" href={dexScreenerUrl} target="_blank" rel="noreferrer" aria-label="Open Dexscreener" title="Open Dexscreener">
            <ExternalLink size={18} />
          </a>
        </div>
        {dexScreenerEmbedUrl ? (
          <div className="dex-frame">
            <iframe
              title="KETTY Dexscreener chart"
              src={dexScreenerEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allow="clipboard-write; encrypted-media; fullscreen"
            />
          </div>
        ) : (
          <div className="dex-connect">
            <BarChart3 size={42} />
            <div>
              <p className="section-kicker">Waiting for pair URL</p>
              <h3>Connect KETTY after launch</h3>
              <p>
                Once the Ethereum pool is created and indexed, set VITE_DEXSCREENER_URL to the KETTY pair page.
                The live Dexscreener chart will render here.
              </p>
            </div>
            <a className="primary-button secondary alt" href={dexScreenerUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={18} />
              Open Dexscreener
            </a>
          </div>
        )}
        <div className="dex-metrics">
          <Metric label="Price" value="0.0005 ETH" />
          <Metric label="Supply" value="70,000 KETTY" />
          <Metric label="For sale" value={`${formatToken(state.remainingForSale)} KETTY`} />
          <Metric label="LP reserve" value="20,000 KETTY" />
          <Metric label="Network" value={network || "Local"} />
        </div>
      </div>

      <div className="swap-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Swap</p>
            <h2>Trade KETTY</h2>
          </div>
          <Waves size={22} />
        </div>
        <div className="segmented">
          <button className={swapMode === "buy" ? "active" : ""} onClick={() => setSwapMode("buy")}>Buy</button>
          <button className={swapMode === "sell" ? "active" : ""} onClick={() => setSwapMode("sell")}>Sell</button>
        </div>
        <AmountInput label="KETTY amount" value={swapAmount} onChange={setSwapAmount} />
        <div className="price-line">
          <span>{swapMode === "buy" ? "You pay" : "You receive"}</span>
          <strong>{swapQuote} ETH</strong>
        </div>
        <button className="primary-button" onClick={executeSwap} disabled={busyAction === "buy" || busyAction === "sell" || busyAction === "approve"}>
          {(busyAction === "buy" || busyAction === "sell" || busyAction === "approve") ? <Loader2 className="spin" size={18} /> : <Waves size={18} />}
          {swapNeedsApproval ? "Approve KETTY" : `${swapMode === "buy" ? "Buy" : "Sell"} KETTY`}
        </button>
      </div>
    </section>
  );
}

function MyKettyCatTab({ state, selectedTokenId, setSelectedTokenId, claimTaxReward, busyAction, refreshState, status }) {
  const selectedCat = state.ownedNfts.find((item) => item.id === selectedTokenId) || state.ownedNfts[0];
  const selectedClaimable = selectedCat?.claimableReward || 0n;

  return (
    <section className="cat-layout">
      <div className="cat-sidebar">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">My KETTY CAT</p>
            <h2>Your minted cats</h2>
          </div>
          <button className="icon-button" onClick={refreshState} aria-label="Refresh cats" title="Refresh cats">
            <RefreshCw size={18} />
          </button>
        </div>
        <div className="state-grid">
          <Metric label="NFTs owned" value={String(state.ownedNfts.length)} />
          <Metric label="KETTY held" value={`${formatToken(state.tokenBalance)} KETTY`} />
          <Metric label="Selected" value={selectedCat ? `#${selectedCat.id}` : "None"} />
          <Metric label="Accessories" value={selectedCat ? `${selectedCat.accessoryCount} / 5` : "0 / 5"} />
          <Metric label="Claimable" value={`${formatEth(selectedClaimable)} ETH`} />
        </div>
        <NftSelector ownedNfts={state.ownedNfts} selectedTokenId={selectedTokenId} setSelectedTokenId={setSelectedTokenId} />
        <button
          className="primary-button secondary"
          onClick={() => claimTaxReward(selectedCat.id)}
          disabled={!selectedCat || selectedClaimable === 0n || busyAction === `claim-${selectedCat?.id}`}
        >
          {busyAction === `claim-${selectedCat?.id}` ? <Loader2 className="spin" size={18} /> : <BadgeCheck size={18} />}
          Claim Rewards
        </button>
        <p className="status-text">{status}</p>
      </div>

      <div className="cat-gallery">
        {state.ownedNfts.length === 0 ? (
          <div className="empty-market">No KETTY CAT minted yet. Use 10 KETTY in Launch to mint your first cat.</div>
        ) : state.ownedNfts.map((item) => (
          <article className={`cat-card ${item.id === selectedTokenId ? "selected" : ""}`} key={item.id}>
            <img src={item.image} alt={item.name} />
            {item.isDynamic && <span className="dynamic-badge">{item.dynamicBackground}</span>}
            <div className="nft-card-body">
              <div>
                <h3>{item.name}</h3>
                <p>Token #{item.id}</p>
              </div>
              <strong>{item.accessoryCount}/5</strong>
            </div>
            <RankList ranks={item.ranks} />
            <div className="reward-line">
              <span>Rewards</span>
              <strong>{formatEth(item.claimableReward)} ETH</strong>
            </div>
            <button className="primary-button secondary alt" onClick={() => setSelectedTokenId(item.id)}>
              <GalleryVerticalEnd size={18} />
              Select Cat
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function MarketTab({ account, state, selectedTokenId, setSelectedTokenId, listingPrice, setListingPrice, listSelectedNft, cancelListing, buyListedNft, refreshState, marketStatus, busyAction }) {
  const activeListings = state.marketListings;
  const normalizedAccount = account?.toLowerCase() || "";

  return (
    <section className="market-layout">
      <div className="market-controls">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">NFT Market</p>
            <h2>List your cat</h2>
          </div>
          <ShoppingBag size={22} />
        </div>
        <NftSelector ownedNfts={state.ownedNfts} selectedTokenId={selectedTokenId} setSelectedTokenId={setSelectedTokenId} />
        <div className="field-row">
          <label htmlFor="listing-price">Listing price ETH</label>
          <input id="listing-price" className="amount-input" type="number" min="0.001" step="0.001" value={listingPrice} onChange={(event) => setListingPrice(event.target.value)} />
        </div>
        <button className="primary-button secondary" onClick={listSelectedNft} disabled={!selectedTokenId || busyAction === "list"}>
          {busyAction === "list" ? <Loader2 className="spin" size={18} /> : <ShoppingBag size={18} />}
          List Selected NFT
        </button>
      </div>

      <div className="market-feed">
        <div className="market-section-head">
          <div>
            <p className="section-kicker">Public listings</p>
            <h2>Live KETTY cats</h2>
          </div>
          <div className="market-head-actions">
            <strong>{activeListings.length} live</strong>
            <button className="icon-button" onClick={refreshState} aria-label="Refresh market" title="Refresh market">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className="market-grid">
          {activeListings.length === 0 ? (
            <div className="empty-market">
              No KETTY cats are listed yet.
              <span>{marketStatus}</span>
            </div>
          ) : activeListings.map((item) => {
            const isOwnListing = normalizedAccount && item.listing.seller.toLowerCase() === normalizedAccount;
            return (
            <MarketCard
              key={item.id}
              item={item}
              action={isOwnListing ? "cancel" : "buy"}
              busyAction={busyAction}
              onBuy={buyListedNft}
              onCancel={cancelListing}
            />
          ); })}
        </div>
        {activeListings.length > 0 && <p className="status-text market-status">{marketStatus}</p>}
      </div>
    </section>
  );
}

function MarketCard({ item, action, busyAction, onBuy, onCancel }) {
  const isCancel = action === "cancel";
  const busyKey = isCancel ? `cancel-${item.id}` : `buy-nft-${item.id}`;

  return (
    <article className="nft-card">
      <img src={item.image} alt={item.name} />
      {item.isDynamic && <span className="dynamic-badge">{item.dynamicBackground}</span>}
      <div className="nft-card-body">
        <div>
          <h3>{item.name}</h3>
          <p>{item.accessoryCount}/5 accessories</p>
        </div>
        <strong>{item.listing.priceEth} ETH</strong>
      </div>
      <div className="seller-line">
        <span>Seller</span>
        <strong>{shortAddress(item.listing.seller)}</strong>
      </div>
      <RankList ranks={item.ranks} />
      {isCancel ? (
        <button className="primary-button danger" onClick={() => onCancel(item.id)} disabled={busyAction === busyKey}>
          {busyAction === busyKey ? <Loader2 className="spin" size={18} /> : <ShoppingBag size={18} />}
          Cancel Listing
        </button>
      ) : (
        <button className="primary-button" onClick={() => onBuy(item)} disabled={busyAction === busyKey}>
          {busyAction === busyKey ? <Loader2 className="spin" size={18} /> : <ShoppingBag size={18} />}
          Buy NFT
        </button>
      )}
    </article>
  );
}

function NftSelector({ ownedNfts, selectedTokenId, setSelectedTokenId }) {
  if (ownedNfts.length === 0) return null;
  return (
    <div className="field-row">
      <label htmlFor="selected-nft">Selected NFT</label>
      <select id="selected-nft" className="amount-input select-input" value={selectedTokenId} onChange={(event) => setSelectedTokenId(event.target.value)}>
        {ownedNfts.map((item) => (
          <option key={item.id} value={item.id}>
            #{item.id} - {item.accessoryCount}/5 accessories{item.isDynamic ? ` - ${item.dynamicBackground}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function LiveState({ state, account, network, chainId }) {
  return (
    <>
      <div className="state-grid">
        <Metric label="Wallet" value={account ? shortAddress(account) : "Not connected"} />
        <Metric label="Network" value={chainId ? `${network || targetChain.chainName} (${chainId})` : targetChain.chainName} />
        <Metric label="KETTY contract" value={shortAddress(megaMeme.token.address)} />
        <Metric label="Wallet balance" value={`${formatToken(state.tokenBalance)} KETTY`} />
        <Metric label="Sepolia ETH" value={`${formatEth(state.ethBalance)} ETH`} />
        <Metric label="NFT id" value={state.nftActive ? `#${state.nftId}` : "None"} />
        <Metric label="NFTs owned" value={String(state.ownedNfts.length)} />
        <Metric label="KETTY used" value={`${formatToken(state.nftPower)} KETTY`} />
        <Metric label="Accessories" value={`${state.accessoryCount.toString()} / 5`} />
        <Metric label="Sale left" value={`${formatToken(state.remainingForSale)} KETTY`} />
        <Metric label="LP ETH seed" value={`${formatEth(state.liquidityEthSeeded)} ETH`} />
        <Metric label="LP KETTY seed" value={`${formatToken(state.liquidityTokenSeeded)} KETTY`} />
        <Metric label="DEV collected" value={`${formatEth(state.devEthCollected)} ETH`} />
        <Metric label="Holder tax pool" value={`${formatEth(state.taxEthToHolders)} ETH`} />
        <Metric label="Dynamic minted" value={`${state.dynamicMinted.toString()} / 50`} />
        <Metric label="Dynamic left" value={state.dynamicRemaining.toString()} />
        <Metric label="Last synced" value={state.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString() : "Waiting"} />
      </div>
      {state.nftActive && <RankList ranks={state.nftTraits.filter((trait) => accessoryTraits.includes(trait.trait_type))} />}
      <div className={`nft-status ${state.nftActive ? "on" : "off"}`}>
        <BadgeCheck size={18} />
        {state.nftActive ? "Selected NFT can be upgraded or listed on the market." : "Use 10 KETTY to mint the first NFT."}
      </div>
    </>
  );
}

function RankList({ ranks }) {
  if (!ranks || ranks.length === 0) {
    return <div className="trait-list"><span>No accessory ranks yet</span></div>;
  }
  return (
    <div className="trait-list">
      {ranks.map((trait) => (
        <span key={trait.trait_type}>
          {trait.trait_type}: <strong>{trait.value}</strong>
        </span>
      ))}
    </div>
  );
}

function RotatingKettyPreview() {
  const [catIndex, setCatIndex] = useState(() => Math.floor(Math.random() * showcaseCats.length));
  const cat = showcaseCats[catIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCatIndex((currentIndex) => {
        const nextIndex = Math.floor(Math.random() * showcaseCats.length);
        return nextIndex === currentIndex ? (nextIndex + 1) % showcaseCats.length : nextIndex;
      });
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  return <img key={cat.name} className="showcase-preview" src={cat.image} alt={`${cat.name} preview`} />;
}

function PixelCatPlaceholder() {
  return (
    <div className="pixel-placeholder" aria-hidden="true">
      <div className="pixel-label">KETTY CAT NFT</div>
      <div className="pixel-cat">
        <span className="px ear-left" />
        <span className="px ear-right" />
        <span className="px head" />
        <span className="px face" />
        <span className="px eye-left" />
        <span className="px eye-right" />
        <span className="px nose" />
        <span className="px mouth-left" />
        <span className="px mouth-right" />
        <span className="px body" />
      </div>
      <div className="pixel-off">BUY KETTY TO GENERATE</div>
    </div>
  );
}

function AmountInput({ label, value, onChange }) {
  return (
    <div className="field-row">
      <label>{label}</label>
      <input
        className="amount-input"
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(event) => onChange(Math.max(1, Number(event.target.value || 1)))}
      />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <article className="info-card">
      <span className="info-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
