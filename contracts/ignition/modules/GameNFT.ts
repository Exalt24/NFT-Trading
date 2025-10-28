import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GameNFTModule = buildModule("GameNFTModule", (m) => {
  const deployer = m.getAccount(0);
  
  const gameNFT = m.contract("GameNFT", [deployer]);

  return { gameNFT };
});

export default GameNFTModule;