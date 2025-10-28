export function exportToCSV(
  data: Array<Record<string, any>>,
  filename: string,
  headers?: Record<string, string>
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const firstRow = data[0];
  if (!firstRow) {
    console.warn('No data to export');
    return;
  }

  const keys = Object.keys(firstRow);
  const headerRow = headers
    ? keys.map(key => headers[key] || key).join(',')
    : keys.join(',');

  const rows = data.map(row =>
    keys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  const csv = [headerRow, ...rows].join('\n');
  downloadCSV(csv, filename);
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function exportMintingActivity(
  data: Array<{ date: string; count: number }>,
  filename: string = 'minting-activity.csv'
): void {
  exportToCSV(data, filename, {
    date: 'Date',
    count: 'NFTs Minted'
  });
}

export function exportSalesActivity(
  data: Array<{ date: string; volume: number; count: number }>,
  filename: string = 'sales-activity.csv'
): void {
  exportToCSV(data, filename, {
    date: 'Date',
    volume: 'Volume (ETH)',
    count: 'Sales Count'
  });
}

export function exportRoyaltyEarnings(
  data: Array<{ date: string; amount: number; count: number }>,
  filename: string = 'royalty-earnings.csv'
): void {
  exportToCSV(data, filename, {
    date: 'Date',
    amount: 'Royalties (ETH)',
    count: 'Transactions'
  });
}

export function exportTopNFTs(
  data: Array<{ tokenId: number; name: string; salesCount: number; totalVolume: number }>,
  filename: string = 'top-nfts.csv'
): void {
  exportToCSV(data, filename, {
    tokenId: 'Token ID',
    name: 'NFT Name',
    salesCount: 'Sales Count',
    totalVolume: 'Total Volume (ETH)'
  });
}