//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
// import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";  //Track Token Supply & Check 
import "@openzeppelin/contracts/utils/Counters.sol";


// import {DataTypes} from './libraries/DataTypes.sol';
import "./interfaces/IJurisdiction.sol";
import "./libraries/DataTypes.sol";
import "./abstract/Rules.sol";
import "./abstract/CommonYJ.sol";

import "./Case.sol";


/**
 * Jurisdiction Contract
 * V1: Role NFTs
 * V2:  
 * - Mints Member NFTs
 * - [TODO] Rules...
 * - [TODO] Deploys Cases
 */
contract Jurisdiction is IJurisdiction, Rules, CommonYJ, ERC1155 {
    /*** STORAGE ***/

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds; //Track Last Token ID

    mapping(string => uint256) private _roles;     //NFTs as Roles

    // mapping(uint256 => address) private _cases;      // Mapping for Case Contracts

    // mapping(uint256 => string) private _rulesURI;      // Mapping for Rule/Tile URIs

    /*** MODIFIERS ***/

    modifier roleExists(string calldata role) {
        require(_roleExists(role), "INEXISTENT_ROLE");
        _;
    }

    /*** FUNCTIONS ***/

    // constructor(address hub) CommonYJ(hub) ERC1155(string memory uri_){
    constructor(address hub) CommonYJ(hub) ERC1155(""){
        //Set Default Roles
        // _roles["admin"] = 1;
        // _roles["member"] = 2;
        // _roles["judge"] = 3;
        _roleCreate("admin");
        _roleCreate("member");
        _roleCreate("judge");
    }

    //-- Case Functions



    //-- Role Functions

    /* [TBD] - would need to track role IDs
    /// Create a new Role
    function roleCreate(string calldata role) public {
        require(!_roleExists(role), "ROLE_EXISTS");
        _roleCreate(role);
    }
    */

    /// Create New Role
    function _roleCreate(string memory role) internal {
        // require(!_roleExists(role), "ROLE_EXISTS");
        require(_roles[role] != 0, "ROLE_EXISTS");
        //Assign Token ID
        _tokenIds.increment(); //Start with 1
        uint256 tokenId = _tokenIds.current();
        //Map Role to Token ID
        _roles[role] = tokenId;
    }

    /// Join a role in current jurisdiction
    function join() external {
        //Member Token ID
        uint256 tokenId = _roles["member"];
        //Mint Role Token
        _mint(_msgSender(), tokenId, 1, "");
    }

    /// Leave Role in current jurisdiction
    function leave() external {
        //Member Token ID
        uint256 tokenId = _roles["member"];
        //Burn
        _burn(_msgSender(), tokenId, 1);
    }
    
    /// Assign Someone Else to a Role
    function roleAssign(address account, string calldata role) external roleExists(role) {
        //Validate Permissions
        require(
            _msgSender() == account         //Self
            || owner() == _msgSender()      //Owner
            || balanceOf(_msgSender(), _roles["admin"]) > 0     //Admin Token
            , "INVALID_PERMISSIONS");
        //Add
        _roleAssign(account, role);
    }

    /// Remove Someone Else from a Role
    function roleRemove(address account, string calldata role) external roleExists(role) {
        //Validate Permissions
        require(
            _msgSender() == account         //Self
            || owner() == _msgSender()      //Owner
            || balanceOf(_msgSender(), _roles["admin"]) > 0     //Admin Token
            , "INVALID_PERMISSIONS");
        //Remove
        _roleRemove(account, role);
    }

    /// Check if Role Exists
    function _roleExists(string calldata role) internal view returns (bool) {
        return (_roles[role] != 0);
    }
    
    /// Assign a role in current jurisdiction
    function _roleAssign(address account, string calldata role) internal roleExists(role) {
        uint256 tokenId = _roles[role];
        //Mint Role Token
        _mint(account, tokenId, 1, "");
    }
    
    /// Unassign a Role in current jurisdiction
    function _roleRemove(address account, string calldata role) internal roleExists(role) {
        uint256 tokenId = _roles[role];
        //Validate
        require(balanceOf(account, tokenId) > 0, "NOT_IN_ROLE");
        //Burn Role Token
        _burn(account, tokenId, 1);
    }

  /**
   * @dev Hook that is called before any token transfer. This includes minting and burning, as well as batched variants.
   *  - Max of Single Token for each account
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override {
    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    if (to != address(0)) {
      for (uint256 i = 0; i < ids.length; ++i) {
        uint256 id = ids[i];
        uint256 amount = amounts[i];
        //Validate - Max of 1 Per Account
        require(balanceOf(_msgSender(), id) == 0, "ALREADY_ASSIGNED_TO_ROLE");
        require(amount == 1, "ONE_TOKEN_MAX");
      }
    }
  }

    /// Get Token URI
    // function tokenURI(uint256 token_id) public view returns (string memory) {
    //     require(exists(token_id), "NONEXISTENT_TOKEN");
    //     return _tokenURIs[token_id];
    // }

}