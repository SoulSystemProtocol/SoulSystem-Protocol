//SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

// import "hardhat/console.sol";

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "./interfaces/IGameUp.sol";
import "./interfaces/IRules.sol";
import "./interfaces/IClaim.sol";
import "./interfaces/IActionRepo.sol";
import "./interfaces/ICTXEntityUpgradable.sol";
import "./abstract/CTXEntityUpgradable.sol";
import "./abstract/ERC1155RolesTrackerUp.sol";
import "./abstract/Posts.sol";
import "./abstract/ProxyMulti.sol"; //Adds 1.529Kb
import "./interfaces/IRulesRepo.sol";
import "./repositories/interfaces/IVotesRepoTracker.sol";

/**
 * @title Game Contract
 * @dev Retains Group Members in Roles
 * @dev Version 4.0
 * V1: Using Role NFTs
 * - Mints Member NFTs
 * - One for each
 * - All members are the same
 * - Rules
 * - Creates new Claims
 * - Contract URI
 * - Token URIs for Roles
 * - Owner account must have an Avatar NFT
 * V2: Trackers
 * - NFT Trackers - Assign Avatars instead of Accounts & Track the owner of the Avatar NFT
 * V3:
 * - Multi-Proxy Pattern
 * V4:
 * - DAO Votes
 * - [TODO] Unique Rule IDs (GUID)
 */
