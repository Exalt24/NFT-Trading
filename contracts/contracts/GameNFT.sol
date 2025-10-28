// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GameNFT
 * @dev ERC721 NFT contract with royalty support and batch minting
 */
contract GameNFT is ERC721URIStorage, ERC2981, Ownable {
    uint256 private _tokenIdCounter;
    uint96 private constant DEFAULT_ROYALTY_FEE = 250; // 2.5%

    // Events
    event Minted(uint256 indexed tokenId, address indexed owner, string tokenURI);
    event DefaultRoyaltyUpdated(address indexed receiver, uint96 feeNumerator);
    event TokenRoyaltyUpdated(uint256 indexed tokenId, address indexed receiver, uint96 feeNumerator);

    constructor(address initialOwner)
        ERC721("GameNFT", "GNFT")
        Ownable(initialOwner)
    {
        _tokenIdCounter = 0;
        _setDefaultRoyalty(initialOwner, DEFAULT_ROYALTY_FEE);
    }

    /**
     * @dev Mint a single NFT
     * @param to Address to mint to
     * @param uri Token URI (IPFS CID)
     * @return tokenId The minted token ID
     */
    function mint(address to, string memory uri) public onlyOwner returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(uri).length > 0, "Token URI cannot be empty");

        _tokenIdCounter += 1;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit Minted(tokenId, to, uri);

        return tokenId;
    }

    /**
     * @dev Batch mint multiple NFTs
     * @param to Address to mint to
     * @param uris Array of token URIs
     * @return tokenIds Array of minted token IDs
     */
    function batchMint(address to, string[] memory uris) public onlyOwner returns (uint256[] memory) {
        require(to != address(0), "Cannot mint to zero address");
        require(uris.length > 0, "Must mint at least one token");
        require(uris.length <= 20, "Cannot mint more than 20 tokens at once");

        uint256[] memory tokenIds = new uint256[](uris.length);

        for (uint256 i = 0; i < uris.length; i++) {
            require(bytes(uris[i]).length > 0, "Token URI cannot be empty");
           
            _tokenIdCounter += 1;
            uint256 tokenId = _tokenIdCounter;

            _safeMint(to, tokenId);
            _setTokenURI(tokenId, uris[i]);

            tokenIds[i] = tokenId;

            emit Minted(tokenId, to, uris[i]);
        }

        return tokenIds;
    }

    /**
     * @dev Set default royalty for all tokens
     * @param receiver Address to receive royalties
     * @param feeNumerator Royalty percentage in basis points (250 = 2.5%)
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) public onlyOwner {
        require(feeNumerator <= 1000, "Royalty fee cannot exceed 10%");
        _setDefaultRoyalty(receiver, feeNumerator);
        emit DefaultRoyaltyUpdated(receiver, feeNumerator);
    }

    /**
     * @dev Set royalty for a specific token
     * @param tokenId Token ID
     * @param receiver Address to receive royalties
     * @param feeNumerator Royalty percentage in basis points
     */
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(feeNumerator <= 1000, "Royalty fee cannot exceed 10%");
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
        emit TokenRoyaltyUpdated(tokenId, receiver, feeNumerator);
    }

    /**
     * @dev Get current token counter
     * @return Current token ID counter
     */
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}