import { API_URL } from '../utils/constants';
import type { 
  NFT, 
  Listing, 
  TradingHistory, 
  PlatformStats, 
  Trader, 
  VolumeData, 
} from '../types';

/**
 * Convert snake_case keys to camelCase, but preserve ERC-721 attribute format.
 * Attributes must keep trait_type and value keys for standard compliance.
 */
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    // Check if this object is an ERC-721 attribute (has trait_type and value)
    const isERC721Attribute = 'trait_type' in obj && 'value' in obj;
    
    return Object.keys(obj).reduce((acc, key) => {
      // Preserve ERC-721 attribute keys (don't convert trait_type or value)
      if (isERC721Attribute && (key === 'trait_type' || key === 'value')) {
        acc[key] = obj[key];
      } else {
        // Convert snake_case to camelCase for all other keys
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        acc[camelKey] = toCamelCase(obj[key]);
      }
      return acc;
    }, {} as any);
  }
  
  return obj;
}

class APIService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return toCamelCase(data);
  }

  async getNFT(tokenId: number): Promise<NFT> {
    return this.fetch<NFT>(`/nft/${tokenId}`);
  }

  async getNFTsByOwner(address: string): Promise<NFT[]> {
    return this.fetch<NFT[]>(`/nft/owner/${address}`);
  }

  async getNFTMetadata(tokenId: number): Promise<NFT['metadata']> {
    return this.fetch<NFT['metadata']>(`/nft/metadata/${tokenId}`);
  }

  async getTotalSupply(): Promise<{ total: number }> {
    return this.fetch<{ total: number }>('/nft/total');
  }

  async getRecentNFTs(limit: number = 20): Promise<NFT[]> {
    return this.fetch<NFT[]>(`/nft/recent?limit=${limit}`);
  }

  async searchNFTs(query: string, limit: number = 20): Promise<NFT[]> {
    return this.fetch<NFT[]>(`/nft/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getActiveListings(): Promise<Listing[]> {
    return this.fetch<Listing[]>('/marketplace/listings');
  }

  async getListing(tokenId: number, contract: string): Promise<Listing> {
    return this.fetch<Listing>(`/marketplace/listing/${tokenId}?contract=${contract}`);
  }

  async getListingsBySeller(address: string): Promise<Listing[]> {
    return this.fetch<Listing[]>(`/marketplace/seller/${address}`);
  }

  async getFloorPrice(): Promise<{ floorPrice: string }> {
    return this.fetch<{ floorPrice: string }>('/marketplace/floor');
  }

  async getTradingVolume(): Promise<{ volume: string }> {
    return this.fetch<{ volume: string }>('/marketplace/volume');
  }

  async getPriceHistory(tokenId: number, contract: string): Promise<TradingHistory[]> {
    return this.fetch<TradingHistory[]>(`/marketplace/history/${tokenId}?contract=${contract}`);
  }

  async getRecentSales(limit: number = 20): Promise<TradingHistory[]> {
    return this.fetch<TradingHistory[]>(`/marketplace/recent-sales?limit=${limit}`);
  }

  async getMostExpensiveSales(limit: number = 10): Promise<TradingHistory[]> {
    return this.fetch<TradingHistory[]>(`/marketplace/expensive-sales?limit=${limit}`);
  }

  async getListingsByPriceRange(min: number, max: number): Promise<Listing[]> {
    return this.fetch<Listing[]>(`/marketplace/price-range?min=${min}&max=${max}`);
  }

  async getPlatformStats(): Promise<PlatformStats> {
    return this.fetch<PlatformStats>('/analytics/stats');
  }

  async getTopTraders(limit: number = 10): Promise<Trader[]> {
    return this.fetch<Trader[]>(`/analytics/top-traders?limit=${limit}`);
  }

  async getTradingVolumeOverTime(days: number = 30): Promise<VolumeData[]> {
    return this.fetch<VolumeData[]>(`/analytics/volume?days=${days}`);
  }

  async getPriceDistribution(): Promise<Array<{ range: string; count: number }>> {
    return this.fetch<Array<{ range: string; count: number }>>('/analytics/price-distribution');
  }

  async getUserStats(address: string): Promise<{
    nftsOwned: number;
    nftsMinted: number;
    totalSales: number;
    totalPurchases: number;
    salesVolume: string;
    purchaseVolume: string;
  }> {
    return this.fetch(`/analytics/user/${address}`);
  }

  async checkHealth(): Promise<{ status: string; timestamp: number }> {
    const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
    return response.json();
  }
}

export const api = new APIService(API_URL);