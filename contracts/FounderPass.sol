// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract FounderPass {
    string public name;
    string public symbol;
    string public baseTokenURI;

    uint256 public immutable maxSupply;
    uint256 public mintPrice;
    uint256 public totalSupply;
    address public owner;
    bool public saleActive;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(address => uint256) public mintedBy;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event SaleStateChanged(bool active);
    event MintPriceChanged(uint256 mintPrice);
    event BaseURIChanged(string baseTokenURI);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error SaleClosed();
    error SoldOut();
    error WrongPayment();
    error MintLimitReached();
    error ZeroAddress();
    error TokenMissing();
    error NotApproved();
    error TransferRejected();

    constructor(
        string memory collectionName,
        string memory collectionSymbol,
        uint256 collectionMaxSupply,
        uint256 collectionMintPrice,
        string memory collectionBaseURI
    ) {
        require(collectionMaxSupply > 0, "max supply required");
        name = collectionName;
        symbol = collectionSymbol;
        maxSupply = collectionMaxSupply;
        mintPrice = collectionMintPrice;
        baseTokenURI = collectionBaseURI;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function mint(uint256 quantity) external payable {
        if (!saleActive) revert SaleClosed();
        if (quantity == 0 || totalSupply + quantity > maxSupply) revert SoldOut();
        if (mintedBy[msg.sender] + quantity > 3) revert MintLimitReached();
        if (msg.value != mintPrice * quantity) revert WrongPayment();

        mintedBy[msg.sender] += quantity;

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply + 1;
            totalSupply = tokenId;
            _safeMint(msg.sender, tokenId);
        }
    }

    function ownerMint(address to, uint256 quantity) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (quantity == 0 || totalSupply + quantity > maxSupply) revert SoldOut();

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply + 1;
            totalSupply = tokenId;
            _safeMint(to, tokenId);
        }
    }

    function balanceOf(address account) public view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) revert TokenMissing();
        return tokenOwner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        return string(abi.encodePacked(baseTokenURI, _toString(tokenId), ".json"));
    }

    function approve(address to, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        if (msg.sender != tokenOwner && !isApprovedForAll(tokenOwner, msg.sender)) revert NotApproved();
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        ownerOf(tokenId);
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (!_isApprovedOrOwner(msg.sender, tokenId)) revert NotApproved();
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        transferFrom(from, to, tokenId);
        if (!_checkOnERC721Received(from, to, tokenId, data)) revert TransferRejected();
    }

    function setSaleActive(bool active) external onlyOwner {
        saleActive = active;
        emit SaleStateChanged(active);
    }

    function setMintPrice(uint256 newMintPrice) external onlyOwner {
        mintPrice = newMintPrice;
        emit MintPriceChanged(newMintPrice);
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
        emit BaseURIChanged(newBaseURI);
    }

    function withdraw(address payable to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool sent, ) = to.call{value: address(this).balance}("");
        require(sent, "withdraw failed");
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function _safeMint(address to, uint256 tokenId) private {
        if (to == address(0)) revert ZeroAddress();
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
        if (!_checkOnERC721Received(address(0), to, tokenId, "")) revert TransferRejected();
    }

    function _transfer(address from, address to, uint256 tokenId) private {
        if (ownerOf(tokenId) != from) revert NotApproved();
        if (to == address(0)) revert ZeroAddress();

        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) private view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return spender == tokenOwner || getApproved(tokenId) == spender || isApprovedForAll(tokenOwner, spender);
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) private returns (bool) {
        if (to.code.length == 0) return true;

        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
            return retval == IERC721Receiver.onERC721Received.selector;
        } catch {
            return false;
        }
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}
