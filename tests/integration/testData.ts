import { PinataSDK } from 'pinata-web3';
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Pinata config from creator-dashboard/.env
dotenv.config({ path: resolve(__dirname, '../../creator-dashboard/.env') });

// Initialize Pinata
let pinataInstance: PinataSDK | null = null;

export function getPinata(): PinataSDK | null {
  if (pinataInstance) return pinataInstance;
  
  const jwt = process.env.VITE_PINATA_JWT;
  const gateway = process.env.VITE_PINATA_GATEWAY || 'gateway.pinata.cloud';
  
  if (!jwt || jwt === 'your_pinata_jwt') {
    console.warn('⚠️  Pinata not configured. Set VITE_PINATA_JWT in creator-dashboard/.env');
    return null;
  }
  
  pinataInstance = new PinataSDK({
    pinataJwt: jwt,
    pinataGateway: gateway,
  });
  
  return pinataInstance;
}

// Sample NFT data with visual attributes
export const TEST_NFTS = [
  {
    name: 'Legendary Sword #Test1',
    description: 'A powerful sword forged in dragon fire. This blade was created during the great war and imbued with ancient magic.',
    attributes: [
      { trait_type: 'Rarity', value: 'Legendary' },
      { trait_type: 'Damage', value: 150 },
      { trait_type: 'Element', value: 'Fire' },
      { trait_type: 'Level', value: 50 },
      { trait_type: 'Type', value: 'Weapon' }
    ],
    color: '#FF4500' // Orange-red
  },
  {
    name: 'Epic Shield #Test2',
    description: 'An enchanted shield that blocks all magic attacks. Crafted by elven smiths in the age of heroes.',
    attributes: [
      { trait_type: 'Rarity', value: 'Epic' },
      { trait_type: 'Defense', value: 120 },
      { trait_type: 'Element', value: 'Arcane' },
      { trait_type: 'Level', value: 45 },
      { trait_type: 'Type', value: 'Armor' }
    ],
    color: '#9370DB' // Purple
  },
  {
    name: 'Rare Potion #Test3',
    description: 'Restores 100 HP instantly. Brewed by master alchemists using moonlight flowers and phoenix tears.',
    attributes: [
      { trait_type: 'Rarity', value: 'Rare' },
      { trait_type: 'Healing', value: 100 },
      { trait_type: 'Type', value: 'Consumable' },
      { trait_type: 'Uses', value: 1 }
    ],
    color: '#FF1493' // Hot pink
  },
  {
    name: 'Dragon Armor #Test4',
    description: 'Armor forged from dragon scales. Provides exceptional protection and fire resistance.',
    attributes: [
      { trait_type: 'Rarity', value: 'Legendary' },
      { trait_type: 'Defense', value: 200 },
      { trait_type: 'Element', value: 'Fire' },
      { trait_type: 'Level', value: 60 },
      { trait_type: 'Type', value: 'Armor' }
    ],
    color: '#DC143C' // Crimson
  },
  {
    name: 'Mana Crystal #Test5',
    description: 'Restores 50 MP and increases spell power for 5 minutes. A rare gift from the Crystal Caverns.',
    attributes: [
      { trait_type: 'Rarity', value: 'Rare' },
      { trait_type: 'Mana', value: 50 },
      { trait_type: 'Type', value: 'Consumable' },
      { trait_type: 'Buff Duration', value: '5 min' }
    ],
    color: '#00CED1' // Cyan
  },
];

// Generate SVG image for an NFT
export function generateNFTImage(nft: typeof TEST_NFTS[0], tokenId: number): string {
  const svg = `
<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${tokenId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${nft.color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
    </linearGradient>
    <filter id="glow${tokenId}">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="500" height="500" fill="url(#grad${tokenId})"/>
  
  <!-- Outer Border -->
  <rect x="10" y="10" width="480" height="480" fill="none" stroke="white" stroke-width="4" opacity="0.8"/>
  <rect x="15" y="15" width="470" height="470" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
  
  <!-- Title -->
  <text x="250" y="70" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle" filter="url(#glow${tokenId})">
    ${nft.name}
  </text>
  
  <!-- Token ID Badge -->
  <rect x="210" y="90" width="80" height="30" rx="15" fill="rgba(0,0,0,0.7)"/>
  <text x="250" y="112" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle">
    #${tokenId}
  </text>
  
  <!-- Center Icon -->
  <circle cx="250" cy="250" r="90" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="4"/>
  <circle cx="250" cy="250" r="70" fill="none" stroke="white" stroke-width="3" opacity="0.6"/>
  <circle cx="250" cy="250" r="50" fill="none" stroke="white" stroke-width="2" opacity="0.4"/>
  
  <!-- Type Icon Text -->
  <text x="250" y="265" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">
    ${nft.attributes.find((a: any) => a.trait_type === 'Type')?.value || 'Item'}
  </text>
  
  <!-- Rarity Badge -->
  <rect x="175" y="360" width="150" height="45" rx="22" fill="rgba(0,0,0,0.8)"/>
  <text x="250" y="390" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="${nft.color}" text-anchor="middle" filter="url(#glow${tokenId})">
    ${nft.attributes.find((a: any) => a.trait_type === 'Rarity')?.value || 'Common'}
  </text>
  
  <!-- Stats Box -->
  <rect x="50" y="420" width="400" height="60" rx="10" fill="rgba(0,0,0,0.6)" stroke="white" stroke-width="2" opacity="0.8"/>
  
  <!-- Level/Power Stat -->
  <text x="70" y="445" font-family="Arial, sans-serif" font-size="14" fill="white">
    ${nft.attributes.find((a: any) => a.trait_type === 'Level')?.trait_type || 'Power'}: ${nft.attributes.find((a: any) => a.trait_type === 'Level' || a.trait_type === 'Damage' || a.trait_type === 'Defense' || a.trait_type === 'Healing')?.value || 'N/A'}
  </text>
  
  <!-- Element -->
  <text x="70" y="465" font-family="Arial, sans-serif" font-size="14" fill="white">
    Element: ${nft.attributes.find((a: any) => a.trait_type === 'Element')?.value || 'None'}
  </text>
  
  <!-- Test Indicator -->
  <text x="250" y="30" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.7)" text-anchor="middle">
    E2E Test NFT
  </text>
</svg>`;
  
  return svg;
}

