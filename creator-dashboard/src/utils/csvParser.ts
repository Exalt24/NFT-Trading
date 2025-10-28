import Papa from 'papaparse';
import { NFTMetadata, NFTAttribute } from '../types';

interface CSVRow {
  name?: string;
  description?: string;
  [key: string]: string | undefined;
}

interface ParseResult {
  success: boolean;
  metadata: NFTMetadata[];
  errors: string[];
}

const REQUIRED_COLUMNS = ['name', 'description'];
const RESERVED_COLUMNS = ['name', 'description', 'image'];

export function parseMetadataCSV(csvContent: string): ParseResult {
  const errors: string[] = [];
  const metadata: NFTMetadata[] = [];

  const parseResult = Papa.parse<CSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parseResult.errors.length > 0) {
    parseResult.errors.forEach((error) => {
      errors.push(`Row ${error.row}: ${error.message}`);
    });
  }

  const headers = parseResult.meta.fields || [];
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    return { success: false, metadata: [], errors };
  }

  parseResult.data.forEach((row, index) => {
    const rowErrors: string[] = [];
    const rowNumber = index + 2;

    if (!row.name || row.name.trim() === '') {
      rowErrors.push(`Row ${rowNumber}: Name is required`);
    }

    if (!row.description || row.description.trim() === '') {
      rowErrors.push(`Row ${rowNumber}: Description is required`);
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    const attributes: NFTAttribute[] = [];
    Object.entries(row).forEach(([key, value]) => {
      if (!RESERVED_COLUMNS.includes(key) && value && value.trim() !== '') {
        attributes.push({
          trait_type: key.charAt(0).toUpperCase() + key.slice(1),
          value: value.trim(),
        });
      }
    });

    metadata.push({
      name: row.name!.trim(),
      description: row.description!.trim(),
      image: '',
      attributes,
    });
  });

  return {
    success: errors.length === 0,
    metadata,
    errors,
  };
}

export function generateCSVTemplate(count: number): string {
  const headers = ['name', 'description', 'rarity', 'power', 'element'];
  const rows: string[][] = [headers];

  for (let i = 1; i <= count; i++) {
    rows.push([
      `NFT #${i}`,
      `Description for NFT #${i}`,
      '',
      '',
      '',
    ]);
  }

  return rows.map((row) => row.join(',')).join('\n');
}

export function validateMetadataCount(
  metadata: NFTMetadata[],
  imageCount: number
): string[] {
  const errors: string[] = [];

  if (metadata.length === 0) {
    errors.push('No metadata rows found in CSV');
  }

  if (metadata.length > 20) {
    errors.push(`Too many metadata rows (${metadata.length}). Maximum is 20`);
  }

  if (metadata.length !== imageCount) {
    errors.push(
      `Metadata count (${metadata.length}) must match image count (${imageCount})`
    );
  }

  return errors;
}