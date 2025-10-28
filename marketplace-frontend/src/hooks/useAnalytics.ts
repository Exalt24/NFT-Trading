import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { PlatformStats, Trader, VolumeData, TradingHistory } from '../types';

export function useAnalytics() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPlatformStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refresh: fetchStats };
}

export function useTopTraders(limit: number = 10) {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTraders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTopTraders(limit);
      setTraders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch traders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraders();
  }, [limit]);

  return { traders, loading, error, refresh: fetchTraders };
}

export function useTradingVolume(days: number = 30) {
  const [data, setData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVolume = async () => {
    try {
      setLoading(true);
      setError(null);
      const volumeData = await api.getTradingVolumeOverTime(days);
      setData(volumeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch volume data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolume();
  }, [days]);

  return { data, loading, error, refresh: fetchVolume };
}

export function usePriceDistribution() {
  const [distribution, setDistribution] = useState<Array<{ range: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDistribution = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPriceDistribution();
      setDistribution(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch distribution');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribution();
  }, []);

  return { distribution, loading, error, refresh: fetchDistribution };
}

export function usePriceHistory(tokenId: number) {
  const [history, setHistory] = useState<TradingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPriceHistory(tokenId, import.meta.env.VITE_NFT_CONTRACT_ADDRESS);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenId) {
      fetchHistory();
    }
  }, [tokenId]);

  return { history, loading, error, refresh: fetchHistory };
}