// Upload image to IPFS
export async function uploadImageToPinata(svg: string, filename: string): Promise<string | null> {
  const pinata = getPinata();
  
  if (!pinata) {
    console.log(`   ⚠️  Pinata not configured, skipping image upload`);
    return null;
  }
  
  try {
    console.log(`   📤 Uploading image: ${filename}`);
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const file = new File([blob], filename, { type: 'image/svg+xml' });
    
    const upload = await pinata.upload.file(file);
    const cid = (upload as any).IpfsHash || (upload as any).cid;
    
    console.log(`   ✅ Image uploaded: ipfs://${cid}`);
    return cid;
  } catch (error) {
    console.error(`   ❌ Image upload failed: ${error}`);
    return null;
  }
}

// Upload metadata to IPFS
export async function uploadMetadataToPinata(metadata: any, filename: string): Promise<string | null> {
  const pinata = getPinata();
  
  if (!pinata) {
    console.log(`   ⚠️  Pinata not configured, skipping metadata upload`);
    return null;
  }
  
  try {
    console.log(`   📤 Uploading metadata: ${filename}`);
    
    const upload = await pinata.upload.json(metadata);
    const cid = (upload as any).IpfsHash || (upload as any).cid;
    
    console.log(`   ✅ Metadata uploaded: ipfs://${cid}`);
    return cid;
  } catch (error) {
    console.error(`   ❌ Metadata upload failed: ${error}`);
    return null;
  }
}

// Create tokenURI (real IPFS or fallback mock)
export async function createTokenURI(nft: typeof TEST_NFTS[0], tokenId: number): Promise<string> {
  const pinata = getPinata();
  
  if (!pinata) {
    // Fallback to mock URI
    console.log(`   📝 Using mock tokenURI (Pinata not configured)`);
    return `ipfs://QmTest${tokenId}/metadata.json`;
  }
  
  try {
    // Generate SVG image
    const svg = generateNFTImage(nft, tokenId);
    
    // Upload image
    const imageCID = await uploadImageToPinata(svg, `${nft.name.replace(/\s+/g, '_')}_${tokenId}.svg`);
    
    if (!imageCID) {
      console.log(`   📝 Using mock tokenURI (image upload failed)`);
      return `ipfs://QmTest${tokenId}/metadata.json`;
    }
    
    // Create ERC-721 compliant metadata
    const metadata = {
      name: nft.name,
      description: nft.description,
      image: `ipfs://${imageCID}`,
      attributes: nft.attributes
    };
    
    // Upload metadata
    const metadataCID = await uploadMetadataToPinata(metadata, `${nft.name.replace(/\s+/g, '_')}_${tokenId}_metadata.json`);
    
    if (!metadataCID) {
      console.log(`   📝 Using mock tokenURI (metadata upload failed)`);
      return `ipfs://QmTest${tokenId}/metadata.json`;
    }
    
    const tokenURI = `ipfs://${metadataCID}`;
    console.log(`   🎯 TokenURI: ${tokenURI}`);
    return tokenURI;
    
  } catch (error) {
    console.error(`   ❌ IPFS upload failed: ${error}`);
    console.log(`   📝 Using mock tokenURI`);
    return `ipfs://QmTest${tokenId}/metadata.json`;
  }
}

// Check if Pinata is configured
export function isPinataConfigured(): boolean {
  const jwt = process.env.VITE_PINATA_JWT;
  return !!(jwt && jwt !== 'your_pinata_jwt');
}

// Get Pinata status message
export function getPinataStatus(): string {
  if (isPinataConfigured()) {
    return `✅ Pinata configured (Gateway: ${process.env.VITE_PINATA_GATEWAY})`;
  }
  return '⚠️  Pinata not configured - using mock tokenURIs';
}