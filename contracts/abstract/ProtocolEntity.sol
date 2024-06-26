//SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

// import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IProtocolEntity.sol";
import "../interfaces/IHub.sol";
import "../interfaces/ISoul.sol";
import "../repositories/interfaces/IOpenRepo.sol";
import "../libraries/DataTypes.sol";
// import "../abstract/ContractBase.sol";
import "../libraries/Utils.sol";

/**
 * Common Protocol Functions
 */
abstract contract ProtocolEntity is IProtocolEntity, 
        // ContractBase, 
        Ownable {
    
    //--- Storage

    // address internal _HUB;    //Hub Contract
    IHub internal _HUB;    //Hub Contract
    

    //--- Functions

    constructor(address hub) {
        //Set Protocol's Hub Address
        _setHub(hub);
    }

    /// Contract URI
    function contractURI() public view override returns (string memory) {
         //Run function on destination contract
        return ISoul(getSoulAddr()).accountURI(address(this));
    }

    /// Inherit owner from Protocol's Hub
    function owner() public view override (IProtocolEntity, Ownable) returns (address) {
        return _HUB.owner();
    }

    /// Get Current Hub Contract Address
    function getHub() external view override returns (address) {
        return _getHub();
    }

    /// Get Hub Contract
    function _getHub() internal view returns (address) {
        return address(_HUB);
    }

    /// Change Hub (Move To a New Hub)
    function setHub(address hubAddr) external override {
        require(_msgSender() == address(_HUB), "HUB:UNAUTHORIZED_CALLER");
        _setHub(hubAddr);
    }

    /// Set Hub Contract
    function _setHub(address hubAddr) internal {
        //Validate Contract's Designation
        require(Utils.stringMatch(IHub(hubAddr).role(), "Hub"), "Invalid Hub Contract");
        //Set
        _HUB = IHub(hubAddr);
    }

    //** Data Repository 
    
    //Get Data Repo Address (From Hub)
    function getRepoAddr() public view override returns (address) {
        return _HUB.getRepoAddr();
    }

    //Get Assoc Repo
    function dataRepo() internal view returns (IOpenRepo) {
        return IOpenRepo(getRepoAddr());
    }

    /// Get Soul Contract Address
    function getSoulAddr() internal view returns (address) {
        return dataRepo().addressGetOf(address(_HUB), "SBT");
    }

    /// Generic Config Get Function
    // function confGet(string memory key) public view override returns (string memory) {
    //     return dataRepo().stringGet(key);
    // }

    /// Generic Config Set Function
    function _confSet(string memory key, string memory value) internal {
        dataRepo().stringSet(key, value);
    }

}
