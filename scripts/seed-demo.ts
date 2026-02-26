import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Config ──────────────────────────────────────────────────────────
const RPC_URL = 'http://localhost:8546';
const NFT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const MARKETPLACE_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const PINATA_JWT = process.env.PINATA_JWT || '';
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

// Hardhat accounts
const OWNER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const BUYER_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

// ── SVG Generators ──────────────────────────────────────────────────
const PALETTES = [
  { bg: '#0f0c29', c1: '#302b63', c2: '#24243e', accent: '#e94560' },
  { bg: '#0a192f', c1: '#172a45', c2: '#1e3a5f', accent: '#64ffda' },
  { bg: '#1a0a2e', c1: '#2d1b69', c2: '#5b21b6', accent: '#f59e0b' },
  { bg: '#0d1117', c1: '#161b22', c2: '#21262d', accent: '#58a6ff' },
  { bg: '#1b0a00', c1: '#3d1c00', c2: '#6b3000', accent: '#ff6b35' },
  { bg: '#001a0a', c1: '#003d1c', c2: '#006b30', accent: '#00ff88' },
  { bg: '#1a000a', c1: '#3d001c', c2: '#6b0030', accent: '#ff0066' },
  { bg: '#0a001a', c1: '#1c003d', c2: '#30006b', accent: '#9945ff' },
  { bg: '#1a1a00', c1: '#3d3d00', c2: '#6b6b00', accent: '#ffff33' },
  { bg: '#001a1a', c1: '#003d3d', c2: '#006b6b', accent: '#00ffff' },
  { bg: '#120024', c1: '#240048', c2: '#48008f', accent: '#ff00ff' },
  { bg: '#0f1923', c1: '#1a2e3b', c2: '#2a4a5e', accent: '#ff7043' },
  { bg: '#1c0b00', c1: '#381600', c2: '#5c2800', accent: '#ffd700' },
];

function generateGemSVG(name: string, idx: number): string {
  const p = PALETTES[idx % PALETTES.length];
  const seed = idx * 137;
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const r = 80 + ((seed * (i + 1)) % 30);
    return `${200 + r * Math.cos(angle)},${200 + r * Math.sin(angle)}`;
  }).join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="bg${idx}" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="${p.c1}"/>
      <stop offset="100%" stop-color="${p.bg}"/>
    </radialGradient>
    <linearGradient id="gem${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="${p.c2}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0.5"/>
    </linearGradient>
    <filter id="glow${idx}">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="400" height="400" fill="url(#bg${idx})" rx="20"/>
  <polygon points="${points}" fill="url(#gem${idx})" stroke="${p.accent}" stroke-width="2" filter="url(#glow${idx})"/>
  <circle cx="200" cy="200" r="20" fill="${p.accent}" opacity="0.8" filter="url(#glow${idx})"/>
  <text x="200" y="370" text-anchor="middle" fill="${p.accent}" font-family="monospace" font-size="16" font-weight="bold" opacity="0.9">${name}</text>
</svg>`;
}

function generateWaveSVG(name: string, idx: number): string {
  const p = PALETTES[(idx + 5) % PALETTES.length];
  const layers = Array.from({ length: 5 }, (_, i) => {
    const y = 120 + i * 50;
    const amp = 30 + ((idx * 17 + i * 23) % 20);
    const freq = 0.8 + ((idx * 7 + i * 13) % 5) * 0.1;
    const opacity = 0.3 + i * 0.12;
    const d = `M0,${y} Q100,${y - amp} 200,${y} T400,${y} L400,400 L0,400 Z`;
    return `<path d="${d}" fill="${p.accent}" opacity="${opacity}"/>`;
  }).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="sky${idx}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${p.bg}"/>
      <stop offset="100%" stop-color="${p.c1}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#sky${idx})" rx="20"/>
  ${layers}
  <circle cx="320" cy="80" r="35" fill="${p.accent}" opacity="0.2"/>
  <circle cx="320" cy="80" r="20" fill="${p.accent}" opacity="0.4"/>
  <text x="200" y="370" text-anchor="middle" fill="white" font-family="monospace" font-size="16" font-weight="bold" opacity="0.9">${name}</text>
</svg>`;
}

