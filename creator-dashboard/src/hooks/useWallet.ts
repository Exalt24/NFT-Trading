import { useState, useEffect, useCallback } from 'react';
import { formatEther } from 'ethers';
import { WalletState } from '../types';
import { WalletError, NetworkError } from '../utils/errors';
import { CHAIN_CONFIG } from '../utils/constants';
import { initProvider, getProvider, getContractOwner, resetContracts } from '../services/contracts';

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    isOwner: false,
    balance: '0',
    chainId: null
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkOwner = useCallback(async (address: string): Promise<boolean> => {
    try {
      const owner = await getContractOwner();
      return owner.toLowerCase() === address.toLowerCase();
    } catch (err) {
      console.error('Error checking owner:', err);
      return false;
    }
  }, []);

  const getBalance = useCallback(async (address: string): Promise<string> => {
    try {
      const provider = await getProvider();
      const balance = await provider.getBalance(address);
      return formatEther(balance);
    } catch (err) {
      console.error('Error getting balance:', err);
      return '0';
    }
  }, []);

  const checkNetwork = useCallback(async (): Promise<boolean> => {
    try {
      const provider = await getProvider();
      const network = await provider.getNetwork();
      return Number(network.chainId) === CHAIN_CONFIG.CHAIN_ID;
    } catch (err) {
      console.error('Error checking network:', err);
      return false;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to use this app.');
      throw new WalletError('MetaMask not detected');
    }

    setIsConnecting(true);
    setError(null);

    try {
      await initProvider();
      
      const accounts = await window.ethereum.request?.({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (!accounts || accounts.length === 0) {
        throw new WalletError('No accounts found');
      }

      const address = accounts[0];
      
      if (!address) {
        throw new WalletError('No account address found');
      }
      
      const isCorrectNetwork = await checkNetwork();
      if (!isCorrectNetwork) {
        throw new NetworkError(
          `Please switch to ${CHAIN_CONFIG.CHAIN_NAME} (Chain ID: ${CHAIN_CONFIG.CHAIN_ID})`
        );
      }

      const [isOwner, balance] = await Promise.all([
        checkOwner(address),
        getBalance(address)
      ]);

      const provider = await getProvider();
      const network = await provider.getNetwork();

      setWallet({
        address,
        isConnected: true,
        isOwner,
        balance,
        chainId: Number(network.chainId)
      });

      setIsConnecting(false);
      
      return { address, isOwner };
    } catch (err: any) {
      setIsConnecting(false);
      
      if (err.code === 4001) {
        setError('Connection rejected by user');
      } else if (err instanceof NetworkError) {
        setError(err.message);
      } else if (err instanceof WalletError) {
        setError(err.message);
      } else {
        setError('Failed to connect wallet');
      }
      
      throw err;
    }
  }, [checkOwner, getBalance, checkNetwork]);

  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      isConnected: false,
      isOwner: false,
      balance: '0',
      chainId: null
    });
    setError(null);
    resetContracts();
  }, []);

  const refreshBalance = useCallback(async () => {
    if (wallet.address) {
      const balance = await getBalance(wallet.address);
      setWallet(prev => ({ ...prev, balance }));
    }
  }, [wallet.address, getBalance]);

  const refreshOwnerStatus = useCallback(async () => {
    if (wallet.address) {
      const isOwner = await checkOwner(wallet.address);
      setWallet(prev => ({ ...prev, isOwner }));
    }
  }, [wallet.address, checkOwner]);

  useEffect(() => {
    const handleAccountsChanged = async (accounts: unknown) => {
      const accountsArray = accounts as string[];
      
      if (!accountsArray || accountsArray.length === 0) {
        disconnect();
        return;
      }

      const address = accountsArray[0];
      
      if (!address) {
        disconnect();
        return;
      }
      
      const [isOwner, balance] = await Promise.all([
        checkOwner(address),
        getBalance(address)
      ]);

      setWallet(prev => ({
        ...prev,
        address: address,
        isOwner,
        balance
      }));
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    if (window.ethereum?.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [disconnect, checkOwner, getBalance]);

  useEffect(() => {
    const autoConnect = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = await window.ethereum.request?.({ 
          method: 'eth_accounts' 
        }) as string[];

        if (accounts && accounts.length > 0) {
          await connect();
        }
      } catch (err) {
        console.error('Auto-connect failed:', err);
      }
    };

    autoConnect();
  }, []);

  return {
    wallet,
    isConnecting,
    error,
    connect,
    disconnect,
    refreshBalance,
    refreshOwnerStatus
  };
}