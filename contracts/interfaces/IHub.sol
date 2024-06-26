// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "../libraries/DataTypes.sol";

interface IHub {
    
    //--- Functions

    /// Arbitrary contract symbol
    function symbol() external view returns (string memory);
    
    /// Arbitrary contract designation signature
    function role() external view returns (string memory);
    
    /// Get Owner
    function owner() external view returns (address);

    //Repo Address
    function getRepoAddr() external view returns (address);

    /// Mint an SBT for another account
    function mintForAccount(address account, string memory tokenURI) external returns (uint256);

    /// Register a new upgradable beacon
    function beaconAdd(string memory name, address implementation) external;

    /// Make a new ERC721Tracker
    function makeERC721(string calldata name_, string memory symbol_, string calldata uri_) external returns (address);

    /// Make a new ERC1155Tracker
    function makeERC1155(string calldata uri_) external returns (address);

    /// Make a new Game
    function makeGame(
        string calldata type_,
        string calldata name_, 
        string calldata uri_
    ) external returns (address);

    /// Make a new Claim
    function makeClaim(
        string calldata type_, 
        string calldata name_, 
        string calldata uri_
    ) external returns (address);

    /// Make a new Task
    function makeTask(
        string calldata type_, 
        string calldata name_, 
        string calldata uri_
    ) external returns (address);
    
    /// Update Hub
    function hubChange(address newHubAddr) external;

    /// Add Reputation (Positive or Negative)       /// Opinion Updated
    // function repAdd(address contractAddr, uint256 tokenId, string calldata domain, bool rating, uint8 amount) external;

    //Get Contract Association
    function assocGet(string memory key) external view returns (address);
    
    //--- Events

    /// Beacon Contract Chnaged
    event UpdatedImplementation(string name, address implementation);

    /// New Contract Created
    event ContractCreated(string name, address indexed contractAddress);

    /// New Contract Created
    event HubChanged(address contractAddress);

}
