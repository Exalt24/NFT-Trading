import { useState, useEffect } from 'react';
import type { NFTMetadata } from '../types';

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

function extractCID(uri: string): string | null {
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', '');
  }
  
  const match = uri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  return match && match[1] ? match[1] : null;
}

function getIPFSUrl(uri: string, gatewayIndex: number = 0): string {
  const cid = extractCID(uri);
  if (!cid) return uri;
  
  return `${IPFS_GATEWAYS[gatewayIndex]}${cid}`;
}

export function useIPFSImage(imageUri: string | undefined | null) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!imageUri) {
      setImageUrl(null);
      setError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    let gatewayIndex = 0;
    let mounted = true;

    const tryLoadImage = async () => {
      const url = getIPFSUrl(imageUri, gatewayIndex);
      
      const img = new Image();
      img.onload = () => {
        if (mounted) {
          setImageUrl(url);
          setLoading(false);
          setError(false);
        }
      };
      
      img.onerror = () => {
        if (!mounted) return;
        
        gatewayIndex++;
        if (gatewayIndex < IPFS_GATEWAYS.length) {
          tryLoadImage();
        } else {
          setError(true);
          setLoading(false);
          setImageUrl(null);
        }
      };
      
      img.src = url;
    };

    tryLoadImage();

    return () => {
      mounted = false;
    };
  }, [imageUri]);

  return { imageUrl, loading, error };
}

export function useIPFSMetadata(metadataUri: string | undefined | null) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metadataUri) {
      setMetadata(null);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchMetadata = async () => {
      let gatewayIndex = 0;
      
      while (gatewayIndex < IPFS_GATEWAYS.length) {
        try {
          const url = getIPFSUrl(metadataUri, gatewayIndex);
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          
          if (mounted) {
            setMetadata(data);
            setLoading(false);
            setError(null);
          }
          return;
        } catch (err) {
          gatewayIndex++;
          if (gatewayIndex >= IPFS_GATEWAYS.length) {
            if (mounted) {
              setError('Failed to load metadata from IPFS');
              setLoading(false);
            }
          }
        }
      }
    };

    fetchMetadata();

    return () => {
      mounted = false;
    };
  }, [metadataUri]);

  return { metadata, loading, error };
}