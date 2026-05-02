// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

// import "hardhat/console.sol";

// import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "./interfaces/IERC1155RolesTracker.sol";
import "./interfaces/ISoul.sol";
import "./libraries/Utils.sol";
import "./abstract/ProtocolEntityUpgradable.sol";
import "./abstract/Opinions.sol";
import "./abstract/SoulBonds.sol";

/**
 * @title Soulbound NFT Identity Tokens w/Reputation Tracking
 * @dev Version 2.4
 *  - Contract is open for everyone to mint.
 *  - Max of one NFT assigned for each account
 *  - Owner can mint tokens for other entities
 *  - Lost-souls: Owner can create un-assigned SBTs (owned by this contract and managed by the owner)
 *  - Minted Token's URI is updatable by Token holder
 *  - Assets are non-transferable by owner
 *  - Tokens can have multiple owners
 *  - Soul handles (string that points to the token)
 *  - [TODO] Lost-souls can be claimed/linked
 *  - [TODO] Merge Souls
 */
// Initializable,
contract SoulUpgradable is 
  ProtocolEntityUpgradable, 
  ISoul, 
  UUPSUpgradeable, 
  Opinions, 
  SoulBonds, 
  ERC721URIStorageUpgradeable 
  {
    //--- Storage

    using AddressUpgradeable for address;

    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _tokenIds;

    mapping(address => uint256) private _owners_rev; //Map Multiple Accounts to Tokens
    mapping(uint256 => string) public types; //Soul Types
    mapping(uint256 => address) private _link; //[TBD] Linked Souls
    mapping(bytes32 => uint256) private _handle; //Soul Handles to Tokens
    mapping(uint256 => string) private _handleToken; //Soul Tokens to Handles

    //--- Modifiers

    //--- Functions

    /// Initializer
    function initialize(address hub) public initializer {
        //Initializers
        __ERC721_init("Soulbound Identity", "SBT");
        __ERC721URIStorage_init();
        __UUPSUpgradeable_init();
        __ProtocolEntity_init(hub);
    }

    /// Upgrade Permissions
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// ERC165 - Supported Interfaces
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(ISoul).interfaceId ||
            interfaceId == type(ISoulBonds).interfaceId ||
            interfaceId == type(IERC721Upgradeable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /// Get the SBT ID of the current user (msg.sender)
    function _getCurrentSBT() internal view override(Opinions, SoulBonds) returns (uint256) {
        return tokenByAddress(_msgSender());
    }

    //** Token Owner Index **/

    /// Map Account to Existing Token
    function tokenOwnerAdd(address owner, uint256 tokenId) external override onlyOwner {
        _tokenOwnerAdd(owner, tokenId);
    }

    /// Remove Account from Existing Token
    function tokenOwnerRemove(address owner, uint256 tokenId) external override onlyOwner {
        _tokenOwnerRemove(owner, tokenId);
    }

    /// Get Token ID by Address
    function tokenByAddress(address owner) public view override returns (uint256) {
        return _owners_rev[owner];
    }

    /// Return Token URI by Address
    function accountURI(address account) external view override returns (string memory) {
        return tokenURI(tokenByAddress(account));
    }

    /**
     * @dev See {IERC721-balanceOf}.
     */
    function balanceOf(address owner) public view override returns (uint256) {
        require(owner != address(0), "ERC721: balance query for the zero address");
        return (_owners_rev[owner] != 0) ? 1 : 0;
        // if(_owners_rev[owner] != 0) return 1;
        // return super.balanceOf(owner);
    }

    /// Add a secondary owner for token
    function addSecondaryOwner(address tokenOwner, uint256 tokenId) external {
        // require(_msgSender() == owner(), "Only Owner");
        //Validate Token Owner 
        require(hasTokenControl(tokenId) 
            || _isContractOwner(tokenId)
            || _msgSender() == owner(), "TOKEN_OWNER_ONLY");
        //Add
        _tokenOwnerAdd(tokenOwner, tokenId);
    }

    /// Map Account to Existing Token (Alias / Secondary Account)
    function _tokenOwnerAdd(address tokenOwner, uint256 tokenId) internal {
        require(_exists(tokenId), "nonexistent token");
        require(_owners_rev[tokenOwner] == 0, "Account already mapped to token");
        _owners_rev[tokenOwner] = tokenId;
        //Faux Transfer Event (Mint)
        emit Transfer(address(0), tokenOwner, tokenId);
    }

    /// Map Account to Existing Token (Alias / Secondary Account)
    function _tokenOwnerRemove(address owner, uint256 tokenId) internal {
        require(_exists(tokenId), "nonexistent token");
        require(_owners_rev[owner] == tokenId, "Account is not mapped to this token");
        //Not Main Account
        require(owner != ownerOf(tokenId), "Account is main token's owner. Use burn()");
        //Remove Association
        _owners_rev[owner] = 0;
        //Faux Transfer Event (Burn)
        emit Transfer(owner, address(0), tokenId);
    }

    //** Reputation **/

    /// Add Reputation (about another SBT on the same contract)
    function opinionAboutSoul(
        uint256 tokenId,
        string calldata domain,
        int256 score
    ) external override {
        //Validate - Only By Hub
        // require(_msgSender() == address(_HUB), "Soul:UNAUTHORIZED_ACCESS");
        //Not by hub - directly by opinion owner
        require(_msgSender() != address(_HUB), "Soul:UNAUTHORIZED_ACCESS");
        _opinionChange(address(this), tokenId, domain, score);
    }

    /// Add Reputation (Positive or Negative)
    function opinionAboutToken(
        address contractAddr,
        uint256 tokenId,
        string calldata domain,
        int256 score
    ) external override {
        //Not by hub - directly by opinion owner
        require(_msgSender() != address(_HUB), "Soul:UNAUTHORIZED_ACCESS");
        _opinionChange(contractAddr, tokenId, domain, score);
    }

    //** Token Actions **/

    /// Mint (Create New Token for Someone Else)
    function mintFor(address to, string memory tokenURI) public override returns (uint256) {
        //Require Additional Privileges To Set URI
        if (!Utils.stringMatch(tokenURI, "")) {
            //Validate - Contract Owner
            require(_msgSender() == owner() || _msgSender() == address(_HUB), "Only Owner or Hub");
        }
        //Mint
        uint256 sbt = _mint(to, tokenURI);
        if(_msgSender() == address(_HUB)){
            //Relate to Creating Account (Hub)
            relateToCretor(sbt);
        }
        return sbt;
    }
    
    /// Relate an entity to current account (creator)
    function relateToCretor(uint256 sbt) private {
        uint256 hubSBT = tokenByAddress(_msgSender());
        //Mint SBT for Hub
        if(hubSBT == 0) hubSBT = _mint(_msgSender(), "");
        //Relate to  Hub
        _relSetOf(sbt, "hub", hubSBT);
    }

    /// Mint (Create New Token for oneself)
    function mint(string memory tokenURI) external override returns (uint256) {
        return _mint(_msgSender(), tokenURI);
    }

    /// Burn NFTs
    function burn(uint256 tokenId) external onlyOwner {
        //Validate - Contract Owner
        // require(_msgSender() == owner(), "Only Owner");
        //Burn Token
        _burn(tokenId);
        //Clear Handle
        _handleSet(tokenId, "");
    }

    /// Update Token's Metadata
    function update(uint256 tokenId, string memory uri) external override returns (uint256) {
        //Validate Owner of Token
        // require(_isApprovedOrOwner(_msgSender(), tokenId) || _msgSender() == owner(), "caller is not owner or approved");
        require(hasTokenControlAccount(tokenId, _msgSender()) || _msgSender() == owner(), "caller does not control token");
        _setTokenURI(tokenId, uri); //This Goes for Specific Metadata Set (IPFS and Such)
        //Emit URI Changed Event
        emit URI(uri, tokenId);
        //Done
        return tokenId;
    }

    /// Create a new Token
    function _mint(address to, string memory uri) internal returns (uint256) {
        //One Per Account
        require(to == address(this) || balanceOf(to) == 0, "Account already has a token");
        //Mint
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(to, newItemId);
        //Set URI
        _setTokenURI(newItemId, uri); //This Goes for Specific Metadata Set (IPFS and Such)
        //Emit URI Changed Event
        emit URI(uri, newItemId);
        //Done
        return newItemId;
    }

    /// Token Transfer Rules
    /// TODO: Consider Implementing Support For Multiple Tokens
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        //Non-Transferable (by client)
        require(
            _msgSender() == owner() || //Contract Owner
            _msgSender() == address(_HUB) || //Hub
            from == address(0), //Minting
            "SOUL:NON_TRANSFERABLE"
        );

        //Update Address Index
        if (from != address(0)) _owners_rev[from] = 0;
        if (to != address(0) && to != address(this)) {
            require(_owners_rev[to] == 0, "Receiving address already owns a token");
            _owners_rev[to] = tokenId;
        }
    }

    /// Hook - After Token Transfer
    /// TODO: Consider Implementing Support For Multiple Tokens
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
         super._afterTokenTransfer(from, to, tokenId, batchSize);
        //Soul Type (Contract Symbol)
        string memory soulType = Utils.getAddressType(to);
        //Set
        types[tokenId] = soulType;
        //Emit Soul Type as Event
        emit SoulType(tokenId, soulType);
    }

    /// Override transferFrom()
    /// @dev Removed Approval Check. Transfer Privileges are manged in the _beforeTokenTransfer function
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        _transfer(from, to, tokenId);
    }

    /// Transfer Privileges are manged in the _beforeTokenTransfer function
    /// @dev Override the main Transfer privileges function
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view override returns (bool) {
        // Token Owner or Approved, or Secondary Owner
        return (
            super._isApprovedOrOwner(spender, tokenId) 
            || _owners_rev[spender] == tokenId
            || _isContractOwner(tokenId)
        ); 
    }

    /// Check if the Current Account has Control over a Token   //DEPRECATE?
    function hasTokenControl(uint256 tokenId) public view override returns (bool) {
        return hasTokenControlAccount(tokenId, _msgSender());
    }

    /**
     * Check if a Specific Account has control over a Token
     * - owner or approved, or secondary owner
     * - unowned token controlled by contract owner
     * - owner of the owner contract
     * ! admin role the owner (Game) entity
     */
    function hasTokenControlAccount(uint256 tokenId, address account) public view override returns (bool) {
        return (_isApprovedOrOwner(account, tokenId) || // Token Owner or Approved
            // ownerAccount == account //Token Owner (Support for Contract as Owner)
            (ownerOf(tokenId) == address(this) && owner() == account) || //Unclaimed Tokens Controlled by Contract Owner Contract (DAO)
            _isContractOwner(tokenId)); //Owner of the owner contract
    }

    /// Check if sender is the Owner of the Owner Contract
    function _isContractOwner(uint256 tokenId) internal view returns (bool) {
        address ownerAccount = ownerOf(tokenId);
        if (ownerAccount.isContract()) {
            //Check if Contract Owner
            try OwnableUpgradeable(ownerAccount).owner() //Failure should not be fatal
            returns (address contractOwner) {
                return (contractOwner == _msgSender());
            } catch Error(string memory) {}
            /* Pondering...
            //Check if Game Admin
            try IERC1155RolesTracker(ownerAccount).roleHas(_msgSender(), "admin") 
            returns (bool result) {
                if(result) return true;
            } catch Error(string memory) {}
            */
        }
        //Default to No
        return false;
    }

    /// Post
    /// @param tokenId  Acting SBT Token ID (Posting as)
    /// @param uri_     Post data URI
    /// @param context  Posting about
    function announcement(
        uint256 tokenId,
        string calldata uri_,
        string calldata context
    ) external override {
        //Validate that User Controls The Token
        require(hasTokenControl(tokenId), "POST:SOUL_NOT_YOURS");
        //Post Event
        emit Announcement(_msgSender(), tokenId, uri_, context);
    }

    //** Token Handle **/

    /// Set handle for token
    function handleSet(uint256 tokenId, string calldata handle) external override {
        //Validate: token control
        require(hasTokenControl(tokenId), "SOUL_NOT_YOURS");
        //Validate: no handle assigned yet
        // require(Utils.stringMatch(handleGet(tokenId), ""), "SINGLE_HANDLE_ONLY");
        //Validate: handle available
        require(handleFind(handle) == 0, "HANDLE_TAKEN");
        //Set Handle
        _handleSet(tokenId, handle);
        //Event
        emit SoulHandle(tokenId, handle);
    }

    /// Get handle by tokenId
    function handleGet(uint256 tokenId) public view override returns (string memory) {
        return _handleToken[tokenId];
    }

    /// Find tokenId by handle
    function handleFind(string calldata handle) public view override returns (uint256) {
        // return _handle[Utils.stringToBytes32(handle)];
        return _handle[keccak256(bytes(handle))];
    }

    /// Set Handle
    function _handleSet(uint256 tokenId, string memory handle) internal {
        //Current Handle
        string memory curHandle = handleGet(tokenId);
        if (!Utils.stringMatch(curHandle, "")) {
            //Unset Current Handle
            _handle[keccak256(bytes(curHandle))] = 0;
        }
        //New Handle
        if (!Utils.stringMatch(handle, "")) {
            //Set
            _handle[keccak256(bytes(handle))] = tokenId;
        }
        _handleToken[tokenId] = handle;
    }

    //--- [DEV]

    /// Merge tokens
    // function _merge(uint256 tokenId, uint256[] memory tokenIds) internal {
    function _merge(uint256 tokenIdKeep, uint256 tokenIdLose) internal {}

    /// [WIP] Set Main Owner Account
    // function setMain(uint256 tokenId, address account) external {
    //Check if account is a secondary
    // require(_owners_rev[account] == tokenId, "Requested account is not mapped to this token");
    //Transfer token to secondary account
    //Change secondary mapping
    // }
}
