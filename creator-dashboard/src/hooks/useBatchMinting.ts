import { useState } from 'react';
import { NFTMetadata } from '../types';
import { useIPFS } from './useIPFS';
import { getNFTContract } from '../services/contracts';
import { parseTransactionError } from '../utils/errors';

export interface BatchMintProgress {
  stage: 'idle' | 'uploading' | 'minting' | 'success' | 'error';
  currentStep: number;
  totalSteps: number;
  uploadedCIDs: string[];
  mintedTokenIds: number[];
  errors: string[];
  transactionHash?: string;
}

export function useBatchMinting() {
  const { uploadImageAndMetadata } = useIPFS();
  const [progress, setProgress] = useState<BatchMintProgress>({
    stage: 'idle',
    currentStep: 0,
    totalSteps: 0,
    uploadedCIDs: [],
    mintedTokenIds: [],
    errors: [],
  });

  const resetProgress = () => {
    setProgress({
      stage: 'idle',
      currentStep: 0,
      totalSteps: 0,
      uploadedCIDs: [],
      mintedTokenIds: [],
      errors: [],
    });
  };

  const batchMint = async (
    images: File[],
    metadata: NFTMetadata[],
    recipient: string
  ) => {
    if (images.length !== metadata.length) {
      throw new Error('Image count must match metadata count');
    }

    if (images.length < 1 || images.length > 20) {
      throw new Error('Batch size must be between 1 and 20');
    }

    resetProgress();
    setProgress({
      stage: 'uploading',
      currentStep: 0,
      totalSteps: images.length,
      uploadedCIDs: [],
      mintedTokenIds: [],
      errors: [],
    });

    const tokenURIs: string[] = [];
    const uploadErrors: string[] = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const image = images[i];
        const meta = metadata[i];
        
        if (!image) {
          throw new Error('Invalid image file');
        }
        
        if (!meta) {
          throw new Error('Missing metadata');
        }
        
        const result = await uploadImageAndMetadata(image, meta);
        tokenURIs.push(result.tokenURI);

        setProgress((prev) => ({
          ...prev,
          currentStep: i + 1,
          uploadedCIDs: [...prev.uploadedCIDs, result.metadataCID],
        }));
      } catch (error) {
        const errorMsg = `Failed to upload NFT ${i + 1}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        uploadErrors.push(errorMsg);

        setProgress((prev) => ({
          ...prev,
          currentStep: i + 1,
          errors: [...prev.errors, errorMsg],
        }));
      }
    }

    if (tokenURIs.length === 0) {
      setProgress((prev) => ({
        ...prev,
        stage: 'error',
        errors: [...prev.errors, 'All IPFS uploads failed'],
      }));
      throw new Error('All IPFS uploads failed');
    }

    if (uploadErrors.length > 0) {
      const continueAnyway = confirm(
        `${uploadErrors.length} upload(s) failed. Continue with ${tokenURIs.length} successful upload(s)?`
      );
      if (!continueAnyway) {
        setProgress((prev) => ({ ...prev, stage: 'idle' }));
        return;
      }
    }

    setProgress((prev) => ({
      ...prev,
      stage: 'minting',
      currentStep: 0,
      totalSteps: 1,
    }));

    try {
      const contract = await getNFTContract(true);
      if (!contract) {
        throw new Error('Failed to get contract instance');
      }

      const tx = await (contract as any).batchMint(recipient, tokenURIs);

      setProgress((prev) => ({
        ...prev,
        transactionHash: tx.hash,
      }));

      const receipt = await tx.wait();

      const mintedEvents = receipt?.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(
          (parsed: any) => parsed && parsed.name === 'Minted'
        );

      const tokenIds = mintedEvents?.map((event: any) => Number(event.args[0])) || [];

      setProgress((prev) => ({
        ...prev,
        stage: 'success',
        mintedTokenIds: tokenIds,
        currentStep: 1,
      }));

      return tokenIds;
    } catch (error) {
      const errorMessage = parseTransactionError(error);
      setProgress((prev) => ({
        ...prev,
        stage: 'error',
        errors: [...prev.errors, errorMessage],
      }));
      throw error;
    }
  };

  return {
    progress,
    batchMint,
    resetProgress,
  };
}