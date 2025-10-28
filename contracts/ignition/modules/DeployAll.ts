import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployAllModule = buildModule("DeployAllModule", (m) => {
  const deployer = m.getAccount(0);
  
  const gameNFT = m.contract("GameNFT", [deployer]);
  const marketplace = m.contract("Marketplace", [deployer]);

  return { gameNFT, marketplace };
});

export default DeployAllModule;