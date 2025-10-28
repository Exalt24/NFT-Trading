import { API_BASE_URL } from '../utils/constants';
import { MintedNFT, CreatorStats, MintingActivity, RoyaltyEarning, SaleByNFT, TradingHistory } from '../types';

/**
 * Convert snake_case keys to camelCase, but preserve ERC-721 attribute format.
 * Attributes must keep trait_type and value keys for standard compliance.
 */
function snakeToCamel(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }

  // Check if this object is an ERC-721 attribute (has trait_type and value)
  const isERC721Attribute = 'trait_type' in obj && 'value' in obj;

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Preserve ERC-721 attribute keys (don't convert trait_type or value)
    if (isERC721Attribute && (key === 'trait_type' || key === 'value')) {
      result[key] = value;
    } else {
      // Convert snake_case to camelCase for all other keys
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = snakeToCamel(value);
    }
  }
  return result;
}

async function fetchAPI<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return snakeToCamel(data) as T;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

export const api = {
  async getNFT(tokenId: number): Promise<MintedNFT> {
    return fetchAPI<MintedNFT>(`/nft/${tokenId}`);
  },

  async getNFTsByOwner(address: string): Promise<MintedNFT[]> {
    return fetchAPI<MintedNFT[]>(`/nft/owner/${address}`);
  },

  async getNFTMetadata(tokenId: number): Promise<any> {
    return fetchAPI<any>(`/nft/metadata/${tokenId}`);
  },

  async getTotalSupply(): Promise<number> {
    const response = await fetchAPI<{ total: number }>('/nft/total');
    return response.total;
  },

  async getRecentNFTs(limit = 20): Promise<MintedNFT[]> {
    return fetchAPI<MintedNFT[]>(`/nft/recent?limit=${limit}`);
  },

  async getActiveListings(): Promise<any[]> {
    return fetchAPI<any[]>('/marketplace/listings');
  },

  async getListingsBySeller(address: string): Promise<any[]> {
    return fetchAPI<any[]>(`/marketplace/seller/${address}`);
  },

  async getTradingVolume(): Promise<string> {
    const response = await fetchAPI<{ volume: string }>('/marketplace/volume');
    return response.volume;
  },

  async getTradingHistory(tokenId: number): Promise<TradingHistory[]> {
    const nftContract = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
    return fetchAPI<TradingHistory[]>(`/marketplace/history/${tokenId}?contract=${nftContract}`);
  },

  async getPlatformStats(): Promise<any> {
    return fetchAPI<any>('/analytics/stats');
  },

  async getUserStats(address: string): Promise<any> {
    return fetchAPI<any>(`/analytics/user/${address}`);
  },

  async getAllRecentSales(): Promise<TradingHistory[]> {
    return fetchAPI<TradingHistory[]>('/marketplace/recent-sales?limit=100');
  },

  async getCreatorStats(address: string): Promise<{
  totalMinted: number;
  totalSold: number;
  totalRevenue: string;
  totalRoyalties: string;
  avgPrice: string;
  floorPrice: string;
  salesHistory: TradingHistory[];
  royaltyHistory: Array<{
    tokenId: number;
    royaltyFee: string;
    soldAt: string;
  }>;
}> {
  return fetchAPI(`/analytics/creator/${address}`);
},

  async getMintingActivity(address: string, days = 30): Promise<MintingActivity[]> {
    const nfts = await this.getNFTsByOwner(address);

    const activityMap = new Map<string, number>();
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    nfts.forEach(nft => {
      if (nft.minted_at) {
        const date = new Date(nft.minted_at);
        if (date >= cutoff) {
          const dateKey = date.toISOString().split('T')[0] || '';
          if (dateKey) {
            activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
          }
        }
      }
    });

    const activity: MintingActivity[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0] || '';
      if (dateKey) {
        activity.push({
          date: dateKey,
          count: activityMap.get(dateKey) || 0
        });
      }
    }

    return activity;
  },

  async getRoyaltyEarnings(_address: string): Promise<RoyaltyEarning[]> {
    // TODO: Backend endpoint for royalty earnings by month
    // For now, return empty array
    return [];
  },

  async getSalesByNFT(_address: string, _limit = 10): Promise<SaleByNFT[]> {
    // TODO: Backend endpoint for sales aggregated by token
    // For now, return empty array
    return [];
  }
};