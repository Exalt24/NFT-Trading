import { formatEther as ethersFormatEther, parseEther } from 'ethers';

export function formatAddress(address: string | null | undefined): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEther(wei: string | bigint): string {
  try {
    if (typeof wei === 'string') {
      if (wei.includes('.')) {
        return parseFloat(wei).toFixed(4);
      }
      return ethersFormatEther(wei);
    }
    return ethersFormatEther(wei);
  } catch (error) {
    console.error('Error formatting ether:', error);
    return '0';
  }
}

export function formatEtherValue(wei: string | bigint): string {
  try {
    const eth = ethersFormatEther(wei);
    const num = parseFloat(eth);
   
    if (num === 0) return '0 ETH';
    if (num < 0.0001) return '<0.0001 ETH';
    if (num < 1) return `${num.toFixed(4)} ETH`;
    if (num < 1000) return `${num.toFixed(2)} ETH`;
   
    return `${formatPrice(num)} ETH`;
  } catch {
    return '0 ETH';
  }
}

export function formatPrice(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(2);
}

export function formatTimestamp(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
 
  return date.toLocaleDateString();
}

export function formatDate(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatPercentage(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(2)}%`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function parseEtherInput(value: string): bigint {
  try {
    return parseEther(value);
  } catch {
    return 0n;
  }
}

export function validateEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function validatePrice(price: string): { valid: boolean; error?: string } {
  const num = parseFloat(price);
 
  if (isNaN(num)) {
    return { valid: false, error: 'Invalid number' };
  }
 
  if (num <= 0) {
    return { valid: false, error: 'Price must be greater than 0' };
  }
 
  if (num < 0.000001) {
    return { valid: false, error: 'Minimum price is 0.000001 ETH' };
  }
 
  if (num > 1_000_000) {
    return { valid: false, error: 'Maximum price is 1,000,000 ETH' };
  }
 
  const decimals = (price.split('.')[1] || '').length;
  if (decimals > 18) {
    return { valid: false, error: 'Maximum 18 decimal places' };
  }
 
  return { valid: true };
}

export function shortenString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}