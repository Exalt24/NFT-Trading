import { expect } from 'chai';
import { network } from 'hardhat';
import type { GameNFT, Marketplace } from '../types/ethers-contracts/';

describe('Marketplace', function () {
  async function deployMarketplaceFixture() {
    const { ethers } = await network.connect();
    const [owner, seller, buyer, other] = await ethers.getSigners();
    
    const GameNFTFactory = await ethers.getContractFactory('GameNFT');
    const gameNFT = await GameNFTFactory.deploy(owner.address) as unknown as GameNFT;
    await gameNFT.waitForDeployment();
    
    const MarketplaceFactory = await ethers.getContractFactory('Marketplace');
    const marketplace = await MarketplaceFactory.deploy(owner.address) as unknown as Marketplace;
    await marketplace.waitForDeployment();
    
    await gameNFT.mint(seller.address, 'ipfs://QmTest1');
    await gameNFT.mint(seller.address, 'ipfs://QmTest2');
    await gameNFT.mint(seller.address, 'ipfs://QmTest3');
    
    return { gameNFT, marketplace, owner, seller, buyer, other, ethers };
  }

  describe('Deployment', function () {
    it('Should set the correct owner', async function () {
      const { networkHelpers } = await network.connect();
      const { marketplace, owner } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      expect(await marketplace.owner()).to.equal(owner.address);
    });

    it('Should set platform fee to 2.5%', async function () {
      const { networkHelpers } = await network.connect();
      const { marketplace } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      expect(await marketplace.platformFee()).to.equal(250n);
    });

    it('Should initialize collected fees to 0', async function () {
      const { networkHelpers } = await network.connect();
      const { marketplace } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      expect(await marketplace.collectedFees()).to.equal(0n);
    });
  });

  describe('Listing NFTs', function () {
    it('Should list NFT successfully with approval', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('0.1');
      await marketplace.connect(seller).listNFT(await gameNFT.getAddress(), 1n, price);
      
      const listing = await marketplace.getListing(await gameNFT.getAddress(), 1n);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(price);
      expect(listing.isActive).to.be.true;
    });

    it('Should emit Listed event', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('0.1');
      await expect(marketplace.connect(seller).listNFT(nftAddress, 1n, price))
        .to.emit(marketplace, 'Listed')
        .withArgs(nftAddress, 1n, seller.address, price);
    });

    it('Should list with setApprovalForAll', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      await gameNFT.connect(seller).setApprovalForAll(marketplaceAddress, true);
      
      const price = ethers.parseEther('0.1');
      await marketplace.connect(seller).listNFT(await gameNFT.getAddress(), 1n, price);
      
      const listing = await marketplace.getListing(await gameNFT.getAddress(), 1n);
      expect(listing.isActive).to.be.true;
    });

    it('Should revert when listing without approval', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const price = ethers.parseEther('0.1');
      await expect(
        marketplace.connect(seller).listNFT(await gameNFT.getAddress(), 1n, price)
      ).to.be.revertedWithCustomError(marketplace, 'NotApprovedForMarketplace');
    });

    it('Should revert when listing with zero price', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      await expect(
        marketplace.connect(seller).listNFT(await gameNFT.getAddress(), 1n, 0n)
      ).to.be.revertedWithCustomError(marketplace, 'PriceZero');
    });

    it('Should revert when non-owner tries to list', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, other, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      await gameNFT.connect(other).setApprovalForAll(marketplaceAddress, true);
      
      const price = ethers.parseEther('0.1');
      await expect(
        marketplace.connect(other).listNFT(await gameNFT.getAddress(), 1n, price)
      ).to.be.revertedWithCustomError(marketplace, 'NotTokenOwner');
    });

    it('Should revert when listing already listed NFT', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('0.1');
      await marketplace.connect(seller).listNFT(await gameNFT.getAddress(), 1n, price);
      
      await expect(
        marketplace.connect(seller).listNFT(await gameNFT.getAddress(), 1n, price)
      ).to.be.revertedWithCustomError(marketplace, 'AlreadyListed');
    });
  });

  describe('Buying NFTs', function () {
    it('Should buy NFT successfully', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, buyer, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      
      await marketplace.connect(buyer).buyNFT(nftAddress, 1n, { value: price });
      
      expect(await gameNFT.ownerOf(1n)).to.equal(buyer.address);
      
      const listing = await marketplace.getListing(nftAddress, 1n);
      expect(listing.isActive).to.be.false;
    });

    it('Should emit Sold event', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, buyer, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      
      await expect(marketplace.connect(buyer).buyNFT(nftAddress, 1n, { value: price }))
        .to.emit(marketplace, 'Sold')
        .withArgs(nftAddress, 1n, seller.address, buyer.address, price);
    });

    it('Should distribute payment correctly with platform fee', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, buyer, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      
      await marketplace.connect(buyer).buyNFT(nftAddress, 1n, { value: price });
      
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const platformFeeAmount = (price * 250n) / 10000n;
      const royaltyAmount = (price * 250n) / 10000n;
      const expectedSellerProceeds = price - platformFeeAmount - royaltyAmount;
      
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedSellerProceeds);
      expect(await marketplace.collectedFees()).to.equal(platformFeeAmount);
    });

    it('Should pay royalties to creator', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, owner, seller, buyer, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      await marketplace.connect(buyer).buyNFT(nftAddress, 1n, { value: price });
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const expectedRoyalty = (price * 250n) / 10000n;
      
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedRoyalty);
    });

    it('Should refund overpayment', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, buyer, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      const overpayment = ethers.parseEther('1.5');
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      
      const tx = await marketplace.connect(buyer).buyNFT(nftAddress, 1n, { value: overpayment });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      
      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      const expectedBalance = buyerBalanceBefore - price - gasUsed;
      
      expect(buyerBalanceAfter).to.equal(expectedBalance);
    });

    it('Should revert when buying unlisted NFT', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, buyer, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const price = ethers.parseEther('1');
      await expect(
        marketplace.connect(buyer).buyNFT(await gameNFT.getAddress(), 1n, { value: price })
      ).to.be.revertedWithCustomError(marketplace, 'NotListed');
    });

    it('Should revert when insufficient payment', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, buyer, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      
      const insufficientAmount = ethers.parseEther('0.5');
      await expect(
        marketplace.connect(buyer).buyNFT(nftAddress, 1n, { value: insufficientAmount })
      ).to.be.revertedWithCustomError(marketplace, 'InsufficientPayment');
    });
  });

  describe('Canceling Listings', function () {
    it('Should cancel listing successfully', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      await marketplace.connect(seller).cancelListing(nftAddress, 1n);
      
      const listing = await marketplace.getListing(nftAddress, 1n);
      expect(listing.isActive).to.be.false;
    });

    it('Should emit Cancelled event', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      
      await expect(marketplace.connect(seller).cancelListing(nftAddress, 1n))
        .to.emit(marketplace, 'Cancelled')
        .withArgs(nftAddress, 1n, seller.address);
    });

    it('Should revert when canceling unlisted NFT', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      await expect(
        marketplace.connect(seller).cancelListing(await gameNFT.getAddress(), 1n)
      ).to.be.revertedWithCustomError(marketplace, 'NotListed');
    });

    it('Should revert when non-seller tries to cancel', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, other, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      
      await expect(
        marketplace.connect(other).cancelListing(nftAddress, 1n)
      ).to.be.revertedWithCustomError(marketplace, 'NotSeller');
    });
  });

  describe('Updating Prices', function () {
    it('Should update price successfully', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const oldPrice = ethers.parseEther('1');
      const newPrice = ethers.parseEther('2');
      
      await marketplace.connect(seller).listNFT(nftAddress, 1n, oldPrice);
      await marketplace.connect(seller).updatePrice(nftAddress, 1n, newPrice);
      
      const listing = await marketplace.getListing(nftAddress, 1n);
      expect(listing.price).to.equal(newPrice);
    });

    it('Should emit PriceUpdated event', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const oldPrice = ethers.parseEther('1');
      const newPrice = ethers.parseEther('2');
      
      await marketplace.connect(seller).listNFT(nftAddress, 1n, oldPrice);
      
      await expect(marketplace.connect(seller).updatePrice(nftAddress, 1n, newPrice))
        .to.emit(marketplace, 'PriceUpdated')
        .withArgs(nftAddress, 1n, oldPrice, newPrice);
    });

    it('Should revert when updating to zero price', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      
      await expect(
        marketplace.connect(seller).updatePrice(nftAddress, 1n, 0n)
      ).to.be.revertedWithCustomError(marketplace, 'PriceZero');
    });

    it('Should revert when updating unlisted NFT', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const newPrice = ethers.parseEther('2');
      await expect(
        marketplace.connect(seller).updatePrice(await gameNFT.getAddress(), 1n, newPrice)
      ).to.be.revertedWithCustomError(marketplace, 'NotListed');
    });

    it('Should revert when non-seller tries to update price', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, other, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      const newPrice = ethers.parseEther('2');
      
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      
      await expect(
        marketplace.connect(other).updatePrice(nftAddress, 1n, newPrice)
      ).to.be.revertedWithCustomError(marketplace, 'NotSeller');
    });
  });

  describe('Platform Fee Management', function () {
    it('Should update platform fee', async function () {
      const { networkHelpers } = await network.connect();
      const { marketplace, owner } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const newFee = 500n;
      await marketplace.connect(owner).updatePlatformFee(newFee);
      
      expect(await marketplace.platformFee()).to.equal(newFee);
    });

    it('Should emit PlatformFeeUpdated event', async function () {
      const { networkHelpers } = await network.connect();
      const { marketplace, owner } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const oldFee = 250n;
      const newFee = 500n;
      
      await expect(marketplace.connect(owner).updatePlatformFee(newFee))
        .to.emit(marketplace, 'PlatformFeeUpdated')
        .withArgs(oldFee, newFee);
    });

    it('Should revert when fee exceeds 10%', async function () {
      const { networkHelpers } = await network.connect();
      const { marketplace, owner } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      await expect(
        marketplace.connect(owner).updatePlatformFee(1001n)
      ).to.be.revertedWithCustomError(marketplace, 'FeeTooHigh');
    });

    it('Should revert when non-owner tries to update fee', async function () {
      const { networkHelpers } = await network.connect();
      const { marketplace, other } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      await expect(
        marketplace.connect(other).updatePlatformFee(500n)
      ).to.be.revertedWithCustomError(marketplace, 'OwnableUnauthorizedAccount');
    });

    it('Should withdraw collected fees', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, owner, seller, buyer, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      const price = ethers.parseEther('1');
      await marketplace.connect(seller).listNFT(nftAddress, 1n, price);
      await marketplace.connect(buyer).buyNFT(nftAddress, 1n, { value: price });
      
      const platformFeeAmount = (price * 250n) / 10000n;
      expect(await marketplace.collectedFees()).to.equal(platformFeeAmount);
      
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await marketplace.connect(owner).withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      expect(ownerBalanceAfter - ownerBalanceBefore + gasUsed).to.equal(platformFeeAmount);
      expect(await marketplace.collectedFees()).to.equal(0n);
    });

    it('Should revert when non-owner tries to withdraw', async function () {
      const { networkHelpers } = await network.connect();
      const { marketplace, other } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      await expect(
        marketplace.connect(other).withdrawFees()
      ).to.be.revertedWithCustomError(marketplace, 'OwnableUnauthorizedAccount');
    });
  });

  describe('Complex Scenarios', function () {
    it('Should handle full trading cycle', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, buyer, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      await marketplace.connect(seller).listNFT(nftAddress, 1n, ethers.parseEther('1'));
      
      await marketplace.connect(seller).updatePrice(nftAddress, 1n, ethers.parseEther('1.5'));
      
      await marketplace.connect(buyer).buyNFT(nftAddress, 1n, { value: ethers.parseEther('1.5') });
      
      expect(await gameNFT.ownerOf(1n)).to.equal(buyer.address);
    });

    it('Should handle multiple listings', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      
      await gameNFT.connect(seller).setApprovalForAll(marketplaceAddress, true);
      
      await marketplace.connect(seller).listNFT(nftAddress, 1n, ethers.parseEther('1'));
      await marketplace.connect(seller).listNFT(nftAddress, 2n, ethers.parseEther('2'));
      await marketplace.connect(seller).listNFT(nftAddress, 3n, ethers.parseEther('3'));
      
      const listing1 = await marketplace.getListing(nftAddress, 1n);
      const listing2 = await marketplace.getListing(nftAddress, 2n);
      const listing3 = await marketplace.getListing(nftAddress, 3n);
      
      expect(listing1.isActive).to.be.true;
      expect(listing2.isActive).to.be.true;
      expect(listing3.isActive).to.be.true;
    });

    it('Should handle listing after cancellation', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, marketplace, seller, ethers } = await networkHelpers.loadFixture(deployMarketplaceFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      const nftAddress = await gameNFT.getAddress();
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      
      await marketplace.connect(seller).listNFT(nftAddress, 1n, ethers.parseEther('1'));
      await marketplace.connect(seller).cancelListing(nftAddress, 1n);
      
      await gameNFT.connect(seller).approve(marketplaceAddress, 1n);
      await marketplace.connect(seller).listNFT(nftAddress, 1n, ethers.parseEther('2'));
      
      const listing = await marketplace.getListing(nftAddress, 1n);
      expect(listing.isActive).to.be.true;
      expect(listing.price).to.equal(ethers.parseEther('2'));
    });
  });
});