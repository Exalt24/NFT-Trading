import { Contract, BrowserProvider, JsonRpcSigner, ContractRunner } from 'ethers';
import { NFT_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ADDRESS } from '../utils/constants';
import GameNFTArtifact from '../abis/GameNFT.json';
import MarketplaceArtifact from '../abis/Marketplace.json';

const GameNFTABI = GameNFTArtifact.abi;
const MarketplaceABI = MarketplaceArtifact.abi;

export function getProvider(): BrowserProvider | null {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }
  return new BrowserProvider(window.ethereum);
}

export async function getSigner(): Promise<JsonRpcSigner | null> {
  const provider = getProvider();
  if (!provider) return null;
  
  try {
    return await provider.getSigner();
  } catch (error) {
    console.error('Error getting signer:', error);
    return null;
  }
}

export function getNFTContract(signerOrProvider: ContractRunner): Contract {
  if (!NFT_CONTRACT_ADDRESS) {
    throw new Error('NFT contract address not configured');
  }
  return new Contract(NFT_CONTRACT_ADDRESS, GameNFTABI, signerOrProvider);
}

export function getMarketplaceContract(signerOrProvider: ContractRunner): Contract {
  if (!MARKETPLACE_CONTRACT_ADDRESS) {
    throw new Error('Marketplace contract address not configured');
  }
  return new Contract(MARKETPLACE_CONTRACT_ADDRESS, MarketplaceABI, signerOrProvider);
}

export async function checkApproval(tokenId: number, signer: JsonRpcSigner): Promise<boolean> {
  try {
    const nftContract = getNFTContract(signer);
    const getApproved = nftContract.getFunction('getApproved');
    const approvedAddress = await getApproved(tokenId) as string;
    return approvedAddress.toLowerCase() === MARKETPLACE_CONTRACT_ADDRESS?.toLowerCase();
  } catch (error) {
    console.error('Error checking approval:', error);
    return false;
  }
}

export async function approveNFT(tokenId: number, signer: JsonRpcSigner): Promise<string> {
  const nftContract = getNFTContract(signer);
  const approve = nftContract.getFunction('approve');
  const tx = await approve(MARKETPLACE_CONTRACT_ADDRESS, tokenId);
  await tx.wait();
  return tx.hash;
}

export async function checkOwnership(tokenId: number, address: string, signer: JsonRpcSigner): Promise<boolean> {
  try {
    const nftContract = getNFTContract(signer);
    const ownerOf = nftContract.getFunction('ownerOf');
    const owner = await ownerOf(tokenId) as string;
    return owner.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Error checking ownership:', error);
    return false;
  }
}