//SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

// import "hardhat/console.sol";

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IOpenRepo.sol";
import "../abstract/ContractBase.sol";
import "../libraries/AddressArray.sol";
import "../libraries/BoolArray.sol";
import "../libraries/UintArray.sol";
import "../libraries/StringArray.sol";


/**
 * @title Generic Data Repository
 * @dev Retains Data for Other Contracts
 * Version 2.3.1
 * - Save & Return Associations
 * - Owned by Requesting Address/Booleans/Strings
 * - Support Multiple Similar Items
 * - Set Multiple (for strings)
 *
 * @dev TODO: Enforce Single Type for each Key (register key's type when used)
 * 
 * Address Functions:
    Set 
    Add
    Remove 
    Get (first) 
    GetAll
    GetSlot(index)
 */
contract OpenRepoUpgradable is 
        IOpenRepo, 
        Initializable,
        OwnableUpgradeable,
        UUPSUpgradeable,
        ERC165,
        ContractBase {

    //--- Storage
    
    //Arbitrary Contract Name & Symbol 
    string public constant symbol = "OPENREPO";
    string public constant name = "Open Edge Repository";
    
    using AddressArray for address[];
    mapping(address => mapping(string => address[])) internal _addressesMulti;
    
    //Associations by Contract Address
    using StringArray for string[];
    mapping(address => mapping(string => string[])) internal _RepoString;
    
    //Associations by Contract Address
    using BoolArray for bool[];
    mapping(address => mapping(string => bool[])) internal _RepoBool;

    //Associations by Contract Address
    using UintArray for uint256[];
    mapping(address => mapping(string => uint256[])) internal _RepoUint;

    //--- Functions

    /// ERC165 - Supported Interfaces
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IOpenRepo).interfaceId 
            || super.supportsInterface(interfaceId);
    }

    /// Initializer
    function initialize () public initializer {
        //Initializers
        __Ownable_init();
    }

    /// Upgrade Permissions
    function _authorizeUpgrade(address newImplementation) internal onlyOwner override { }


    //-- Addresses

    /// Get First Address in Slot By Owner Node
    function addressGetOf(address originContract, string memory key) public view override returns (address) {
        //Handle Missing Values
        if(_addressesMulti[originContract][key].length == 0) return address(0);
        //Return
        return _addressesMulti[originContract][key][0];
    }

    /// Get First Address in Slot
    function addressGet(string memory key) external view override returns (address) {
        return addressGetOf(_msgSender(), key);
    }
    
    /// Check if address is Regitered to Slot
    function addressHasOf(address originContract, string memory key, address targetAddress) public view override returns (bool) {
        //Extract Address Array
        address[] memory addressArray = _addressesMulti[originContract][key];
        for (uint256 i = 0; i < addressArray.length; ++i) {
            //Item Found
            if(addressArray[i] == targetAddress) return true;
        }
        //Nothing Foun
        return false;
    }

    /// Check if address is Regitered to Slot
    function addressHas(string memory key, address targetAddress) external view override returns (bool) {
        return addressHasOf(_msgSender(), key, targetAddress);
    }
    
    /// Get First Address by Index
    function addressGetIndexOf(address originContract, string memory key, uint256 index) public view override returns (address) {
        return _addressesMulti[originContract][key][index];
    }

    /// Get First Address in Index
    function addressGetIndex(string memory key, uint256 index) external view override returns (address) {
        return addressGetIndexOf(_msgSender(), key, index);
    }
    
    /// Get All Address in Slot
    function addressGetAllOf(address originContract, string memory key) public view override returns (address[] memory) {
        return _addressesMulti[originContract][key];
    }

    /// Get All Address in Slot
    function addressGetAll(string memory key) external view override returns (address[] memory) {
        address originContract = _msgSender();
        return addressGetAllOf(originContract, key);
    }

    /// Set Address
    function addressSet(string memory key, address value) external override {
        //Set as the first slot of a new empty array
        _addressesMulti[_msgSender()][key] = [value];
        //Association Changed Event
        emit AddressSet(_msgSender(), key, value);
    }
    
    /// Add Address to Slot
    function addressAdd(string memory key, address value) external override {
        _addressesMulti[_msgSender()][key].push(value);
        //Association Changed Event
        emit AddressAdd(_msgSender(), key, value);
    }
    
    /// Remove Address from Slot
    function addressRemove(string memory key, address value) external override {
        _addressesMulti[_msgSender()][key].removeItem(value);
        //Association Changed Event
        emit AddressRemoved(_msgSender(), key, value);
    }

    //-- Booleans

    /// Get Boolean By Origin Owner Node
    function boolGetOf(address originContract, string memory key) public view override returns (bool) {
        //Validate
        if(_RepoBool[originContract][key].length == 0) return false;
        //Return Item
        return _RepoBool[originContract][key][0];
    }

    /// Get First Boolean in Slot
    function boolGet(string memory key) external view override returns (bool) {
        return boolGetOf(_msgSender(), key);
    }
    
    /// Get First Boolean by Index
    function boolGetIndexOf(address originContract, string memory key, uint256 index) public view override returns (bool) {
        return _RepoBool[originContract][key][index];
    }

    /// Get First Boolean in Index
    function boolGetIndex(string memory key, uint256 index) external view override returns (bool) {
        return boolGetIndexOf(_msgSender(), key, index);
    }
    
    /// Get All Boolean in Slot
    function boolGetAll(string memory key) external view returns (bool[] memory) {
        return _RepoBool[_msgSender()][key];
    }

    /// Set Boolean
    function boolSet(string memory key, bool value) external override {
        //Set as the first slot of a new empty array
        _RepoBool[_msgSender()][key] = [value];
        //Association Changed Event
        emit BoolSet(_msgSender(), key, value);
    }
    
    /// Add Boolean to Slot
    function boolAdd(string memory key, bool value) external override {
        _RepoBool[_msgSender()][key].push(value);
        //Association Changed Event
        emit BoolAdd(_msgSender(), key, value);
    }
    
    /// Remove Boolean from Slot
    function boolRemove(string memory key, bool value) external override {
        _RepoBool[_msgSender()][key].removeItem(value);
        //Association Changed Event
        emit BoolRemoved(_msgSender(), key, value);
    }


    //-- Uint

    /// Get Uint By Origin Owner Node
    function uintGetOf(address originContract, string memory key) public view override returns (uint256) {
        //Validate
        if(_RepoUint[originContract][key].length == 0) return 0; //Redundant
        //Return Item
        return _RepoUint[originContract][key][0];
    }

    /// Get First Uint in Slot
    function uintGet(string memory key) external view override returns (uint256) {
        return uintGetOf(_msgSender(), key);
    }
    
    /// Get First Uint by Index
    function uintGetIndexOf(address originContract, string memory key, uint256 index) public view override returns (uint256) {
        return _RepoUint[originContract][key][index];
    }

    /// Get First Uint in Index
    function uintGetIndex(string memory key, uint256 index) external view override returns (uint256) {
        return uintGetIndexOf(_msgSender(), key, index);
    }
    
    /// Get All Uint in Slot
    function uintGetAll(string memory key) external view returns (uint256[] memory) {
        return _RepoUint[_msgSender()][key];
    }

    /// Set Uint
    function uintSet(string memory key, uint256 value) external override {
        //Set as the first slot of a new empty array
        _RepoUint[_msgSender()][key] = [value];
        //Association Changed Event
        emit UintSet(_msgSender(), key, value);
    }
    
    /// Add Uint to Slot
    function uintAdd(string memory key, uint256 value) external override {
        _RepoUint[_msgSender()][key].push(value);
        //Association Changed Event
        emit UintAdd(_msgSender(), key, value);
    }
    
    /// Remove Uint from Slot
    function uintRemove(string memory key, uint256 value) external override {
        _RepoUint[_msgSender()][key].removeItem(value);
        //Association Changed Event
        emit UintRemoved(_msgSender(), key, value);
    }


    //-- Strings
        
    /// Get String By Origin Owner Node
    function stringGetOf(address ownerAddr, string memory key) public view override returns (string memory) {
        //Validate
        if(_RepoString[ownerAddr][key].length == 0) return "";
        //Return Item
        return _RepoString[ownerAddr][key][0];
    }

    /// Get First String in Slot
    function stringGet(string memory key) external view override returns (string memory) {
        return stringGetOf(_msgSender(), key);
    }
    
    /// Get First String by Index
    function stringGetIndexOf(address originContract, string memory key, uint256 index) public view override returns (string memory) {
        return _RepoString[originContract][key][index];
    }

    /// Get First String in Index
    function stringGetIndex(string memory key, uint256 index) external view override returns (string memory) {
        return stringGetIndexOf(_msgSender(), key, index);
    }
    
    /// Get All String in Slot
    function stringGetAll(string memory key) external view returns (string[] memory) {
        return _RepoString[_msgSender()][key];
    }

    /// Set String
    function stringSet(string memory key, string memory value) public override {
        //Clear Entire Array
        delete _RepoString[_msgSender()][key];
        //Set as the first slot of an empty array
        _RepoString[_msgSender()][key].push(value);
        //Association Changed Event
        emit StringSet(_msgSender(), key, value);
    }

    /// Set Strings (Multiple)
    function stringsSet(string[] memory keys, string[] memory values) external override {
        for (uint256 i = 0; i < keys.length; ++i) stringSet(keys[i], values[i]);
    }
    
    /// Add String to Slot
    function stringAdd(string memory key, string memory value) external override {
        //Add to Array
        _RepoString[_msgSender()][key].push(value);
        //Association Changed Event
        emit StringAdd(_msgSender(), key, value);
    }
    
    /// Remove String from Slot
    function stringRemove(string memory key, string memory value) external override {
        //Set as the first slot of an empty array
        _RepoString[_msgSender()][key].removeItem(value);
        //Association Changed Event
        emit StringRemoved(_msgSender(), key, value);
    }
}