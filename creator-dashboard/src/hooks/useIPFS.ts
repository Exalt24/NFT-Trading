import { useState, useCallback } from 'react';
import { PinataSDK } from 'pinata-web3';
import { NFTMetadata, IPFSUploadResult, ImageUploadProgress } from '../types';
import { IPFS_CONFIG, IPFS_GATEWAYS, FILE_UPLOAD, ERROR_MESSAGES } from '../utils/constants';
import { IPFSError, ValidationError } from '../utils/errors';

const pinata = IPFS_CONFIG.JWT 
  ? new PinataSDK({
      pinataJwt: IPFS_CONFIG.JWT,
      pinataGateway: IPFS_CONFIG.GATEWAY
    })
  : null;

export function useIPFS() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ImageUploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): void => {
    if (file.size > FILE_UPLOAD.MAX_SIZE) {
      throw new ValidationError(ERROR_MESSAGES.FILE_TOO_LARGE);
    }

    const acceptedTypes = FILE_UPLOAD.ACCEPTED_TYPES as readonly string[];
    if (!acceptedTypes.includes(file.type)) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_FILE_TYPE);
    }
  }, []);

  const uploadImage = useCallback(async (file: File): Promise<IPFSUploadResult> => {
    if (!pinata) {
      throw new IPFSError('Pinata not configured. Please set VITE_PINATA_JWT in .env');
    }

    validateFile(file);

    setIsUploading(true);
    setError(null);
    setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      const upload = await pinata.upload.file(file);
      
      setUploadProgress({ 
        loaded: file.size, 
        total: file.size, 
        percentage: 100 
      });

      const cid = (upload as any).IpfsHash || (upload as any).cid;
      
      const result: IPFSUploadResult = {
        cid: cid,
        url: `ipfs://${cid}`,
        gateway_url: `https://${IPFS_CONFIG.GATEWAY}/ipfs/${cid}`
      };

      setIsUploading(false);
      setUploadProgress(null);
      
      return result;
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(null);
      
      const errorMsg = err.message || ERROR_MESSAGES.IPFS_UPLOAD_FAILED;
      setError(errorMsg);
      
      throw new IPFSError(errorMsg);
    }
  }, [validateFile]);

  const uploadMetadata = useCallback(async (metadata: NFTMetadata): Promise<IPFSUploadResult> => {
    if (!pinata) {
      throw new IPFSError('Pinata not configured. Please set VITE_PINATA_JWT in .env');
    }

    setIsUploading(true);
    setError(null);

    try {
      const upload = await pinata.upload.json(metadata);

      const cid = (upload as any).IpfsHash || (upload as any).cid;

      const result: IPFSUploadResult = {
        cid: cid,
        url: `ipfs://${cid}`,
        gateway_url: `https://${IPFS_CONFIG.GATEWAY}/ipfs/${cid}`
      };

      setIsUploading(false);
      
      return result;
    } catch (err: any) {
      setIsUploading(false);
      
      const errorMsg = err.message || ERROR_MESSAGES.IPFS_UPLOAD_FAILED;
      setError(errorMsg);
      
      throw new IPFSError(errorMsg);
    }
  }, []);

  const uploadImageAndMetadata = useCallback(async (
    file: File, 
    metadata: Omit<NFTMetadata, 'image'>
  ): Promise<{ imageCID: string; metadataCID: string; tokenURI: string }> => {
    const imageResult = await uploadImage(file);
    
    const fullMetadata: NFTMetadata = {
      ...metadata,
      image: imageResult.url
    };
    
    const metadataResult = await uploadMetadata(fullMetadata);
    
    return {
      imageCID: imageResult.cid,
      metadataCID: metadataResult.cid,
      tokenURI: metadataResult.url
    };
  }, [uploadImage, uploadMetadata]);

  const getMetadata = useCallback(async (cid: string): Promise<NFTMetadata | null> => {
    setError(null);

    for (const gateway of IPFS_GATEWAYS) {
      try {
        const url = `${gateway}${cid}`;
        const response = await fetch(url);
        
        if (!response.ok) continue;
        
        const metadata = await response.json();
        return metadata as NFTMetadata;
      } catch (err) {
        continue;
      }
    }

    const errorMsg = 'Failed to fetch metadata from IPFS';
    setError(errorMsg);
    return null;
  }, []);

  const getImageUrl = useCallback((ipfsUrl: string): string => {
    if (ipfsUrl.startsWith('ipfs://')) {
      const cid = ipfsUrl.replace('ipfs://', '');
      return `https://${IPFS_CONFIG.GATEWAY}/ipfs/${cid}`;
    }
    return ipfsUrl;
  }, []);

  const getImageUrlWithFallbacks = useCallback((ipfsUrl: string): string[] => {
    if (ipfsUrl.startsWith('ipfs://')) {
      const cid = ipfsUrl.replace('ipfs://', '');
      return IPFS_GATEWAYS.map(gateway => `${gateway}${cid}`);
    }
    return [ipfsUrl];
  }, []);

  const createMetadata = useCallback((
    name: string,
    description: string,
    imageCID: string,
    attributes: Array<{ trait_type: string; value: string | number }>
  ): NFTMetadata => {
    return {
      name,
      description,
      image: `ipfs://${imageCID}`,
      attributes
    };
  }, []);

  return {
    isUploading,
    uploadProgress,
    error,
    uploadImage,
    uploadMetadata,
    uploadImageAndMetadata,
    getMetadata,
    getImageUrl,
    getImageUrlWithFallbacks,
    createMetadata,
    isPinataConfigured: !!pinata
  };
}