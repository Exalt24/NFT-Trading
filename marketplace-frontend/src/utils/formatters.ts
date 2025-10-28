export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEther(wei: bigint | string | null | undefined): string {
  if (wei == null) return '0';
 
  try {
    if (typeof wei === 'string') {
      const trimmed = wei.trim();
      if (trimmed === '' || trimmed === '0') return '0';
    }
   
    const value = typeof wei === 'string' ? BigInt(wei) : wei;
    const eth = Number(value) / 1e18;
   
    if (eth === 0) return '0';
    if (eth < 0.0001) return '<0.0001';
    if (eth < 1) return eth.toFixed(4);
    if (eth < 10) return eth.toFixed(3);
    return eth.toFixed(2);
  } catch (error) {
    console.warn('Invalid ether value:', wei, error);
    return '0';
  }
}

// ✅ UPDATED: Handle Date objects, strings, and numbers
export function formatTimestamp(timestamp: number | string | Date | null | undefined): string {
  if (!timestamp) return 'Unknown';

  try {
    let date: Date;

    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      // Handle both seconds and milliseconds
      date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return 'Unknown';
    }

    // Validate date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', timestamp);
      return 'Unknown';
    }

    const now = Date.now();
    const diff = now - date.getTime();
   
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
   
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
   
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Unknown';
  }
}

export function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0';
 
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.01) return num.toFixed(3);
  return num.toFixed(4);
}

export function formatPercentage(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatTokenId(tokenId: number | string): string {
  return `#${tokenId}`;
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}

// ✅ UPDATED: Detect and convert wei format to ETH before formatting
export function formatPriceFromDB(price: string | number | null | undefined): string {
  if (!price || price === '0' || price === 0) return '0';

  try {
    // Convert to string for detection
    const priceStr = typeof price === 'number' ? price.toString() : price;

    // Detect if price is in wei format (long string with no decimals, >15 chars)
    const isWeiFormat = priceStr.length > 15 && !priceStr.includes('.');

    if (isWeiFormat) {
      // Price is in wei - convert to ETH first using formatEther
      const ethValue = formatEther(priceStr);
      // formatEther already returns a nicely formatted string, so return it directly
      return ethValue;
    } else {
      // Price is already in ETH format - just format it
      return formatPrice(price);
    }
  } catch (error) {
    console.error('Error formatting price from DB:', error, 'Value:', price);
    return '0';
  }
}