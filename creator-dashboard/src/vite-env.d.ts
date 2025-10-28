/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WEBSOCKET_URL: string
  readonly VITE_NFT_CONTRACT_ADDRESS: string
  readonly VITE_MARKETPLACE_CONTRACT_ADDRESS: string
  readonly VITE_PINATA_JWT: string
  readonly VITE_PINATA_GATEWAY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}