// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

interface IERC1155GUIDTracker {

    //--- Functions 
    
    /// Check if account is assigned to role
    function GUIDHas(address account, bytes32 guid) external view returns (bool);
    
    /// Get Metadata URI by GUID
    function GUIDURI(bytes32 guid) external view returns (string memory);

    /// Check if Soul Token is assigned to GUID
    function GUIDHasByToken(uint256 soulToken, bytes32 guid) external view returns (bool);

    //--- Events

    /// New GUID Created
    event GUIDCreated(uint256 indexed id, bytes32 guid);
   
}
