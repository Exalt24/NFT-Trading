import { useWebSocket } from '../hooks/useWebSocket';

export function ConnectionStatus() {
  const { isConnected, connectionError, reconnect } = useWebSocket({ autoConnect: true });

  if (!connectionError && isConnected) {
    return (
      <div className="flex items-center space-x-2 text-green-400">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-sm">Live</span>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <span className="text-sm text-red-400">Disconnected</span>
        <button
          onClick={reconnect}
          className="text-xs px-2 py-0.5 bg-red-600 hover:bg-red-700 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-yellow-400">
      <div className="w-2 h-2 rounded-full bg-yellow-400" />
      <span className="text-sm">Connecting...</span>
    </div>
  );
}