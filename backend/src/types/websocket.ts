/** Events the indexer broadcasts to subscribed clients. `price` fields are wei as decimal strings. */
interface BaseEvent {
  timestamp: number;
  blockNumber: number;
}

export type NFTEvent =
  | (BaseEvent & { type: 'nftMinted'; tokenId: number; owner: string; tokenURI: string })
  | (BaseEvent & { type: 'nftTransferred'; tokenId: number; from: string; to: string })
  | (BaseEvent & { type: 'nftListed'; tokenId: number; seller: string; price: string })
  | (BaseEvent & { type: 'nftSold'; tokenId: number; seller: string; buyer: string; price: string; platformFee: string; royaltyFee: string })
  | (BaseEvent & { type: 'nftCancelled'; tokenId: number; seller: string })
  | (BaseEvent & { type: 'priceUpdated'; tokenId: number; oldPrice: string; newPrice: string })
  | (BaseEvent & { type: 'defaultRoyaltyUpdated'; receiver: string; feeNumerator: number })
  | (BaseEvent & { type: 'tokenRoyaltyUpdated'; tokenId: number; receiver: string; feeNumerator: number });

export interface SubscriptionRequest {
  room: string;
}

export interface UnsubscriptionRequest {
  room: string;
}

export interface RoomInfo {
  name: string;
  type: 'global' | 'nft' | 'owner' | 'marketplace';
  subscribers: number;
}
