// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MemeLaunchpadDemo {
    uint256 public constant BPS = 10_000;
    uint256 public constant TOKEN_UNIT = 1 ether;
    uint256 public constant SALE_SUPPLY = 50_000 ether;
    uint256 public constant LIQUIDITY_SUPPLY = 20_000 ether;
    uint256 public constant MAX_SUPPLY = SALE_SUPPLY + LIQUIDITY_SUPPLY;
    uint256 public constant PRICE_PER_TOKEN = 0.0005 ether;
    uint256 public constant DEV_BUY_BPS = 3_000;
    uint256 public constant SELL_REFUND_BPS = 7_000;
    uint256 public constant TRADE_TAX_BPS = 300;
    uint256 public constant TAX_DEV_SHARE_BPS = 5_000;
    uint256 public constant NFT_COST = 10 ether;
    uint256 public constant ACCESSORY_COST = 10 ether;
    uint256 public constant MAX_ACCESSORIES = 5;
    uint256 public constant DYNAMIC_PREVIEW_COST = NFT_COST + (ACCESSORY_COST * MAX_ACCESSORIES);

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    MemeToken public immutable token;
    MemeNFT public immutable nft;
    MemeV4HookMock public immutable hook;
    address public immutable devWallet;
    uint256 public devEthCollected;
    uint256 public liquidityEthSeeded;
    uint256 public liquidityTokenSeeded;
    uint256 public soldFromLaunchpad;
    uint256 public taxEthToDev;
    uint256 public taxEthToHolders;
    uint256 public taxEthClaimed;
    bool public liquiditySeeded;
    uint256[] private _marketTokenIds;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => uint256) public taxClaimedByToken;

    event Buy(address indexed user, uint256 tokenAmount, uint256 ethPaid);
    event Sell(address indexed user, uint256 tokenAmount, uint256 ethReceived);
    event DevFeePaid(address indexed devWallet, uint256 amount);
    event DevWithdrawal(address indexed devWallet, uint256 amount);
    event LiquiditySeeded(uint256 ethAmount);
    event PoolTaxRecorded(uint256 grossEthAmount, uint256 taxAmount, uint256 devShare, uint256 holderShare);
    event TaxRewardClaimed(address indexed user, uint256 indexed tokenId, uint256 amount);
    event KettyNftMinted(address indexed user, uint256 indexed tokenId, uint256 cost);
    event AccessoryAdded(address indexed user, uint256 indexed tokenId, uint256 slot, string rank, uint256 cost);
    event DynamicPreviewMinted(address indexed user, uint256 indexed tokenId, uint256 cost);
    event NftListed(address indexed seller, uint256 indexed tokenId, uint256 price);
    event NftListingCanceled(address indexed seller, uint256 indexed tokenId);
    event NftSold(address indexed seller, address indexed buyer, uint256 indexed tokenId, uint256 price);

    constructor() {
        devWallet = msg.sender;
        token = new MemeToken("KETTY", "KETTY", MAX_SUPPLY, address(this));
        nft = new MemeNFT("KETTY Cat State NFT", "KCAT");
        hook = new MemeV4HookMock(address(token), address(nft), address(this));

        token.setHook(address(hook));
        nft.setHook(address(hook));
    }

    modifier onlyDev() {
        require(msg.sender == devWallet, "not dev");
        _;
    }

    function buy(uint256 wholeTokens) external payable {
        require(wholeTokens > 0, "bad amount");
        uint256 cost = quoteBuy(wholeTokens);
        require(msg.value == cost, "wrong ETH");

        uint256 tokenAmount = wholeTokens * TOKEN_UNIT;
        require(soldFromLaunchpad + tokenAmount <= SALE_SUPPLY, "sold out");
        soldFromLaunchpad += tokenAmount;
        uint256 devShare = (cost * DEV_BUY_BPS) / BPS;
        _payDev(devShare);

        token.transfer(msg.sender, tokenAmount);
        hook.afterSwap(msg.sender);

        emit Buy(msg.sender, tokenAmount, cost);
    }

    function sell(uint256 wholeTokens) external pure {
        wholeTokens;
        revert("contract sell disabled");
    }

    function mintKettyNft() external {
        token.spendForLaunchpad(msg.sender, NFT_COST);

        uint256 tokenId = nft.mintFor(
            msg.sender,
            _randomSeed(msg.sender, nft.nextTokenId(), 0),
            token.balanceOf(msg.sender)
        );
        hook.afterSwap(msg.sender);

        emit KettyNftMinted(msg.sender, tokenId, NFT_COST);
    }

    function mintDynamicPreviewNft() external {
        token.spendForLaunchpad(msg.sender, DYNAMIC_PREVIEW_COST);

        uint256 tokenId = nft.mintFor(
            msg.sender,
            _randomSeed(msg.sender, nft.nextTokenId(), 0),
            token.balanceOf(msg.sender)
        );

        for (uint256 slot = 1; slot <= MAX_ACCESSORIES; slot++) {
            uint256 seed = _randomSeed(msg.sender, tokenId, slot);
            if (slot == MAX_ACCESSORIES) {
                seed = (seed / 100) * 100 + 7;
            }
            nft.addAccessoryFor(msg.sender, tokenId, seed, token.balanceOf(msg.sender));
        }

        hook.afterSwap(msg.sender);

        emit DynamicPreviewMinted(msg.sender, tokenId, DYNAMIC_PREVIEW_COST);
    }

    function addAccessory(uint256 tokenId) external {
        require(nft.ownerOf(tokenId) == msg.sender, "not NFT owner");
        require(nft.isActive(tokenId), "mint NFT first");
        require(nft.accessoryCountOf(tokenId) < MAX_ACCESSORIES, "max accessories");

        token.spendForLaunchpad(msg.sender, ACCESSORY_COST);
        uint256 slot = nft.addAccessoryFor(
            msg.sender,
            tokenId,
            _randomSeed(msg.sender, tokenId, nft.accessoryCountOf(tokenId) + 1),
            token.balanceOf(msg.sender)
        );
        hook.afterSwap(msg.sender);

        emit AccessoryAdded(msg.sender, tokenId, slot, nft.accessoryRankName(tokenId, slot), ACCESSORY_COST);
    }

    function listNft(uint256 tokenId, uint256 price) external {
        require(price > 0, "bad price");
        require(nft.ownerOf(tokenId) == msg.sender, "not NFT owner");
        require(nft.isActive(tokenId), "missing NFT");

        if (!listings[tokenId].active) {
            _marketTokenIds.push(tokenId);
        }

        listings[tokenId] = Listing({seller: msg.sender, price: price, active: true});
        emit NftListed(msg.sender, tokenId, price);
    }

    function cancelListing(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.active, "not listed");
        require(listing.seller == msg.sender, "not seller");

        delete listings[tokenId];
        emit NftListingCanceled(msg.sender, tokenId);
    }

    function buyListedNft(uint256 tokenId) external payable {
        Listing memory listing = listings[tokenId];
        require(listing.active, "not listed");
        require(msg.value == listing.price, "wrong ETH");
        require(nft.ownerOf(tokenId) == listing.seller, "stale listing");

        delete listings[tokenId];
        nft.transferForMarketplace(listing.seller, msg.sender, tokenId);
        hook.afterSwap(listing.seller);
        hook.afterSwap(msg.sender);

        (bool sent, ) = payable(listing.seller).call{value: msg.value}("");
        require(sent, "ETH send failed");

        emit NftSold(listing.seller, msg.sender, tokenId, msg.value);
    }

    function mockRecordPoolTax(uint256 grossEthAmount) external payable {
        uint256 taxAmount = quoteTradeTax(grossEthAmount);
        require(msg.value == taxAmount, "wrong tax ETH");

        uint256 devShare = (taxAmount * TAX_DEV_SHARE_BPS) / BPS;
        uint256 holderShare = taxAmount - devShare;
        taxEthToDev += devShare;
        taxEthToHolders += holderShare;
        _payDev(devShare);

        emit PoolTaxRecorded(grossEthAmount, taxAmount, devShare, holderShare);
    }

    function claimTaxReward(uint256 tokenId) external {
        require(nft.ownerOf(tokenId) == msg.sender, "not NFT owner");
        uint256 reward = claimableTaxReward(tokenId);
        require(reward > 0, "nothing to claim");

        taxClaimedByToken[tokenId] += reward;
        taxEthClaimed += reward;
        (bool sent, ) = payable(msg.sender).call{value: reward}("");
        require(sent, "ETH send failed");

        emit TaxRewardClaimed(msg.sender, tokenId, reward);
    }

    function devWithdrawEth(uint256 amount) external onlyDev {
        require(amount > 0, "bad amount");
        require(amount <= withdrawableDevEth(), "exceeds withdrawable");

        (bool sent, ) = payable(devWallet).call{value: amount}("");
        require(sent, "DEV withdraw failed");
        emit DevWithdrawal(devWallet, amount);
    }

    function quoteBuy(uint256 wholeTokens) public pure returns (uint256) {
        return wholeTokens * PRICE_PER_TOKEN;
    }

    function quoteSell(uint256 wholeTokens) public pure returns (uint256) {
        wholeTokens;
        return 0;
    }

    function quoteTradeTax(uint256 grossEthAmount) public pure returns (uint256) {
        return (grossEthAmount * TRADE_TAX_BPS) / BPS;
    }

    function claimableTaxReward(uint256 tokenId) public view returns (uint256) {
        uint256 weight = _accessoryWeight(nft.accessoryCountOf(tokenId));
        if (weight == 0 || taxEthToHolders == 0) return 0;

        uint256 totalWeight = _totalAccessoryWeight();
        if (totalWeight == 0) return 0;

        uint256 entitlement = (taxEthToHolders * weight) / totalWeight;
        uint256 claimed = taxClaimedByToken[tokenId];
        if (entitlement <= claimed) return 0;
        return entitlement - claimed;
    }

    function pendingHolderTax() public view returns (uint256) {
        if (taxEthToHolders <= taxEthClaimed) return 0;
        return taxEthToHolders - taxEthClaimed;
    }

    function sellRefundReserve() public pure returns (uint256) {
        return 0;
    }

    function launchLiquidityEthReserve() public view returns (uint256) {
        if (soldFromLaunchpad == 0) return 0;
        return (quoteBuy(soldFromLaunchpad / TOKEN_UNIT) * SELL_REFUND_BPS) / BPS;
    }

    function withdrawableDevEth() public view returns (uint256) {
        uint256 reservedEth = pendingHolderTax();
        uint256 balance = address(this).balance;
        if (balance <= reservedEth) return 0;
        return balance - reservedEth;
    }

    function seedLiquidity() external onlyDev {
        require(!liquiditySeeded, "liquidity seeded");
        require(soldFromLaunchpad >= SALE_SUPPLY, "sale active");
        _seedLiquidity();
    }

    function remainingForSale() external view returns (uint256) {
        return SALE_SUPPLY - soldFromLaunchpad;
    }

    function marketTokenIds() external view returns (uint256[] memory) {
        return _marketTokenIds;
    }

    function userState(address user)
        external
        view
        returns (uint256 tokenBalance, uint256 nftId, bool nftActive, uint256 nftPower, uint256 accessoryCount)
    {
        tokenBalance = token.balanceOf(user);
        nftId = nft.primaryTokenOf(user);
        nftActive = nft.isActive(nftId);
        nftPower = nft.powerOf(nftId);
        accessoryCount = nft.accessoryCountOf(nftId);
    }

    function _randomSeed(address user, uint256 tokenId, uint256 slot) private view returns (uint256) {
        return uint256(
            keccak256(
                abi.encodePacked(block.prevrandao, block.timestamp, blockhash(block.number - 1), user, tokenId, slot)
            )
        );
    }

    function _payDev(uint256 amount) private {
        if (amount == 0) return;
        devEthCollected += amount;
        (bool sent, ) = payable(devWallet).call{value: amount}("");
        require(sent, "DEV ETH send failed");
        emit DevFeePaid(devWallet, amount);
    }

    function _seedLiquidity() private {
        liquiditySeeded = true;
        liquidityEthSeeded = address(this).balance;
        liquidityTokenSeeded = LIQUIDITY_SUPPLY;
        hook.seedLiquidity(liquidityEthSeeded, liquidityTokenSeeded);
        emit LiquiditySeeded(liquidityEthSeeded);
    }

    function _totalAccessoryWeight() private view returns (uint256 totalWeight) {
        uint256 nextTokenId = nft.nextTokenId();
        for (uint256 tokenId = 1; tokenId < nextTokenId; tokenId++) {
            if (!nft.isActive(tokenId)) continue;
            totalWeight += _accessoryWeight(nft.accessoryCountOf(tokenId));
        }
    }

    function _accessoryWeight(uint256 count) private pure returns (uint256) {
        if (count == 0) return 0;
        if (count > MAX_ACCESSORIES) count = MAX_ACCESSORIES;
        return count * 10;
    }
}

