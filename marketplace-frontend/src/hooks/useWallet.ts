import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner, Eip1193Provider } from 'ethers';
import { CHAIN_ID } from '../utils/constants';
import { WalletError, NetworkError, isMetaMaskInstalled } from '../utils/errors';
import type { WalletState } from '../types';

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
    balance: null,
  });
  
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateBalance = useCallback(async (address: string, provider: BrowserProvider) => {
    try {
      const balance = await provider.getBalance(address);
      setWalletState(prev => ({
        ...prev,
        balance: (Number(balance) / 1e18).toFixed(4),
      }));
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      throw new WalletError('MetaMask not installed');
    }

    if (!window.ethereum) {
      throw new WalletError('Ethereum provider not found');
    }

    setIsLoading(true);
    setError(null);

    try {
      const browserProvider = new BrowserProvider(window.ethereum as Eip1193Provider);
      setProvider(browserProvider);

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new WalletError('No accounts found');
      }

      const network = await browserProvider.getNetwork();
      const chainId = Number(network.chainId);

      if (chainId !== CHAIN_ID) {
        setError(`Please switch to the correct network (Chain ID: ${CHAIN_ID})`);
        throw new NetworkError(`Wrong network: ${chainId}`);
      }

      const signerInstance = await browserProvider.getSigner();
      setSigner(signerInstance);

      const address = accounts[0];
      if (!address) {
        throw new WalletError('No address found in accounts');
      }

      setWalletState({
        address,
        isConnected: true,
        chainId,
        balance: null,
      });

      await updateBalance(address, browserProvider);
      
      return address;
    } catch (err) {
      console.error('Error connecting wallet:', err);
      if (err instanceof Error && err.message.includes('user rejected')) {
        setError('Connection rejected by user');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [updateBalance]);

  const disconnect = useCallback(() => {
    setWalletState({
      address: null,
      isConnected: false,
      chainId: null,
      balance: null,
    });
    setSigner(null);
    setProvider(null);
    setError(null);
  }, []);

  const checkConnection = useCallback(async () => {
    if (!isMetaMaskInstalled() || !window.ethereum) return;

    try {
      const browserProvider = new BrowserProvider(window.ethereum as Eip1193Provider);
      const accounts = await browserProvider.listAccounts();
      
      if (accounts.length > 0) {
        const network = await browserProvider.getNetwork();
        const chainId = Number(network.chainId);
        
        if (chainId === CHAIN_ID) {
          const signerInstance = await browserProvider.getSigner();
          const address = await signerInstance.getAddress();
          
          setProvider(browserProvider);
          setSigner(signerInstance);
          setWalletState({
            address,
            isConnected: true,
            chainId,
            balance: null,
          });
          
          await updateBalance(address, browserProvider);
        }
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    }
  }, [updateBalance]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (!isMetaMaskInstalled() || !window.ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== walletState.address) {
        checkConnection();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    const ethereum = window.ethereum;
    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [walletState.address, disconnect, checkConnection]);

  return {
    address: walletState.address,
    isConnected: walletState.isConnected,
    chainId: walletState.chainId,
    balance: walletState.balance,
    signer,
    provider,
    connect,
    disconnect,
    error,
    isLoading,
  };
}