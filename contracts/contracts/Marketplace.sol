// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Marketplace is Ownable, ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
        bool isActive;
    }

    uint96 private constant MAX_PLATFORM_FEE = 1000; // 10%
    uint96 public platformFee = 250; // 2.5%
    uint256 public collectedFees;

    mapping(address => mapping(uint256 => Listing)) public listings;

    event Listed(address indexed nftContract, uint256 indexed tokenId, address indexed seller, uint256 price);
    event Sold(address indexed nftContract, uint256 indexed tokenId, address seller, address indexed buyer, uint256 price);
    event Cancelled(address indexed nftContract, uint256 indexed tokenId, address indexed seller);
    event PriceUpdated(address indexed nftContract, uint256 indexed tokenId, uint256 oldPrice, uint256 newPrice);
    event PlatformFeeUpdated(uint96 oldFee, uint96 newFee);

    error NotTokenOwner();
    error NotApprovedForMarketplace();
    error AlreadyListed();
    error NotListed();
    error NotSeller();
    error PriceZero();
    error InsufficientPayment();
    error FeeTooHigh();
    error TransferFailed();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function listNFT(address nftContract, uint256 tokenId, uint256 price) external {
        if (price == 0) revert PriceZero();

        IERC721 nft = IERC721(nftContract);
        
        if (nft.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (nft.getApproved(tokenId) != address(this) && !nft.isApprovedForAll(msg.sender, address(this))) {
            revert NotApprovedForMarketplace();
        }
        if (listings[nftContract][tokenId].isActive) revert AlreadyListed();

        listings[nftContract][tokenId] = Listing({
            seller: msg.sender,
            price: price,
            isActive: true
        });

        emit Listed(nftContract, tokenId, msg.sender, price);
    }

    function buyNFT(address nftContract, uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[nftContract][tokenId];
        
        if (!listing.isActive) revert NotListed();
        if (msg.value < listing.price) revert InsufficientPayment();

        listings[nftContract][tokenId].isActive = false;

        uint256 platformFeeAmount = (listing.price * platformFee) / 10000;
        uint256 royaltyAmount = 0;
        address royaltyReceiver = address(0);

        if (IERC721(nftContract).supportsInterface(type(IERC2981).interfaceId)) {
            (royaltyReceiver, royaltyAmount) = IERC2981(nftContract).royaltyInfo(tokenId, listing.price);
        }

        uint256 sellerProceeds = listing.price - platformFeeAmount - royaltyAmount;
        
        collectedFees += platformFeeAmount;

        IERC721(nftContract).safeTransferFrom(listing.seller, msg.sender, tokenId);

        (bool sellerSuccess, ) = payable(listing.seller).call{value: sellerProceeds}("");
        if (!sellerSuccess) revert TransferFailed();

        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            (bool royaltySuccess, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            if (!royaltySuccess) revert TransferFailed();
        }

        if (msg.value > listing.price) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
            if (!refundSuccess) revert TransferFailed();
        }

        emit Sold(nftContract, tokenId, listing.seller, msg.sender, listing.price);
    }

    function cancelListing(address nftContract, uint256 tokenId) external {
        Listing memory listing = listings[nftContract][tokenId];
        
        if (!listing.isActive) revert NotListed();
        if (listing.seller != msg.sender) revert NotSeller();

        listings[nftContract][tokenId].isActive = false;

        emit Cancelled(nftContract, tokenId, msg.sender);
    }

    function updatePrice(address nftContract, uint256 tokenId, uint256 newPrice) external {
        if (newPrice == 0) revert PriceZero();

        Listing storage listing = listings[nftContract][tokenId];
        
        if (!listing.isActive) revert NotListed();
        if (listing.seller != msg.sender) revert NotSeller();

        uint256 oldPrice = listing.price;
        listing.price = newPrice;

        emit PriceUpdated(nftContract, tokenId, oldPrice, newPrice);
    }

    function getListing(address nftContract, uint256 tokenId) external view returns (Listing memory) {
        return listings[nftContract][tokenId];
    }

    function updatePlatformFee(uint96 newFee) external onlyOwner {
        if (newFee > MAX_PLATFORM_FEE) revert FeeTooHigh();

        uint96 oldFee = platformFee;
        platformFee = newFee;

        emit PlatformFeeUpdated(oldFee, newFee);
    }

    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = collectedFees;
        collectedFees = 0;

        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}