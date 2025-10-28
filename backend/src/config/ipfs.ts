import { PinataSDK } from 'pinata-web3';
import { env } from './env.js';

if (!env.PINATA_JWT || env.PINATA_JWT === 'your_pinata_jwt_here') {
  console.warn('⚠️  PINATA_JWT not configured - IPFS features will be limited');
}

if (!env.PINATA_GATEWAY || env.PINATA_GATEWAY === 'your-gateway.mypinata.cloud') {
  console.warn('⚠️  PINATA_GATEWAY not configured - using default gateway');
}

export const pinata = env.PINATA_JWT && env.PINATA_JWT !== 'your_pinata_jwt_here'
  ? new PinataSDK({
      pinataJwt: env.PINATA_JWT,
      pinataGateway: env.PINATA_GATEWAY,
    })
  : null;

export async function testIPFSConnection(): Promise<boolean> {
  if (!pinata) {
    console.log('ℹ️  IPFS/Pinata not configured (optional for Phase 2 Part 1)');
    return true;
  }

  try {
    const testData = { test: 'connection', timestamp: Date.now() };
    const upload = await pinata.upload.json(testData);
    const cid = (upload as any).IpfsHash || (upload as any).cid;
    console.log(`✅ Pinata connected successfully. Test CID: ${cid}`);
    return true;
  } catch (error) {
    console.error('❌ Pinata connection failed:', error);
    return false;
  }
}

export function getIPFSUrl(cid: string): string {
  if (env.PINATA_GATEWAY && env.PINATA_GATEWAY !== 'your-gateway.mypinata.cloud') {
    return `https://${env.PINATA_GATEWAY}/ipfs/${cid}`;
  }
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}