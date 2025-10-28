import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MarketplaceModule = buildModule("MarketplaceModule", (m) => {
  const deployer = m.getAccount(0);
  
  const marketplace = m.contract("Marketplace", [deployer]);

  return { marketplace };
});

export default MarketplaceModule;