import { expect } from 'chai';
import { network } from 'hardhat';
import type { GameNFT } from '../types/ethers-contracts/';

describe('GameNFT', function () {
  async function deployGameNFTFixture() {
    const { ethers } = await network.connect();
    const [owner, creator, buyer, other] = await ethers.getSigners();
    
    const GameNFTFactory = await ethers.getContractFactory('GameNFT');
    const gameNFT = await GameNFTFactory.deploy(owner.address) as unknown as GameNFT;
    await gameNFT.waitForDeployment();
    
    return { gameNFT, owner, creator, buyer, other, ethers };
  }

  describe('Deployment', function () {
    it('Should set the correct name and symbol', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      expect(await gameNFT.name()).to.equal('GameNFT');
      expect(await gameNFT.symbol()).to.equal('GNFT');
    });

    it('Should set the correct owner', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, owner } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      expect(await gameNFT.owner()).to.equal(owner.address);
    });

    it('Should initialize token counter to 0', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      expect(await gameNFT.getCurrentTokenId()).to.equal(0n);
    });

    it('Should set default royalty to 2.5%', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, owner } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      const royaltyInfo = await gameNFT.royaltyInfo(1n, 10000n);
      expect(royaltyInfo[0]).to.equal(owner.address);
      expect(royaltyInfo[1]).to.equal(250n);
    });
  });

  describe('Minting', function () {
    it('Should mint NFT successfully', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      const tokenURI = 'ipfs://QmTest123';
      const tx = await gameNFT.mint(creator.address, tokenURI);
      await tx.wait();

      expect(await gameNFT.ownerOf(1n)).to.equal(creator.address);
      expect(await gameNFT.tokenURI(1n)).to.equal(tokenURI);
      expect(await gameNFT.getCurrentTokenId()).to.equal(1n);
    });

    it('Should emit Minted event', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      const tokenURI = 'ipfs://QmTest123';
      await expect(gameNFT.mint(creator.address, tokenURI))
        .to.emit(gameNFT, 'Minted')
        .withArgs(1n, creator.address, tokenURI);
    });

    it('Should increment token ID for each mint', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator, buyer, other } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await gameNFT.mint(creator.address, 'ipfs://QmTest1');
      await gameNFT.mint(buyer.address, 'ipfs://QmTest2');
      await gameNFT.mint(other.address, 'ipfs://QmTest3');

      expect(await gameNFT.getCurrentTokenId()).to.equal(3n);
      expect(await gameNFT.ownerOf(1n)).to.equal(creator.address);
      expect(await gameNFT.ownerOf(2n)).to.equal(buyer.address);
      expect(await gameNFT.ownerOf(3n)).to.equal(other.address);
    });

    it('Should revert when minting to zero address', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, ethers } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await expect(
        gameNFT.mint(ethers.ZeroAddress, 'ipfs://QmTest')
      ).to.be.revertedWith('Cannot mint to zero address');
    });

    it('Should revert when token URI is empty', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await expect(
        gameNFT.mint(creator.address, '')
      ).to.be.revertedWith('Token URI cannot be empty');
    });

    it('Should revert when non-owner tries to mint', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator, other } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await expect(
        gameNFT.connect(other).mint(creator.address, 'ipfs://QmTest')
      ).to.be.revertedWithCustomError(gameNFT, 'OwnableUnauthorizedAccount');
    });
  });

  describe('Batch Minting', function () {
    it('Should batch mint NFTs successfully', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      const tokenURIs = [
        'ipfs://QmTest1',
        'ipfs://QmTest2',
        'ipfs://QmTest3',
      ];
      
      const tx = await gameNFT.batchMint(creator.address, tokenURIs);
      await tx.wait();

      expect(await gameNFT.ownerOf(1n)).to.equal(creator.address);
      expect(await gameNFT.ownerOf(2n)).to.equal(creator.address);
      expect(await gameNFT.ownerOf(3n)).to.equal(creator.address);
      expect(await gameNFT.getCurrentTokenId()).to.equal(3n);
      expect(await gameNFT.tokenURI(1n)).to.equal(tokenURIs[0]);
      expect(await gameNFT.tokenURI(2n)).to.equal(tokenURIs[1]);
      expect(await gameNFT.tokenURI(3n)).to.equal(tokenURIs[2]);
    });

    it('Should emit Minted events for each token', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      const tokenURIs = ['ipfs://QmTest1', 'ipfs://QmTest2'];
      
      const tx = await gameNFT.batchMint(creator.address, tokenURIs);
      
      await expect(tx)
        .to.emit(gameNFT, 'Minted')
        .withArgs(1n, creator.address, tokenURIs[0]);
      
      await expect(tx)
        .to.emit(gameNFT, 'Minted')
        .withArgs(2n, creator.address, tokenURIs[1]);
    });

    it('Should handle maximum batch size of 20', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      const tokenURIs = Array.from({ length: 20 }, (_, i) => `ipfs://QmTest${i}`);
      
      await gameNFT.batchMint(creator.address, tokenURIs);
      
      expect(await gameNFT.getCurrentTokenId()).to.equal(20n);
    });

    it('Should revert when batch size exceeds 20', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      const tokenURIs = Array.from({ length: 21 }, (_, i) => `ipfs://QmTest${i}`);
      
      await expect(
        gameNFT.batchMint(creator.address, tokenURIs)
      ).to.be.revertedWith('Cannot mint more than 20 tokens at once');
    });

    it('Should revert when batch is empty', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await expect(
        gameNFT.batchMint(creator.address, [])
      ).to.be.revertedWith('Must mint at least one token');
    });

    it('Should revert when minting to zero address', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, ethers } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await expect(
        gameNFT.batchMint(ethers.ZeroAddress, ['ipfs://QmTest'])
      ).to.be.revertedWith('Cannot mint to zero address');
    });

    it('Should revert when any token URI is empty', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      const tokenURIs = ['ipfs://QmTest1', '', 'ipfs://QmTest3'];
      
      await expect(
        gameNFT.batchMint(creator.address, tokenURIs)
      ).to.be.revertedWith('Token URI cannot be empty');
    });
  });

  describe('Royalties', function () {
    it('Should calculate default royalty correctly', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, owner, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await gameNFT.mint(creator.address, 'ipfs://QmTest1');
      
      const salePrice = 10000n;
      const royaltyInfo = await gameNFT.royaltyInfo(1n, salePrice);
      
      expect(royaltyInfo[0]).to.equal(owner.address);
      expect(royaltyInfo[1]).to.equal(250n);
    });

    it('Should update default royalty', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await gameNFT.mint(creator.address, 'ipfs://QmTest1');
      await gameNFT.setDefaultRoyalty(creator.address, 500n);
      
      const royaltyInfo = await gameNFT.royaltyInfo(1n, 10000n);
      expect(royaltyInfo[0]).to.equal(creator.address);
      expect(royaltyInfo[1]).to.equal(500n);
    });

    it('Should set token-specific royalty', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator, buyer } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await gameNFT.mint(creator.address, 'ipfs://QmTest1');
      await gameNFT.setTokenRoyalty(1n, buyer.address, 750n);
      
      const royaltyInfo = await gameNFT.royaltyInfo(1n, 10000n);
      expect(royaltyInfo[0]).to.equal(buyer.address);
      expect(royaltyInfo[1]).to.equal(750n);
    });

    it('Should revert when royalty exceeds 10%', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await expect(
        gameNFT.setDefaultRoyalty(creator.address, 1001n)
      ).to.be.revertedWith('Royalty fee cannot exceed 10%');
    });

    it('Should revert when setting royalty for non-existent token', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await expect(
        gameNFT.setTokenRoyalty(999n, creator.address, 500n)
      ).to.be.revertedWith('Token does not exist');
    });

    it('Should revert when non-owner tries to set royalty', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator, other } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await expect(
        gameNFT.connect(other).setDefaultRoyalty(creator.address, 500n)
      ).to.be.revertedWithCustomError(gameNFT, 'OwnableUnauthorizedAccount');
    });
  });

  describe('ERC721 Compliance', function () {
    it('Should support ERC721 interface', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      const ERC721InterfaceId = '0x80ac58cd';
      expect(await gameNFT.supportsInterface(ERC721InterfaceId)).to.be.true;
    });

    it('Should support ERC2981 interface', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      const ERC2981InterfaceId = '0x2a55205a';
      expect(await gameNFT.supportsInterface(ERC2981InterfaceId)).to.be.true;
    });

    it('Should allow token transfer', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator, buyer } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await gameNFT.mint(creator.address, 'ipfs://QmTest1');
      await gameNFT.connect(creator).transferFrom(creator.address, buyer.address, 1n);
      
      expect(await gameNFT.ownerOf(1n)).to.equal(buyer.address);
    });

    it('Should allow approved transfer', async function () {
      const { networkHelpers } = await network.connect();
      const { gameNFT, creator, buyer, other } = await networkHelpers.loadFixture(deployGameNFTFixture);
      
      await gameNFT.mint(creator.address, 'ipfs://QmTest1');
      await gameNFT.connect(creator).approve(buyer.address, 1n);
      await gameNFT.connect(buyer).transferFrom(creator.address, other.address, 1n);
      
      expect(await gameNFT.ownerOf(1n)).to.equal(other.address);
    });
  });
});