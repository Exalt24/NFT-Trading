import { BrowserProvider, Contract, JsonRpcSigner, Eip1193Provider } from 'ethers';
import { CONTRACT_ADDRESSES } from '../utils/constants';
import GameNFTABI from '../abis/GameNFT.json';
import MarketplaceABI from '../abis/Marketplace.json';

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

let provider: BrowserProvider | null = null;
let nftContract: Contract | null = null;
let marketplaceContract: Contract | null = null;

export async function initProvider(): Promise<BrowserProvider> {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected');
  }
  
  if (!provider) {
    provider = new BrowserProvider(window.ethereum);
  }
  
  return provider;
}

export async function getProvider(): Promise<BrowserProvider> {
  if (!provider) {
    return initProvider();
  }
  return provider;
}

export async function getSigner(): Promise<JsonRpcSigner> {
  const prov = await getProvider();
  return await prov.getSigner();
}

export async function getNFTContract(withSigner = false): Promise<Contract> {
  if (!CONTRACT_ADDRESSES.NFT) {
    throw new Error('NFT contract address not configured');
  }
  
  if (withSigner) {
    const signer = await getSigner();
    return new Contract(CONTRACT_ADDRESSES.NFT, GameNFTABI.abi, signer);
  }
  
  if (!nftContract) {
    const prov = await getProvider();
    nftContract = new Contract(CONTRACT_ADDRESSES.NFT, GameNFTABI.abi, prov);
  }
  
  return nftContract;
}

export async function getMarketplaceContract(withSigner = false): Promise<Contract> {
  if (!CONTRACT_ADDRESSES.MARKETPLACE) {
    throw new Error('Marketplace contract address not configured');
  }
  
  if (withSigner) {
    const signer = await getSigner();
    return new Contract(CONTRACT_ADDRESSES.MARKETPLACE, MarketplaceABI.abi, signer);
  }
  
  if (!marketplaceContract) {
    const prov = await getProvider();
    marketplaceContract = new Contract(CONTRACT_ADDRESSES.MARKETPLACE, MarketplaceABI.abi, prov);
  }
  
  return marketplaceContract;
}

export async function getContractOwner(): Promise<string> {
  const contract = await getNFTContract();
  return await (contract as any).owner();
}

export async function getCurrentTokenId(): Promise<number> {
  const contract = await getNFTContract();
  const tokenId = await (contract as any).getCurrentTokenId();
  return Number(tokenId);
}

export async function getRoyaltyInfo(tokenId: number, salePrice: bigint): Promise<{ receiver: string; amount: bigint }> {
  const contract = await getNFTContract();
  const [receiver, royaltyAmount] = await (contract as any).royaltyInfo(tokenId, salePrice);
  return { receiver, amount: royaltyAmount };
}

export async function getDefaultRoyalty(): Promise<{ receiver: string; feeNumerator: number }> {
  const contract = await getNFTContract();
  
  try {
    const [receiver, feeNumerator] = await (contract as any).royaltyInfo(0, 10000n);
    return { 
      receiver, 
      feeNumerator: Number((feeNumerator * 10000n) / 10000n)
    };
  } catch {
    return { 
      receiver: await getContractOwner(), 
      feeNumerator: 250 
    };
  }
}

export async function isApprovedForMarketplace(address: string): Promise<boolean> {
  const contract = await getNFTContract();
  const isApproved = await (contract as any).isApprovedForAll(address, CONTRACT_ADDRESSES.MARKETPLACE);
  return isApproved;
}

export async function getTokenURI(tokenId: number): Promise<string> {
  const contract = await getNFTContract();
  return await (contract as any).tokenURI(tokenId);
}

export async function ownerOf(tokenId: number): Promise<string> {
  const contract = await getNFTContract();
  return await (contract as any).ownerOf(tokenId);
}

export async function balanceOf(address: string): Promise<number> {
  const contract = await getNFTContract();
  const balance = await (contract as any).balanceOf(address);
  return Number(balance);
}

export function resetContracts(): void {
  provider = null;
  nftContract = null;
  marketplaceContract = null;
}