function generateCircuitSVG(name: string, idx: number): string {
  const p = PALETTES[(idx + 3) % PALETTES.length];
  const lines: string[] = [];
  const seed = idx * 97;
  for (let i = 0; i < 12; i++) {
    const x1 = (seed * (i + 1) * 37) % 360 + 20;
    const y1 = (seed * (i + 1) * 53) % 360 + 20;
    const x2 = (seed * (i + 2) * 41) % 360 + 20;
    const y2 = (seed * (i + 2) * 59) % 360 + 20;
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${p.accent}" stroke-width="1.5" opacity="0.4"/>`);
    lines.push(`<circle cx="${x1}" cy="${y1}" r="4" fill="${p.accent}" opacity="0.6"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="${p.bg}" rx="20"/>
  <rect x="40" y="40" width="320" height="320" fill="none" stroke="${p.c2}" stroke-width="1" rx="10" opacity="0.5"/>
  ${lines.join('\n  ')}
  <rect x="140" y="140" width="120" height="120" fill="${p.c1}" stroke="${p.accent}" stroke-width="2" rx="8" opacity="0.7"/>
  <text x="200" y="208" text-anchor="middle" fill="${p.accent}" font-family="monospace" font-size="22" font-weight="bold">#${idx + 1}</text>
  <text x="200" y="370" text-anchor="middle" fill="${p.accent}" font-family="monospace" font-size="16" font-weight="bold" opacity="0.9">${name}</text>
</svg>`;
}

// ── NFT Collection ──────────────────────────────────────────────────
const NFT_COLLECTION = [
  { name: 'Cosmic Shard',       desc: 'A crystallized fragment of deep space energy, pulsing with ethereal light.',              rarity: 'Legendary', type: 'Gem',     power: 95, gen: generateGemSVG },
  { name: 'Abyssal Wave',       desc: 'Captured ocean currents from the deepest trenches, frozen in perpetual motion.',          rarity: 'Epic',      type: 'Wave',    power: 82, gen: generateWaveSVG },
  { name: 'Neural Core',        desc: 'A synthetic intelligence node, processing millions of decisions per second.',             rarity: 'Rare',      type: 'Circuit', power: 78, gen: generateCircuitSVG },
  { name: 'Ember Prism',        desc: 'Volcanic glass forged under extreme pressure, refracting light into impossible colors.',  rarity: 'Epic',      type: 'Gem',     power: 85, gen: generateGemSVG },
  { name: 'Tidal Resonance',    desc: 'Harmonic frequencies from colliding ocean waves, visualized as pure energy.',             rarity: 'Rare',      type: 'Wave',    power: 71, gen: generateWaveSVG },
  { name: 'Quantum Circuit',    desc: 'A schematic from a quantum computer operating in superposition.',                         rarity: 'Legendary', type: 'Circuit', power: 92, gen: generateCircuitSVG },
  { name: 'Void Crystal',       desc: 'Formed in the absence of matter, this crystal absorbs all light that touches it.',        rarity: 'Epic',      type: 'Gem',     power: 88, gen: generateGemSVG },
  { name: 'Storm Surge',        desc: 'The raw power of a category 5 hurricane, compressed into a single frame.',                rarity: 'Rare',      type: 'Wave',    power: 74, gen: generateWaveSVG },
  { name: 'Photon Grid',        desc: 'A lattice of trapped photons forming an impossible geometric pattern.',                   rarity: 'Uncommon',  type: 'Circuit', power: 65, gen: generateCircuitSVG },
  { name: 'Nebula Heart',       desc: 'The dense core of a dying nebula, radiating ancient starlight.',                          rarity: 'Legendary', type: 'Gem',     power: 98, gen: generateGemSVG },
  { name: 'Rift Tide',          desc: 'Waters pulled through a dimensional tear, flowing in impossible directions.',             rarity: 'Epic',      type: 'Wave',    power: 80, gen: generateWaveSVG },
  { name: 'Cipher Matrix',      desc: 'An encrypted data structure that rewrites itself every millisecond.',                     rarity: 'Uncommon',  type: 'Circuit', power: 60, gen: generateCircuitSVG },
  { name: 'Solar Flare Gem',    desc: 'Crystallized plasma ejected from the sun, still burning after millions of years.',        rarity: 'Rare',      type: 'Gem',     power: 76, gen: generateGemSVG },
];

// ── Pinata Upload ───────────────────────────────────────────────────
async function uploadToPinata(svgContent: string, fileName: string): Promise<string> {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('pinataMetadata', JSON.stringify({ name: fileName }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { IpfsHash: string };
  return data.IpfsHash;
}

async function uploadMetadata(metadata: object, name: string): Promise<string> {
  const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, `${name}.json`);
  formData.append('pinataMetadata', JSON.stringify({ name: `${name}-metadata` }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata metadata upload failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { IpfsHash: string };
  return data.IpfsHash;
}

// ── Main Seed ───────────────────────────────────────────────────────
async function main() {
  console.log('🌱 NFT Trading Platform - Demo Seeder\n');

  // Setup providers and wallets
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const owner = new ethers.Wallet(OWNER_KEY, provider);
  const buyer = new ethers.Wallet(BUYER_KEY, provider);

  console.log(`👤 Owner: ${owner.address}`);
  console.log(`👤 Buyer: ${buyer.address}\n`);

  // Load ABIs
  const nftABI = JSON.parse(readFileSync(join(__dirname, '..', 'backend', 'abis', 'GameNFT.json'), 'utf8')).abi;
  const marketABI = JSON.parse(readFileSync(join(__dirname, '..', 'backend', 'abis', 'Marketplace.json'), 'utf8')).abi;

  const nft = new ethers.Contract(NFT_ADDRESS, nftABI, owner);
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, marketABI, owner);

  // ── Phase 1: Upload SVGs and metadata to Pinata, mint NFTs ────
  console.log('📸 Phase 1: Generating art, uploading to IPFS, minting...\n');

  const mintedTokenIds: bigint[] = [];

  for (let i = 0; i < NFT_COLLECTION.length; i++) {
    const item = NFT_COLLECTION[i];
    const svg = item.gen(item.name, i);

    // Upload SVG image
    process.stdout.write(`  [${i + 1}/${NFT_COLLECTION.length}] ${item.name}... `);
    const imageHash = await uploadToPinata(svg, `${item.name.toLowerCase().replace(/\s+/g, '-')}.svg`);
    const imageUrl = `ipfs://${imageHash}`;

    // Build and upload metadata
    const metadata = {
      name: item.name,
      description: item.desc,
      image: imageUrl,
      attributes: [
        { trait_type: 'Rarity', value: item.rarity },
        { trait_type: 'Type', value: item.type },
        { trait_type: 'Power', value: item.power },
      ],
    };
    const metadataHash = await uploadMetadata(metadata, item.name.toLowerCase().replace(/\s+/g, '-'));
    const tokenURI = `ipfs://${metadataHash}`;

    // Mint
    const tx = await nft.mint(owner.address, tokenURI);
    const receipt = await tx.wait();

    // Get token ID from Minted event
    const mintedEvent = receipt.logs.find((log: any) => {
      try { return nft.interface.parseLog(log)?.name === 'Minted'; } catch { return false; }
    });
    const tokenId = nft.interface.parseLog(mintedEvent)!.args.tokenId;
    mintedTokenIds.push(tokenId);

    console.log(`✅ Token #${tokenId} (${imageHash.slice(0, 8)}...)`);
  }

  console.log(`\n🎉 Minted ${mintedTokenIds.length} NFTs\n`);

  // ── Phase 2: Approve marketplace and list NFTs ────────────────
  console.log('🏪 Phase 2: Listing NFTs on marketplace...\n');

  // Get fresh nonce to avoid stale cache
  let ownerNonce = await provider.getTransactionCount(owner.address, 'latest');

  // Approve marketplace for all
  const approveTx = await nft.setApprovalForAll(MARKETPLACE_ADDRESS, true, { nonce: ownerNonce++ });
  await approveTx.wait();
  console.log('  ✅ Marketplace approved for all NFTs\n');

  // List first 8 NFTs with varied prices
  const listPrices = ['0.15', '0.25', '0.5', '0.75', '1.0', '1.5', '2.0', '0.3'];
  const listedTokens: { tokenId: bigint; price: string }[] = [];

  for (let i = 0; i < Math.min(8, mintedTokenIds.length); i++) {
    const tokenId = mintedTokenIds[i];
    const price = listPrices[i];
    const priceWei = ethers.parseEther(price);

    const tx = await marketplace.listNFT(NFT_ADDRESS, tokenId, priceWei, { nonce: ownerNonce++ });
    await tx.wait();
    listedTokens.push({ tokenId, price });
    console.log(`  📋 Listed Token #${tokenId} "${NFT_COLLECTION[i].name}" at ${price} ETH`);
  }

  console.log(`\n🏷️  Listed ${listedTokens.length} NFTs\n`);

  // ── Phase 3: Buy some NFTs with buyer account ─────────────────
  console.log('💰 Phase 3: Buying NFTs with buyer account...\n');

  const marketplaceBuyer = new ethers.Contract(MARKETPLACE_ADDRESS, marketABI, buyer);
  let buyerNonce = await provider.getTransactionCount(buyer.address, 'latest');

  // Buy 3 NFTs
  const buyIndices = [0, 2, 5]; // Cosmic Shard, Neural Core, Quantum Circuit
  for (const idx of buyIndices) {
    const tokenId = listedTokens[idx].tokenId;
    const price = listedTokens[idx].price;
    const priceWei = ethers.parseEther(price);

    const tx = await marketplaceBuyer.buyNFT(NFT_ADDRESS, tokenId, { value: priceWei, nonce: buyerNonce++ });
    await tx.wait();
    console.log(`  🛒 Bought Token #${tokenId} "${NFT_COLLECTION[Number(tokenId) - 1].name}" for ${price} ETH`);
  }

  console.log('\n✨ Seeding complete!\n');
  console.log('📊 Summary:');
  console.log(`   Minted: ${mintedTokenIds.length} NFTs`);
  console.log(`   Listed: ${listedTokens.length} on marketplace`);
  console.log(`   Sold:   ${buyIndices.length} purchased by buyer`);
  console.log(`   Still listed: ${listedTokens.length - buyIndices.length} available`);
  console.log('\n🌐 Open http://localhost:3002 to see the marketplace');
  console.log('🎨 Open http://localhost:3003 to see the creator dashboard');
}

main().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});
