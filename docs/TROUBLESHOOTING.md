# Troubleshooting

Fixes for the problems the Docker stack and the local chain throw most often. The commands run from the repository root.

- **Services will not start:** check `docker info`, then `.\scripts\docker-logs.ps1` and `docker logs nft-marketplace-backend`.
- **The build fails with `ETXTBSY` from esbuild:** a race while the images install packages in parallel. Run `.\scripts\docker-up.ps1` again.
- **Backend not responding:** `curl http://localhost:4001/health`. If the tables are missing, run `docker exec -it nft-marketplace-backend npm run migrate` and restart the backend.
- **Backend exits with "NFT_CONTRACT_ADDRESS not set":** the root `.env` is missing the contract addresses, usually because the deploy step did not finish. Run `.\scripts\docker-up.ps1` again.
- **Frontend shows no data:** confirm the backend is healthy and that the contract addresses in the root `.env` match the deployment. `npx tsx scripts/verify-stack.ts` prints the deployed addresses.
- **Contracts not deployed:** run `npx tsx scripts/docker-deploy-contracts.ts` and then `npx tsx scripts/verify-stack.ts`.
- **Port in use:** find the process with `netstat -ano | findstr :3002` (and 3003, 4001, 55432, 8546) and stop it with `taskkill /PID <PID> /F`.
- **Database errors:** `docker exec nft-marketplace-postgres pg_isready -U postgres`. As a last resort `docker-compose down -v` and `.\scripts\docker-up.ps1` start from an empty database with new contract addresses.
- **MetaMask rejects transactions after a restart:** the local chain restarted and its nonces reset. In MetaMask use Settings, Advanced, Reset Account, and check the network is `http://localhost:8546` with chain ID 31337.
- **IPFS upload fails:** `PINATA_JWT` is not set or is invalid in the creator dashboard environment. The backend IPFS service throws an error when Pinata is not configured, and there is no mock fallback there.