contract MemeV4HookMock {
    MemeToken public immutable token;
    MemeNFT public immutable nft;
    address public immutable launchpad;
    uint256 public liquidityEthSeeded;
    uint256 public liquidityTokenSeeded;

    event HookSynced(address indexed user, uint256 tokenBalance, uint256 nftId, bool nftActive);
    event LiquiditySeeded(uint256 ethAmount, uint256 tokenAmount);

    constructor(address tokenAddress, address nftAddress, address launchpadAddress) {
        token = MemeToken(tokenAddress);
        nft = MemeNFT(nftAddress);
        launchpad = launchpadAddress;
    }

    modifier onlyTokenOrLaunchpad() {
        require(msg.sender == address(token) || msg.sender == launchpad, "not hook caller");
        _;
    }

    function afterSwap(address user) external onlyTokenOrLaunchpad {
        _sync(user);
    }

    function afterTokenTransfer(address from, address to) external {
        require(msg.sender == address(token), "not token");
        _sync(from);
        _sync(to);
    }

    function seedLiquidity(uint256 ethAmount, uint256 tokenAmount) external {
        require(msg.sender == launchpad, "not launchpad");
        liquidityEthSeeded = ethAmount;
        liquidityTokenSeeded = tokenAmount;
        emit LiquiditySeeded(ethAmount, tokenAmount);
    }

    function _sync(address user) private {
        if (user == address(0) || user == launchpad) {
            return;
        }

        nft.syncBalancePower(user, token.balanceOf(user));

        uint256 nftId = nft.primaryTokenOf(user);
        emit HookSynced(user, token.balanceOf(user), nftId, nft.isActive(nftId));
    }
}

