interface TransactionStatusProps {
  status: 'idle' | 'pending' | 'success' | 'error';
  txHash?: string | null;
  message?: string;
  error?: string | null;
}

export default function TransactionStatus({ status, txHash, message, error }: TransactionStatusProps) {
  const explorerUrl = txHash ? `https://etherscan.io/tx/${txHash}` : null;

  if (status === 'idle') return null;

  return (
    <div className="py-8">
      {status === 'pending' && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg font-semibold text-white mb-2">
            {message || 'Processing transaction...'}
          </p>
          <p className="text-sm text-slate-400">Please confirm in your wallet</p>
          {txHash && (
            <a
              href={explorerUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
            >
              View on Explorer →
            </a>
          )}
        </div>
      )}

      {status === 'success' && (
        <div className="text-center">
          <div className="text-6xl mb-4">✓</div>
          <p className="text-xl font-semibold text-green-400 mb-2">Transaction Successful!</p>
          {txHash && (
            <a
              href={explorerUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              View on Explorer →
            </a>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <div className="text-6xl text-red-400 mb-4">✕</div>
          <p className="text-xl font-semibold text-red-400 mb-2">Transaction Failed</p>
          {error && (
            <p className="text-sm text-slate-300 bg-red-900/50 border border-red-700 rounded-lg p-3 mt-4">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}