contract GameUpgradable is IGame
        , Posts
        , ProxyMulti
        , CTXEntityUpgradable
        {

    //--- Storage
    string public constant override symbol = "GAME";
    using Strings for uint256;

    using CountersUpgradeable for CountersUpgradeable.Counter;
    // CountersUpgradeable.Counter internal _tokenIds; //Track Last Token ID
    CountersUpgradeable.Counter internal _claimIds;  //Track Last Claim ID
    
    // Contract name
    string public name;
    // Mapping for Claim Contracts
    mapping(address => bool) internal _active;

    //--- Modifiers

    //--- Functions

    /** For VotesUpgradeable
     * @dev Returns the balance of `account`.
     * /
    function _getVotingUnits(address account) internal view virtual override returns (uint256) {
        return balanceOf(account, roleToId("member"));
    }
    */

    /// ERC165 - Supported Interfaces
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IGame).interfaceId 
            || interfaceId == type(IRules).interfaceId 
            || super.supportsInterface(interfaceId);
    }

    /// Initializer
    function initialize (string calldata name_) public override initializer {
        //Initializers
        __ProtocolEntity_init(msg.sender);
        _setTargetContract(dataRepo().addressGetOf(address(_HUB), "SBT"));
        //Identifiers
        name = name_;
        //Init Default Game Roles
        _roleCreate("admin");
        _roleCreate("member");
        _roleCreate("authority");
        //Default Token URIs
        // _setRoleURI("admin", "");
        // _setRoleURI("member", "");
        // _setRoleURI("authority", "");
    }

    //** Claim Functions

    /// Register an Incident (happening of a valued action)
    function reportEvent(
        uint256 ruleId, 
        address account,
        string calldata detailsURI
    ) external override {
        //Validate Role
        require(roleHas(_msgSender(), "authority") , "ROLE:AUTHORITY_ONLY");
        //Fetch SBT Token
        uint256 sbToken = _getExtTokenId(account);
        //Mint SBT for that Account if doesn't exist
        if(sbToken == 0) _HUB.mintForAccount(account, "");
        emit EventConfirmed(ruleId, detailsURI);
        //Execute Effects on that SBT
        _effectsExecute(ruleId, getSoulAddr(), sbToken);
    }

    /// Execute Rule's Effects (By Claim Contreact)
    function onClaimConfirmed(
        uint256 ruleId, 
        address targetContract, 
        uint256 targetTokenId
    ) external override {
        //Validate - Called by Child Claim
        require(claimHas(msg.sender), "INVALID CLAIM");
        emit EventConfirmed(ruleId, "");
        _effectsExecute(ruleId, targetContract, targetTokenId);
    }

    /// Execute Rule's Effects
    function _effectsExecute(
        uint256 ruleId, 
        address targetContract, 
        uint256 targetTokenId
    ) internal {
        //Fetch Rule's Effects
        // DataTypes.RepChange[] memory effects = effectsGet(ruleId);
        DataTypes.RepChange[] memory effects = effectsGet(ruleId);
        //Run Each Effect
        for (uint256 j = 0; j < effects.length; ++j) {
            // DataTypes.RepChange memory effect = effects[j];
            DataTypes.RepChange memory effect = effects[j];
            
            //Register Rep in Game      //{name:'professional', value:5, direction:false}
            // _repAdd(targetContract, targetTokenId, effect.name, effect.direction, effect.value);
            //Update Hub    //DEPRECATED
            // _HUB.repAdd(targetContract, targetTokenId, effect.name, effect.direction, effect.value);

            //Update Soul's Opinion (Reputation)
            try ISoul(getSoulAddr()).opinionAboutToken(targetContract, targetTokenId, effect.domain, effect.value) {}   //Failure should not be fatal
            // try ISoul(getSoulAddr()).opinionAboutSoul(targetTokenId, effect.domain, effect.value) {}   //Failure should not be fatal
            catch Error(string memory) {}
        }
        //
        emit EffectsExecuted(targetTokenId, ruleId, "");
    }

    /// Disable (Disown) Claim
    function claimDisable(address claimContract) public override onlyOwner {
        //Validate
        require(claimHas(claimContract), "Claim Not Active");
        dataRepo().addressRemove("claim", claimContract);
    }

    /// Check if Claim is Owned by This Contract (& Active)
    function claimHas(address claimContract) public view override returns (bool) {
        return dataRepo().addressHas("claim", claimContract);
    }

    /// Add Post 
    /// @param entRole  posting as entitiy in role (posting entity must be assigned to role)
    /// @param tokenId  Acting SBT Token ID
    /// @param uri_     post URI
    function post(string calldata entRole, uint256 tokenId, string calldata uri_) external override {
        //Validate that User Controls The Token
        require(ISoul(getSoulAddr()).hasTokenControlAccount(tokenId, _msgSender())
            || ISoul(getSoulAddr()).hasTokenControlAccount(tokenId, tx.origin)
            , "POST:SOUL_NOT_YOURS"); //Supports Contract Permissions
        //Validate: Soul Assigned to the Role 
        require(roleHasByToken(tokenId, entRole), "POST:SOUL_NOT_IN_ROLE");    //Validate the Calling Account
        // require(roleHasByToken(tokenId, entRole), string(abi.encodePacked("TOKEN: ", tokenId, " NOT_ASSIGNED_AS: ", entRole)) );    //Validate the Calling Account
        //Post Event
        _post(tx.origin, tokenId, entRole, uri_);
    }

    //** Multi Proxy

    /// Proxy Fallback Implementations
    function _implementations() internal view virtual override returns (address[] memory) {
        address[] memory implementationAddresses;
        string memory gameType = confGet("type");
        // console.log("[DEBUG] Find Implementations For", gameType);
        if(Utils.stringMatch(gameType, "")) return implementationAddresses;
        // require (!Utils.stringMatch(gameType, ""), "NO_GAME_TYPE");
        //UID
        string memory gameTypeFull = string(abi.encodePacked("GAME_", gameType));
        //Fetch Implementations
        implementationAddresses = dataRepo().addressGetAllOf(address(_HUB), gameTypeFull); //Specific
        require(implementationAddresses.length > 0, "NO_FALLBACK_CONTRACTS");
        return implementationAddresses;
    }

    /* Support for Global Extension
    /// Proxy Fallback Implementations
    function _implementations() internal view virtual override returns (address[] memory) {
        //UID
        string memory gameType = string(abi.encodePacked("GAME_", confGet("type")));
        //Fetch Implementations
        address[] memory implementationAddresses = dataRepo().addressGetAllOf(address(_HUB), gameType); //Specific
        address[] memory implementationAddressesAll = dataRepo().addressGetAllOf(address(_HUB), "GAME_ALL"); //General
        return arrayConcat(implementationAddressesAll, implementationAddresses);
    }
    
    /// Concatenate Arrays (A Suboptimal Solution -- ~800Bytes)      //TODO: Maybe move to an external library?
    function arrayConcat(address[] memory Accounts, address[] memory Accounts2) private pure returns (address[] memory) {
        //Create a new container array
        address[] memory returnArr = new address[](Accounts.length + Accounts2.length);
        uint i=0;
        if(Accounts.length > 0) {
            for (; i < Accounts.length; i++) {
                returnArr[i] = Accounts[i];
            }
        }
        uint j=0;
        if(Accounts2.length > 0) {
            while (j < Accounts.length) {
                returnArr[i++] = Accounts2[j++];
            }
        }
        return returnArr;
    } 
    */

    //** Role Management

    /// Join a game (as a regular 'member')
    function join() external override returns (uint256) {
        require (!Utils.stringMatch(confGet("isClosed"), "true"), "CLOSED_SPACE");
        //Mint Member Token to Self
        return _GUIDAssign(_msgSender(), _stringToBytes32("member"), 1);
    }

    /// Leave 'member' Role in game
    function leave() external override returns (uint256) {
        return _GUIDRemove(_msgSender(), _stringToBytes32("member"), 1);
    }

    function _relationURISet() internal {
        // require(roleHas(_msgSender(), "admin"), "Admin Only");
        // _ruleRepo().ruleUpdateURI(ruleId, uri);

        // dataRepo().addressGetOf(address(_HUB), "SBT")
        
    }
        
    /// [WIP]
    // function relationURI() external view override returns (uint256) {
        
    // }


    /// Request to Join
    // function nominate(uint256 soulToken, string memory uri_) external override {
    //     emit Nominate(_msgSender(), soulToken, uri_);
    // }

    /** TODO: DEPRECATED - Allow Uneven Role Distribution 
    * @dev Hook that is called before any token transfer. This includes minting and burning, as well as batched variants.
    *  - Max of Single Token for each account
    
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        // if (to != address(0) && to != _targetContract) { //Not Burn
        if (_isOwnerAddress(to)) { //Not Burn
            for (uint256 i = 0; i < ids.length; ++i) {
                //Validate - Max of 1 Per Account
                uint256 id = ids[i];
                require(balanceOf(to, id) == 0, "ALREADY_ASSIGNED_TO_ROLE");
                uint256 amount = amounts[i];
                require(amount == 1, "ONE_TOKEN_MAX");
            }
        }
    }
    */

    /// Hook:Track Voting Power
    function _afterTokenTransferTracker(
        address operator,
        uint256 fromToken,
        uint256 toToken,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._afterTokenTransferTracker(operator, fromToken, toToken, ids, amounts, data);
        _trackVotePower(fromToken, toToken, ids, amounts);
    }

    /// Hook:Track Voting Power
    /// @dev VoteRepot -- Track Voting Power by SBT
    function _trackVotePower(
        uint256 fromToken,
        uint256 toToken,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal {
        address votesRepoAddr_ = dataRepo().addressGetOf(address(_HUB), "VOTES_REPO");
        // address votesRepoAddr_ = votesRepoAddr();
        if(votesRepoAddr_ != address(0)) {
            for (uint256 i = 0; i < ids.length; ++i) {
                //Only "member" tokens give voting rights
                if(roleExist("member") && roleToId("member") == ids[i]) {
                    // uint256 id = ids[i];
                    uint256 amount = amounts[i];
                    //Votes Changes
                    IVotesRepoTracker(votesRepoAddr_).transferVotingUnits(fromToken, toToken, amount);
                }
            }
        }
        // else{ console.log("No Votes Repo Configured", votesRepoAddr_); }
    }

    //** Rule Management    //Maybe Offload to a GameExtension
    
    //Get Rules Repo
    function _ruleRepo() internal view returns (IRulesRepo) {
        address ruleRepoAddr = dataRepo().addressGetOf(address(_HUB), "RULE_REPO");
        return IRulesRepo(ruleRepoAddr);
    }

    //-- Getters

    /// Get Rule
    function ruleGet(uint256 ruleId) public view returns (DataTypes.Rule memory) {
        return _ruleRepo().ruleGet(ruleId);
    }

    /// Get Rule's Conditions
    function conditionsGet(uint256 ruleId) public view returns (DataTypes.Condition[] memory) {
        return _ruleRepo().conditionsGet(ruleId);
    }

    /// Get Rule's Effects
    function effectsGet(uint256 ruleId) public view returns (DataTypes.RepChange[] memory) {
        return _ruleRepo().effectsGet(ruleId);
    }

    /// Get Rule's Confirmation Method
    function confirmationGet(uint256 id) public view returns (DataTypes.Confirmation memory) {
        return _ruleRepo().confirmationGet(id);
    }

    //-- Setters

    /// Create New Rule
    function ruleAdd(
        DataTypes.Rule memory rule, 
        DataTypes.RepChange[] memory effects,
        DataTypes.Confirmation memory confirmation
    ) public returns (uint256) {
        require(roleHas(_msgSender(), "admin"), "Admin Only");
        return _ruleRepo().ruleAdd(rule, effects, confirmation);
    }

    /// Update Rule URI     //TODO!!! Change to Yoda Naming Conventions (General->Specific)
    function ruleUpdateURI(
        uint256 ruleId, 
        string calldata uri
    ) external {
        require(roleHas(_msgSender(), "admin"), "Admin Only");
        _ruleRepo().ruleUpdateURI(ruleId, uri);
    }

    /// Update Rule Effects
    function ruleUpdateEffects(
        uint256 ruleId, 
        DataTypes.RepChange[] memory effects
    ) external {
        require(roleHas(_msgSender(), "admin"), "Admin Only");
        _ruleRepo().ruleEffectsUpdate(ruleId, effects);
    }

    /// Update Rule Conditions
    function ruleUpdateConditions(
        uint256 ruleId, 
        DataTypes.Condition[] memory conditions
    ) external {
        require(roleHas(_msgSender(), "admin"), "Admin Only");
        _ruleRepo().ruleUpdateConditions(ruleId, conditions);
    }
    
    /// Update Rule's Confirmation Method
    function ruleUpdateConfirmation(uint256 id, DataTypes.Confirmation memory confirmation) external {
        require(roleHas(_msgSender(), "admin"), "Admin Only");
        _ruleRepo().ruleUpdateConfirmation(id, confirmation);
    }
    
    /// Set Disable Status for Rule
    function ruleDisable(uint256 id, bool disabled) external {
        require(roleHas(_msgSender(), "admin"), "Admin Only");
        _ruleRepo().ruleDisable(id, disabled);
    }

}