contract MemeToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    address public immutable launchpad;
    address public hook;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event HookChanged(address indexed hook);

    constructor(string memory tokenName, string memory tokenSymbol, uint256 supply, address launchpadAddress) {
        name = tokenName;
        symbol = tokenSymbol;
        launchpad = launchpadAddress;
        _mint(launchpadAddress, supply);
    }

    modifier onlyLaunchpad() {
        require(msg.sender == launchpad, "not launchpad");
        _;
    }

    function setHook(address newHook) external onlyLaunchpad {
        hook = newHook;
        emit HookChanged(newHook);
    }

    function spendForLaunchpad(address from, uint256 value) external onlyLaunchpad {
        _transfer(from, launchpad, value);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) private {
        require(to != address(0), "zero to");
        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= value, "balance");

        balanceOf[from] = fromBalance - value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);

        if (hook != address(0)) {
            MemeV4HookMock(hook).afterTokenTransfer(from, to);
        }
    }

    function _mint(address to, uint256 value) private {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
}

contract MemeNFT {
    uint256 public constant MAX_ACCESSORIES = 5;
    uint256 public constant DYNAMIC_CHANCE_BPS = 15;
    uint256 public constant MAX_DYNAMIC_SUPPLY = 50;

    string public name;
    string public symbol;
    address public immutable launchpad;
    address public hook;
    uint256 public nextTokenId = 1;
    uint256 public dynamicMinted;

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public primaryTokenOf;
    mapping(address => uint256[]) private _tokensOfOwner;
    mapping(uint256 => bool) public isActive;
    mapping(uint256 => uint256) public powerOf;
    mapping(uint256 => uint256) public walletPowerOf;
    mapping(uint256 => uint256) public seedOf;
    mapping(uint256 => bool) public isDynamic;
    mapping(uint256 => uint256) private _accessoryCount;
    mapping(uint256 => mapping(uint256 => uint256)) public accessorySeedOf;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event HookChanged(address indexed hook);
    event PowerUpdated(uint256 indexed tokenId, uint256 nftPower, uint256 walletBalance);
    event AccessorySeeded(uint256 indexed tokenId, uint256 indexed slot, string rank);
    event DynamicRolled(uint256 indexed tokenId, bool dynamic, uint256 roll);

    constructor(string memory nftName, string memory nftSymbol) {
        name = nftName;
        symbol = nftSymbol;
        launchpad = msg.sender;
    }

    modifier onlyLaunchpad() {
        require(msg.sender == launchpad, "not launchpad");
        _;
    }

    modifier onlyHook() {
        require(msg.sender == hook, "not hook");
        _;
    }

    function setHook(address newHook) external onlyLaunchpad {
        require(hook == address(0), "hook set");
        hook = newHook;
        emit HookChanged(newHook);
    }

    function hasActiveToken(address user) external view returns (bool) {
        uint256 tokenId = primaryTokenOf[user];
        return tokenId != 0 && isActive[tokenId];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = _ownerOf[tokenId];
        require(tokenOwner != address(0) && isActive[tokenId], "missing NFT");
        return tokenOwner;
    }

    function tokensOfOwner(address user) external view returns (uint256[] memory) {
        return _tokensOfOwner[user];
    }

    function accessoryCountOf(uint256 tokenId) public view returns (uint256) {
        return _accessoryCount[tokenId];
    }

    function dynamicRemaining() external view returns (uint256) {
        if (dynamicMinted >= MAX_DYNAMIC_SUPPLY) return 0;
        return MAX_DYNAMIC_SUPPLY - dynamicMinted;
    }

    function mintFor(address user, uint256 seed, uint256 walletBalance) external onlyLaunchpad returns (uint256 tokenId) {
        require(user != address(0), "zero user");

        tokenId = nextTokenId++;
        primaryTokenOf[user] = tokenId;
        _tokensOfOwner[user].push(tokenId);
        _ownerOf[tokenId] = user;
        balanceOf[user] += 1;
        isActive[tokenId] = true;
        seedOf[tokenId] = seed;
        powerOf[tokenId] = 10 ether;
        walletPowerOf[tokenId] = walletBalance;

        emit Transfer(address(0), user, tokenId);
        emit PowerUpdated(tokenId, powerOf[tokenId], walletBalance);
    }

    function addAccessoryFor(address user, uint256 tokenId, uint256 seed, uint256 walletBalance) external onlyLaunchpad returns (uint256 slot) {
        require(_ownerOf[tokenId] == user && isActive[tokenId], "missing NFT");

        slot = _accessoryCount[tokenId] + 1;
        require(slot <= MAX_ACCESSORIES, "max accessories");

        _accessoryCount[tokenId] = slot;
        accessorySeedOf[tokenId][slot] = seed;
        powerOf[tokenId] += 10 ether;
        walletPowerOf[tokenId] = walletBalance;

        emit AccessorySeeded(tokenId, slot, _rankName(seed));
        if (slot == MAX_ACCESSORIES) {
            uint256 roll = seed % 100;
            if (dynamicMinted < MAX_DYNAMIC_SUPPLY && roll < DYNAMIC_CHANCE_BPS) {
                isDynamic[tokenId] = true;
                dynamicMinted += 1;
            }
            emit DynamicRolled(tokenId, isDynamic[tokenId], roll);
        }
        emit PowerUpdated(tokenId, powerOf[tokenId], walletBalance);
    }

    function transferForMarketplace(address from, address to, uint256 tokenId) external onlyLaunchpad {
        require(_ownerOf[tokenId] == from && isActive[tokenId], "missing NFT");
        require(to != address(0), "zero to");

        _removeOwnedToken(from, tokenId);
        _tokensOfOwner[to].push(tokenId);
        _ownerOf[tokenId] = to;
        balanceOf[from] -= 1;
        balanceOf[to] += 1;

        if (primaryTokenOf[from] == tokenId) {
            primaryTokenOf[from] = _tokensOfOwner[from].length == 0 ? 0 : _tokensOfOwner[from][_tokensOfOwner[from].length - 1];
        }
        primaryTokenOf[to] = tokenId;

        emit Transfer(from, to, tokenId);
    }

    function syncBalancePower(address user, uint256 walletBalance) external onlyHook {
        uint256[] storage tokenIds = _tokensOfOwner[user];
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            if (!isActive[tokenId]) continue;
            walletPowerOf[tokenId] = walletBalance;
            emit PowerUpdated(tokenId, powerOf[tokenId], walletBalance);
        }
    }

    function accessoryRankName(uint256 tokenId, uint256 slot) external view returns (string memory) {
        require(slot > 0 && slot <= _accessoryCount[tokenId], "missing accessory");
        return _rankName(accessorySeedOf[tokenId][slot]);
    }

    function _removeOwnedToken(address owner, uint256 tokenId) private {
        uint256[] storage tokenIds = _tokensOfOwner[owner];
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] != tokenId) continue;
            tokenIds[i] = tokenIds[tokenIds.length - 1];
            tokenIds.pop();
            return;
        }
        revert("owner token missing");
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(isActive[tokenId], "missing NFT");

        string memory svg = _svg(tokenId);
        string memory image = string(abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(bytes(svg))));
        string memory json = string(
            abi.encodePacked(
                '{"name":"KETTY Cat #',
                _toString(tokenId),
                '","description":"A fully on-chain KETTY CAT NFT. Minting costs 10 KETTY; every extra accessory costs 10 KETTY and gets a random rank from the contract. A fully upgraded cat has a 15% on-chain chance to become dynamic.","image":"',
                image,
                '","attributes":',
                _attributes(tokenId),
                "}"
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function _attributes(uint256 tokenId) private view returns (string memory) {
        uint256 seed = seedOf[tokenId];
        return string(
            abi.encodePacked(
                '[{"trait_type":"Fur","value":"',
                _furName(seed),
                '"},{"trait_type":"Background","value":"',
                _backgroundName(seed),
                '"},{"trait_type":"Eyes","value":"',
                _eyesName(seed),
                '"},{"trait_type":"Outfit","value":"',
                _outfitName(seed),
                '"},{"trait_type":"Accessory Count","value":"',
                _toString(_accessoryCount[tokenId]),
                '"},{"trait_type":"NFT KETTY Spent","value":"',
                _toString(powerOf[tokenId] / 1 ether),
                '"}',
                ',{"trait_type":"Dynamic NFT","value":"',
                isDynamic[tokenId] ? "Yes" : "No",
                '"}',
                ',{"trait_type":"Dynamic Background","value":"',
                _dynamicBackgroundName(seed),
                '"}',
                _accessoryAttributes(tokenId),
                "]"
            )
        );
    }

    function _accessoryAttributes(uint256 tokenId) private view returns (string memory) {
        string memory attributes = "";
        uint256 count = _accessoryCount[tokenId];
        if (count >= 1) attributes = string(abi.encodePacked(attributes, ',{"trait_type":"Crown Rank","value":"', _rankName(accessorySeedOf[tokenId][1]), '"}'));
        if (count >= 2) attributes = string(abi.encodePacked(attributes, ',{"trait_type":"Earrings Rank","value":"', _rankName(accessorySeedOf[tokenId][2]), '"}'));
        if (count >= 3) attributes = string(abi.encodePacked(attributes, ',{"trait_type":"Visor Rank","value":"', _rankName(accessorySeedOf[tokenId][3]), '"}'));
        if (count >= 4) attributes = string(abi.encodePacked(attributes, ',{"trait_type":"Star Rank","value":"', _rankName(accessorySeedOf[tokenId][4]), '"}'));
        if (count >= 5) attributes = string(abi.encodePacked(attributes, ',{"trait_type":"Collar Rank","value":"', _rankName(accessorySeedOf[tokenId][5]), '"}'));
        return attributes;
    }

    function _svg(uint256 tokenId) private view returns (string memory) {
        uint256 seed = seedOf[tokenId];
        string memory bg = _backgroundColor(seed);
        string memory fur = _furColor(seed);
        string memory outfit = _outfitColor(seed);
        string memory eyes = _eyes(seed);
        string memory dynamicOpen = isDynamic[tokenId] ? '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="1.2s" repeatCount="indefinite"/>' : "";
        string memory dynamicClose = isDynamic[tokenId] ? "</g>" : "";

        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges"><rect width="512" height="512" fill="',
                bg,
                '"/>',
                _dynamicBackground(tokenId),
                '<rect x="32" y="32" width="64" height="64" fill="#fff" opacity=".18"/><rect x="416" y="384" width="64" height="64" fill="#111" opacity=".12"/>',
                dynamicOpen,
                '<rect x="144" y="128" width="48" height="48" fill="',
                fur,
                '"/><rect x="320" y="128" width="48" height="48" fill="',
                fur,
                '"/><rect x="112" y="176" width="288" height="224" fill="#111"/><rect x="128" y="176" width="256" height="208" fill="',
                fur,
                '"/><rect x="160" y="160" width="32" height="32" fill="#ffd9c9"/><rect x="320" y="160" width="32" height="32" fill="#ffd9c9"/>',
                '<rect x="160" y="352" width="192" height="80" fill="#111"/><rect x="176" y="352" width="160" height="64" fill="',
                outfit,
                '"/>',
                eyes,
                '<rect x="240" y="288" width="32" height="16" fill="#111"/><rect x="224" y="328" width="16" height="16" fill="#111"/><rect x="240" y="344" width="32" height="16" fill="#111"/><rect x="272" y="328" width="16" height="16" fill="#111"/>',
                _accessories(tokenId),
                dynamicClose,
                '<text x="28" y="54" fill="#111" font-family="monospace" font-size="24" font-weight="900">KETTY CAT #',
                _toString(tokenId),
                '</text><text x="28" y="486" fill="#111" font-family="monospace" font-size="18" font-weight="900">',
                _toString(powerOf[tokenId] / 1 ether),
                ' KETTY USED</text>',
                isDynamic[tokenId] ? '<text x="344" y="486" fill="#111" font-family="monospace" font-size="18" font-weight="900">DYNAMIC</text>' : "",
                "</svg>"
            )
        );
    }

    function _dynamicBackground(uint256 tokenId) private view returns (string memory) {
        if (!isDynamic[tokenId]) return "";
        uint256 style = seedOf[tokenId] % 5;
        if (style == 0) return _dynamicRainbow();
        if (style == 1) return _dynamicRain();
        if (style == 2) return _dynamicThunder();
        if (style == 3) return _dynamicMeteor();
        return _dynamicAurora();
    }

    function _dynamicBackgroundName(uint256 seed) private pure returns (string memory) {
        uint256 style = seed % 5;
        if (style == 0) return "Rainbow Rush";
        if (style == 1) return "Pixel Rain";
        if (style == 2) return "Thunderstorm";
        if (style == 3) return "Meteor Night";
        return "Aurora Pulse";
    }

    function _dynamicRainbow() private pure returns (string memory) {
        return '<rect width="512" height="512" fill="#101018"/><g opacity=".92"><animateTransform attributeName="transform" type="translate" values="-384 0;0 0" dur="1.8s" repeatCount="indefinite"/><rect x="-384" y="56" width="896" height="24" fill="#ff335f"/><rect x="-384" y="80" width="896" height="24" fill="#ff9f1c"/><rect x="-384" y="104" width="896" height="24" fill="#ffe347"/><rect x="-384" y="128" width="896" height="24" fill="#4dff88"/><rect x="-384" y="152" width="896" height="24" fill="#48f0ff"/><rect x="-384" y="176" width="896" height="24" fill="#6f6dff"/><rect x="-384" y="200" width="896" height="24" fill="#d85cff"/><rect x="-288" y="304" width="896" height="18" fill="#ff335f"/><rect x="-288" y="322" width="896" height="18" fill="#ffe347"/><rect x="-288" y="340" width="896" height="18" fill="#48f0ff"/><rect x="-288" y="358" width="896" height="18" fill="#d85cff"/></g><g opacity=".88"><rect x="40" y="48" width="24" height="24" fill="#fff"/><rect x="420" y="72" width="18" height="18" fill="#fff"/><rect x="88" y="404" width="20" height="20" fill="#ffd447"/><rect x="404" y="404" width="28" height="28" fill="#48f0ff"/><animateTransform attributeName="transform" type="translate" values="0 0;28 -18;0 0" dur="2.4s" repeatCount="indefinite"/></g><rect width="512" height="512" fill="#ffffff" opacity=".05"><animate attributeName="opacity" values=".03;.14;.03" dur=".9s" repeatCount="indefinite"/></rect>';
    }

    function _dynamicRain() private pure returns (string memory) {
        return '<rect width="512" height="512" fill="#101827"/><rect y="372" width="512" height="140" fill="#1f2a44"/><g opacity=".9"><animateTransform attributeName="transform" type="translate" values="0 -180;0 120" dur=".8s" repeatCount="indefinite"/><rect x="48" y="0" width="8" height="48" fill="#7bdff2"/><rect x="116" y="40" width="8" height="64" fill="#bde0fe"/><rect x="188" y="-20" width="8" height="56" fill="#7bdff2"/><rect x="260" y="60" width="8" height="64" fill="#bde0fe"/><rect x="340" y="12" width="8" height="56" fill="#7bdff2"/><rect x="424" y="80" width="8" height="64" fill="#bde0fe"/><rect x="480" y="24" width="8" height="48" fill="#7bdff2"/></g><g opacity=".72"><animateTransform attributeName="transform" type="translate" values="0 -220;0 90" dur="1.15s" repeatCount="indefinite"/><rect x="84" y="8" width="6" height="44" fill="#ffffff"/><rect x="220" y="76" width="6" height="52" fill="#ffffff"/><rect x="396" y="-24" width="6" height="52" fill="#ffffff"/></g>';
    }

    function _dynamicThunder() private pure returns (string memory) {
        return '<rect width="512" height="512" fill="#090b16"/><rect width="512" height="512" fill="#ffffff" opacity=".02"><animate attributeName="opacity" values=".02;.38;.03;.22;.02" dur="1.6s" repeatCount="indefinite"/></rect><rect x="0" y="384" width="512" height="128" fill="#171b2f"/><path d="M272 16 L184 196 H248 L184 392 L344 160 H272 Z" fill="#ffe347" opacity=".9"><animate attributeName="opacity" values=".15;1;.2;.85;.15" dur="1.1s" repeatCount="indefinite"/></path><path d="M370 72 L318 188 H360 L304 316 L424 156 H378 Z" fill="#48f0ff" opacity=".65"><animate attributeName="opacity" values=".05;.75;.05" dur="1.8s" repeatCount="indefinite"/></path>';
    }

    function _dynamicMeteor() private pure returns (string memory) {
        return '<rect width="512" height="512" fill="#090918"/><g fill="#fff" opacity=".85"><rect x="48" y="80" width="8" height="8"/><rect x="172" y="48" width="8" height="8"/><rect x="420" y="92" width="8" height="8"/><rect x="356" y="220" width="8" height="8"/><rect x="92" y="280" width="8" height="8"/></g><g><animateTransform attributeName="transform" type="translate" values="360 -120;-240 420" dur="1.5s" repeatCount="indefinite"/><rect x="96" y="96" width="112" height="16" fill="#48f0ff" opacity=".55"/><rect x="192" y="96" width="32" height="16" fill="#fff"/><rect x="224" y="96" width="24" height="16" fill="#ffd447"/></g><g><animateTransform attributeName="transform" type="translate" values="540 0;-120 380" dur="2.2s" repeatCount="indefinite"/><rect x="40" y="180" width="88" height="12" fill="#d85cff" opacity=".55"/><rect x="120" y="180" width="28" height="12" fill="#fff"/></g>';
    }

    function _dynamicAurora() private pure returns (string memory) {
        return '<rect width="512" height="512" fill="#06131f"/><rect y="352" width="512" height="160" fill="#0b302c"/><g opacity=".76"><animateTransform attributeName="transform" type="translate" values="-80 0;80 0;-80 0" dur="3s" repeatCount="indefinite"/><path d="M-40 120 C80 24 144 220 256 120 C360 36 420 220 560 96 L560 252 C440 348 348 164 244 264 C132 372 64 176 -40 284 Z" fill="#4dff88"/><path d="M-20 176 C92 84 152 284 268 176 C372 84 424 268 548 156 L548 300 C408 384 340 220 240 320 C128 424 60 236 -20 336 Z" fill="#48f0ff" opacity=".75"/><path d="M-20 216 C80 132 168 328 268 224 C380 112 428 312 548 204 L548 340 C408 430 332 268 236 356 C128 456 72 276 -20 376 Z" fill="#d85cff" opacity=".55"/></g><rect width="512" height="512" fill="#ffffff" opacity=".02"><animate attributeName="opacity" values=".02;.1;.02" dur="1.8s" repeatCount="indefinite"/></rect>';
    }

    function _eyes(uint256 seed) private pure returns (string memory) {
        uint256 style = seed % 4;
        if (style == 0) {
            return '<rect x="192" y="256" width="32" height="32" fill="#111"/><rect x="288" y="256" width="32" height="32" fill="#111"/><rect x="208" y="256" width="8" height="8" fill="#fff"/><rect x="304" y="256" width="8" height="8" fill="#fff"/>';
        }
        if (style == 1) {
            return '<rect x="192" y="272" width="40" height="16" fill="#111"/><rect x="280" y="272" width="40" height="16" fill="#111"/>';
        }
        if (style == 2) {
            return '<rect x="184" y="256" width="16" height="16" fill="#111"/><rect x="200" y="272" width="32" height="16" fill="#111"/><rect x="280" y="272" width="32" height="16" fill="#111"/><rect x="312" y="256" width="16" height="16" fill="#111"/>';
        }
        return '<rect x="184" y="248" width="48" height="40" fill="#111"/><rect x="280" y="248" width="48" height="40" fill="#111"/><rect x="192" y="256" width="32" height="16" fill="#48f0ff"/><rect x="288" y="256" width="32" height="16" fill="#48f0ff"/>';
    }

    function _accessories(uint256 tokenId) private view returns (string memory) {
        string memory acc = "";
        uint256 count = _accessoryCount[tokenId];
        if (count >= 1) acc = string(abi.encodePacked(acc, _crown(accessorySeedOf[tokenId][1])));
        if (count >= 2) acc = string(abi.encodePacked(acc, _earrings(accessorySeedOf[tokenId][2])));
        if (count >= 3) acc = string(abi.encodePacked(acc, _visor(accessorySeedOf[tokenId][3])));
        if (count >= 4) acc = string(abi.encodePacked(acc, _star(accessorySeedOf[tokenId][4])));
        if (count >= 5) acc = string(abi.encodePacked(acc, _collar(accessorySeedOf[tokenId][5])));
        return acc;
    }

    function _crown(uint256 seed) private pure returns (string memory) {
        string memory color = _rankColor(seed);
        return string(abi.encodePacked('<rect x="192" y="112" width="32" height="48" fill="', color, '"/><rect x="240" y="96" width="32" height="64" fill="', color, '"/><rect x="288" y="112" width="32" height="48" fill="', color, '"/><rect x="176" y="152" width="160" height="24" fill="#111"/><rect x="192" y="152" width="128" height="16" fill="', color, '"/>'));
    }

    function _earrings(uint256 seed) private pure returns (string memory) {
        string memory color = _rankColor(seed);
        return string(abi.encodePacked('<rect x="128" y="304" width="32" height="32" fill="#111"/><rect x="136" y="312" width="16" height="16" fill="', color, '"/><rect x="352" y="304" width="32" height="32" fill="#111"/><rect x="360" y="312" width="16" height="16" fill="', color, '"/>'));
    }

    function _visor(uint256 seed) private pure returns (string memory) {
        string memory color = _rankColor(seed);
        return string(abi.encodePacked('<rect x="168" y="240" width="176" height="24" fill="#111"/><rect x="184" y="248" width="144" height="8" fill="', color, '"/>'));
    }

    function _star(uint256 seed) private pure returns (string memory) {
        string memory color = _rankColor(seed);
        return string(abi.encodePacked('<rect x="392" y="144" width="24" height="24" fill="', color, '"/><rect x="368" y="168" width="72" height="24" fill="', color, '"/><rect x="392" y="192" width="24" height="24" fill="', color, '"/><rect x="384" y="160" width="40" height="40" fill="none" stroke="#111" stroke-width="8"/>'));
    }

    function _collar(uint256 seed) private pure returns (string memory) {
        string memory color = _rankColor(seed);
        return string(abi.encodePacked('<rect x="176" y="344" width="160" height="24" fill="#111"/><rect x="192" y="344" width="128" height="16" fill="', color, '"/><rect x="248" y="360" width="16" height="16" fill="', color, '"/>'));
    }

    function _rank(uint256 seed) private pure returns (uint256) {
        uint256 roll = seed % 100;
        if (roll < 50) return 0;
        if (roll < 80) return 1;
        if (roll < 95) return 2;
        return 3;
    }

    function _rankName(uint256 seed) private pure returns (string memory) {
        uint256 rank = _rank(seed);
        if (rank == 0) return "Common";
        if (rank == 1) return "Rare";
        if (rank == 2) return "Epic";
        return "Legendary";
    }

    function _rankColor(uint256 seed) private pure returns (string memory) {
        uint256 rank = _rank(seed);
        if (rank == 0) return "#c7d2d8";
        if (rank == 1) return "#48f0ff";
        if (rank == 2) return "#b855ff";
        return "#ffd447";
    }

    function _backgroundColor(uint256 seed) private pure returns (string memory) {
        uint256 index = (seed / 3) % 6;
        if (index == 0) return "#f6d365";
        if (index == 1) return "#7bdff2";
        if (index == 2) return "#cdb4db";
        if (index == 3) return "#b8f2e6";
        if (index == 4) return "#ffafcc";
        return "#bde0fe";
    }

    function _furColor(uint256 seed) private pure returns (string memory) {
        uint256 index = (seed / 5) % 6;
        if (index == 0) return "#f2a65a";
        if (index == 1) return "#f6d6ad";
        if (index == 2) return "#8d6e63";
        if (index == 3) return "#bfc0c0";
        if (index == 4) return "#f7cad0";
        return "#7f5539";
    }

    function _outfitColor(uint256 seed) private pure returns (string memory) {
        uint256 index = (seed / 7) % 6;
        if (index == 0) return "#111111";
        if (index == 1) return "#2a9d8f";
        if (index == 2) return "#e76f51";
        if (index == 3) return "#264653";
        if (index == 4) return "#8338ec";
        return "#ffbe0b";
    }

    function _furName(uint256 seed) private pure returns (string memory) {
        uint256 index = (seed / 5) % 6;
        if (index == 0) return "Orange";
        if (index == 1) return "Cream";
        if (index == 2) return "Mocha";
        if (index == 3) return "Silver";
        if (index == 4) return "Pink";
        return "Cocoa";
    }

    function _backgroundName(uint256 seed) private pure returns (string memory) {
        uint256 index = (seed / 3) % 6;
        if (index == 0) return "Sunrise";
        if (index == 1) return "Aqua";
        if (index == 2) return "Lilac";
        if (index == 3) return "Mint";
        if (index == 4) return "Bubblegum";
        return "Sky";
    }

    function _eyesName(uint256 seed) private pure returns (string memory) {
        uint256 style = seed % 4;
        if (style == 0) return "Bright";
        if (style == 1) return "Sleepy";
        if (style == 2) return "Happy";
        return "Cyber";
    }

    function _outfitName(uint256 seed) private pure returns (string memory) {
        uint256 index = (seed / 7) % 6;
        if (index == 0) return "Black Hoodie";
        if (index == 1) return "Teal Jacket";
        if (index == 2) return "Red Tee";
        if (index == 3) return "Navy Suit";
        if (index == 4) return "Purple Coat";
        return "Gold Vest";
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

library Base64 {
    string internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";

        string memory table = TABLE;
        uint256 encodedLength = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLength + 32);

        assembly {
            mstore(result, encodedLength)

            let tablePtr := add(table, 1)
            let dataPtr := data
            let endPtr := add(dataPtr, mload(data))
            let resultPtr := add(result, 32)

            for {} lt(dataPtr, endPtr) {} {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)

                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }

            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(resultPtr, 1), 0x3d)
                mstore8(sub(resultPtr, 2), 0x3d)
            }
            case 2 {
                mstore8(sub(resultPtr, 1), 0x3d)
            }
        }

        return result;
    }
}
