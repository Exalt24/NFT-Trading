// Recording aid, not part of the app.
//
// A headless browser has no MetaMask, so the demo recording injects this minimal
// EIP-1193 provider as window.ethereum. It talks straight to the local Hardhat node and
// lets that node sign with its unlocked, publicly known test accounts. It does not hold
// any keys and it only ever points at the RPC URL you give it.
//
// Usage with Playwright, before the page loads:
//   await context.addInitScript({ content: `window.__DEMO_WALLET__ = ${JSON.stringify({ rpcUrl, account })};` });
//   await context.addInitScript({ path: 'scripts/demo/wallet-stub.js' });
(() => {
  const cfg = window.__DEMO_WALLET__;
  if (!cfg || !cfg.rpcUrl || !cfg.account) return;

  const listeners = {};
  let connected = false;
  let nextId = 1;

  const rpc = async (method, params = []) => {
    const res = await fetch(cfg.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
    });
    const body = await res.json();
    if (body.error) {
      const err = new Error(body.error.message);
      err.code = body.error.code;
      err.data = body.error.data;
      throw err;
    }
    return body.result;
  };

  window.ethereum = {
    isMetaMask: true,
    request: async ({ method, params }) => {
      switch (method) {
        case 'eth_requestAccounts':
          connected = true;
          return [cfg.account];
        case 'eth_accounts':
          return connected ? [cfg.account] : [];
        case 'wallet_switchEthereumChain':
        case 'wallet_addEthereumChain':
          return null;
        default:
          // eth_chainId, eth_getBalance, eth_call, eth_sendTransaction (the node signs for its
          // unlocked test accounts), eth_getTransactionReceipt and the rest go to the node as-is.
          return rpc(method, params);
      }
    },
    on: (event, fn) => { (listeners[event] = listeners[event] || []).push(fn); },
    removeListener: (event, fn) => { listeners[event] = (listeners[event] || []).filter((f) => f !== fn); },
  };
})();
