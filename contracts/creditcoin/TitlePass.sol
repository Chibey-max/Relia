// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @dev Minimal ERC-721 receiver interface, used only to check that a
///      contract recipient of a cleared title actually implements it.
interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4);
}

/// @title TitlePass — soulbound ERC-721 whose slices are earned, not minted
/// @notice `tokenId == uint256(assetId)`. The pass exists from listing, but it
///         is worth nothing until slices are ticked, and each tick requires a
///         proven batch. The pass cannot move until all twelve are in: title
///         transfers when the thing is paid off, and not one slice earlier.
///
///         Written from scratch rather than pulled from a library, because a
///         soulbound pass is mostly ERC-721 with the transfer machinery taken
///         out, and inheriting a full implementation just to disable most of
///         it makes the restriction harder to see, not easier.
contract TitlePass {
    string public constant name = "Relia Title Pass";
    string public constant symbol = "RELIA";

    uint8 public constant SLICES = 12;

    address public immutable deployer;
    address public consumer;
    address public registrar;

    mapping(uint256 => address) internal _ownerOf;
    mapping(address => uint256) internal _balanceOf;

    /// @dev Bitmap of ticked slices, bit (n-1) for slice n.
    mapping(uint256 => uint16) internal _slices;

    mapping(uint256 => uint8) internal _sliceCount;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    event Ticked(bytes32 indexed assetId, uint8 indexed n, uint8 slicesFilled);
    event Cleared(bytes32 indexed assetId, address indexed holder);

    error OnlyDeployer();
    error AlreadySet();
    error NotConsumer(address caller);
    error NotRegistrar(address caller);
    error AlreadyMinted(uint256 tokenId);
    error NotMinted(uint256 tokenId);
    error SliceOutOfRange(uint8 n);
    error SliceAlreadyTicked(bytes32 assetId, uint8 n);
    error NonERC721Receiver(address to);

    /// @notice Refusal #9. The pass is soulbound until the twelfth slice is
    ///         proven; only then does it become an asset the holder can move.
    error Soulbound(uint256 tokenId, uint8 slicesFilled);

    constructor() {
        deployer = msg.sender;
    }

    function setConsumer(address consumer_) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (consumer != address(0)) revert AlreadySet();
        consumer = consumer_;
    }

    function setRegistrar(address registrar_) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (registrar != address(0)) revert AlreadySet();
        registrar = registrar_;
    }

    // ------------------------------------------------------------------ mint

    /// @notice Issue the (empty) pass for a listed asset.
    function mint(bytes32 assetId, address buyer) external {
        if (msg.sender != registrar) revert NotRegistrar(msg.sender);
        uint256 tokenId = uint256(assetId);
        if (_ownerOf[tokenId] != address(0)) revert AlreadyMinted(tokenId);

        _ownerOf[tokenId] = buyer;
        _balanceOf[buyer] += 1;

        emit Transfer(address(0), buyer, tokenId);
    }

    /// @notice Fill slice `n`. Only ProofConsumer, only once per slice.
    function tick(bytes32 assetId, uint8 n) external {
        if (msg.sender != consumer) revert NotConsumer(msg.sender);
        if (n == 0 || n > SLICES) revert SliceOutOfRange(n);

        uint256 tokenId = uint256(assetId);
        if (_ownerOf[tokenId] == address(0)) revert NotMinted(tokenId);

        uint16 bit = uint16(1) << (n - 1);
        if (_slices[tokenId] & bit != 0) revert SliceAlreadyTicked(assetId, n);

        _slices[tokenId] |= bit;
        _sliceCount[tokenId] += 1;

        emit Ticked(assetId, n, _sliceCount[tokenId]);

        if (_sliceCount[tokenId] == SLICES) {
            emit Cleared(assetId, _ownerOf[tokenId]);
        }
    }

    // ------------------------------------------------------------- ERC-721-ish

    function ownerOf(uint256 tokenId) public view returns (address owner) {
        owner = _ownerOf[tokenId];
        if (owner == address(0)) revert NotMinted(tokenId);
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balanceOf[owner];
    }

    function slicesFilled(bytes32 assetId) public view returns (uint8) {
        return _sliceCount[uint256(assetId)];
    }

    function isSliceLive(bytes32 assetId, uint8 n) external view returns (bool) {
        if (n == 0 || n > SLICES) revert SliceOutOfRange(n);
        return _slices[uint256(assetId)] & (uint16(1) << (n - 1)) != 0;
    }

    /// @notice A pass is cleared once all twelve slices are proven. Only then
    ///         is it transferable.
    function isCleared(bytes32 assetId) public view returns (bool) {
        return _sliceCount[uint256(assetId)] == SLICES;
    }

    /// @dev Every movement path funnels through here so the soulbound rule
    ///      cannot be reached around.
    function _requireCleared(uint256 tokenId) internal view {
        uint8 filled = _sliceCount[tokenId];
        if (filled != SLICES) revert Soulbound(tokenId, filled);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        _requireCleared(tokenId);

        address owner = ownerOf(tokenId);
        require(owner == from, "wrong from");
        require(to != address(0), "zero to");
        require(
            msg.sender == owner || _approved[tokenId] == msg.sender
                || _operatorApproval[owner][msg.sender],
            "not authorized"
        );

        delete _approved[tokenId];
        _balanceOf[from] -= 1;
        _balanceOf[to] += 1;
        _ownerOf[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
        _requireReceiver(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {
        transferFrom(from, to, tokenId);
        _requireReceiver(from, to, tokenId, data);
    }

    /// @dev ERC-721's actual safety check: a contract recipient must return
    ///      the correct selector from `onERC721Received`, or the transfer is
    ///      rejected. `transferFrom` above already moved the token, so on
    ///      failure this reverts the whole transaction rather than leaving
    ///      the title stuck at a contract that cannot move it again — cleared
    ///      titles are the only ones that can ever be transferred, so a title
    ///      stranded here would have no recovery path.
    function _requireReceiver(address from, address to, uint256 tokenId, bytes memory data) internal {
        if (to.code.length == 0) return;
        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 selector) {
            if (selector != IERC721Receiver.onERC721Received.selector) revert NonERC721Receiver(to);
        } catch {
            revert NonERC721Receiver(to);
        }
    }

    mapping(uint256 => address) internal _approved;
    mapping(address => mapping(address => bool)) internal _operatorApproval;

    /// @dev Approval is a transfer in slow motion, so it is gated identically.
    ///      Allowing approvals on a soulbound pass would let a holder pre-sell
    ///      a title they have not finished paying for.
    function approve(address to, uint256 tokenId) external {
        _requireCleared(tokenId);
        address owner = ownerOf(tokenId);
        require(msg.sender == owner || _operatorApproval[owner][msg.sender], "not authorized");
        _approved[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        return _approved[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApproval[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApproval[owner][operator];
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 // ERC-165
            || interfaceId == 0x80ac58cd // ERC-721
            || interfaceId == 0x5b5e139f; // ERC-721 Metadata
    }

    /// @notice Metadata exposes slices 0..12 so a wallet shows progress, not
    ///         just a token. Rendered on-chain: there is no server to trust.
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        bytes32 assetId = bytes32(tokenId);
        uint8 filled = _sliceCount[tokenId];

        return string.concat(
            "data:application/json;utf8,",
            '{"name":"Relia Title Pass ',
            _toHexString(assetId),
            '","description":"Hire-purchase title. Slice N exists only where a finalized Sepolia payment and the shop\'s acknowledgement were proven together on Creditcoin.","attributes":[',
            '{"trait_type":"Slices","value":',
            _toString(filled),
            ',"max_value":12},',
            '{"trait_type":"Status","value":"',
            isCleared(assetId) ? "Cleared" : "In progress",
            '"},{"trait_type":"Soulbound","value":"',
            isCleared(assetId) ? "No" : "Yes",
            '"}]}'
        );
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 len;
        for (uint256 t = v; t != 0; t /= 10) {
            len++;
        }
        bytes memory buf = new bytes(len);
        for (uint256 i = len; i > 0; i--) {
            // Intentional: takes the low decimal digit.
            // forge-lint: disable-next-line(unsafe-typecast)
            buf[i - 1] = bytes1(uint8(48 + (v % 10)));
            v /= 10;
        }
        return string(buf);
    }

    function _toHexString(bytes32 value) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory buf = new bytes(66);
        buf[0] = "0";
        buf[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            buf[2 + i * 2] = hexChars[uint8(value[i]) >> 4];
            buf[3 + i * 2] = hexChars[uint8(value[i]) & 0x0f];
        }
        return string(buf);
    }
}
