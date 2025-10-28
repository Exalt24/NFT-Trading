import { useState, useCallback } from 'react';
import { parseEther } from 'ethers';
import { MintProgress, TransactionStatus, RoyaltyInfo } from '../types';
import { ContractError } from '../utils/errors';
import { handleContractError, parseError } from '../utils/errors';
import { getNFTContract } from '../services/contracts';
import { ROYALTY } from '../utils/constants';

export function useMinting() {
  const [mintProgress, setMintProgress] = useState<MintProgress | null>(null);
  const [txStatus, setTxStatus] = useState<TransactionStatus>({ status: 'idle' });
  const [error, setError] = useState<string | null>(null);

  const mint = useCallback(async (
    recipient: string,
    tokenURI: string
  ): Promise<number> => {
    setMintProgress({
      stage: 'minting',
      message: 'Submitting transaction...'
    });
    setTxStatus({ status: 'pending' });
    setError(null);

    try {
      const contract = await getNFTContract(true);
      
      const tx = await (contract as any).mint(recipient, tokenURI);
      
      setTxStatus({ status: 'pending', hash: tx.hash });
      setMintProgress({
        stage: 'minting',
        message: 'Waiting for confirmation...'
      });

      const receipt = await tx.wait();

      const mintedEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'Minted';
        } catch {
          return false;
        }
      });

      if (!mintedEvent) {
        throw new ContractError('Minted event not found in transaction receipt');
      }

      const parsedLog = contract.interface.parseLog(mintedEvent);
      const tokenId = Number(parsedLog?.args[0]);

      setMintProgress({
        stage: 'complete',
        message: 'NFT minted successfully!',
        tokenId
      });
      setTxStatus({ status: 'success', hash: tx.hash });

      return tokenId;
    } catch (err: any) {
      const errorMsg = handleContractError(err);
      setError(errorMsg);
      setTxStatus({ status: 'error', error: errorMsg });
      setMintProgress({
        stage: 'error',
        message: errorMsg,
        error: errorMsg
      });
      throw err;
    }
  }, []);

  const batchMint = useCallback(async (
    recipient: string,
    tokenURIs: string[]
  ): Promise<number[]> => {
    if (tokenURIs.length === 0 || tokenURIs.length > 20) {
      throw new ContractError('Batch size must be between 1 and 20');
    }

    setMintProgress({
      stage: 'minting',
      message: `Minting ${tokenURIs.length} NFTs...`
    });
    setTxStatus({ status: 'pending' });
    setError(null);

    try {
      const contract = await getNFTContract(true);
      
      const tx = await (contract as any).batchMint(recipient, tokenURIs);
      
      setTxStatus({ status: 'pending', hash: tx.hash });
      setMintProgress({
        stage: 'minting',
        message: 'Waiting for confirmation...'
      });

      const receipt = await tx.wait();

      const mintedEvents = receipt?.logs.filter((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'Minted';
        } catch {
          return false;
        }
      });

      const tokenIds = mintedEvents.map((event: any) => {
        const parsed = contract.interface.parseLog(event);
        return Number(parsed?.args[0]);
      });

      setMintProgress({
        stage: 'complete',
        message: `Successfully minted ${tokenIds.length} NFTs!`
      });
      setTxStatus({ status: 'success', hash: tx.hash });

      return tokenIds;
    } catch (err: any) {
      const errorMsg = handleContractError(err);
      setError(errorMsg);
      setTxStatus({ status: 'error', error: errorMsg });
      setMintProgress({
        stage: 'error',
        message: errorMsg,
        error: errorMsg
      });
      throw err;
    }
  }, []);

  const setDefaultRoyalty = useCallback(async (
    receiver: string,
    basisPoints: number
  ): Promise<void> => {
    if (basisPoints < ROYALTY.MIN_BASIS_POINTS || basisPoints > ROYALTY.MAX_BASIS_POINTS) {
      throw new ContractError(`Royalty must be between ${ROYALTY.MIN_BASIS_POINTS / 100}% and ${ROYALTY.MAX_BASIS_POINTS / 100}%`);
    }

    setTxStatus({ status: 'pending' });
    setError(null);

    try {
      const contract = await getNFTContract(true);
      
      const tx = await (contract as any).setDefaultRoyalty(receiver, basisPoints);
      setTxStatus({ status: 'pending', hash: tx.hash });

      await tx.wait();

      setTxStatus({ status: 'success', hash: tx.hash });
    } catch (err: any) {
      const errorMsg = handleContractError(err);
      setError(errorMsg);
      setTxStatus({ status: 'error', error: errorMsg });
      throw err;
    }
  }, []);

  const setTokenRoyalty = useCallback(async (
    tokenId: number,
    receiver: string,
    basisPoints: number
  ): Promise<void> => {
    if (basisPoints < ROYALTY.MIN_BASIS_POINTS || basisPoints > ROYALTY.MAX_BASIS_POINTS) {
      throw new ContractError(`Royalty must be between ${ROYALTY.MIN_BASIS_POINTS / 100}% and ${ROYALTY.MAX_BASIS_POINTS / 100}%`);
    }

    setTxStatus({ status: 'pending' });
    setError(null);

    try {
      const contract = await getNFTContract(true);
      
      const tx = await (contract as any).setTokenRoyalty(tokenId, receiver, basisPoints);
      setTxStatus({ status: 'pending', hash: tx.hash });

      await tx.wait();

      setTxStatus({ status: 'success', hash: tx.hash });
    } catch (err: any) {
      const errorMsg = handleContractError(err);
      setError(errorMsg);
      setTxStatus({ status: 'error', error: errorMsg });
      throw err;
    }
  }, []);

  const getRoyaltyInfo = useCallback(async (
    tokenId: number,
    salePrice: string
  ): Promise<RoyaltyInfo> => {
    try {
      const contract = await getNFTContract();
      const salePriceWei = parseEther(salePrice);
      
      const [receiver, royaltyAmount] = await (contract as any).royaltyInfo(tokenId, salePriceWei);
      
      const basisPoints = Number((royaltyAmount * 10000n) / salePriceWei);
      
      return {
        receiver,
        amount: basisPoints
      };
    } catch (err) {
      console.error('Error getting royalty info:', err);
      return {
        receiver: '',
        amount: 0
      };
    }
  }, []);

  const reset = useCallback(() => {
    setMintProgress(null);
    setTxStatus({ status: 'idle' });
    setError(null);
  }, []);

  return {
    mintProgress,
    txStatus,
    error,
    mint,
    batchMint,
    setDefaultRoyalty,
    setTokenRoyalty,
    getRoyaltyInfo,
    reset,
    isMinting: txStatus.status === 'pending'
  };
}