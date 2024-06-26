// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

interface ICTXEntityUpgradable {

    //--- Functions

    /// Request to Join
    function nominate(uint256 sbt, string memory uri_) external;

    /// Create a new Role
    function roleCreate(string calldata role) external;

    /// Create a new Role & Set URI
    function roleMake(string memory role, string memory uri) external;

    /// Assign Someone to a Role
    function roleAssign(address account, string calldata role, uint256 amount) external;

    /// Assign Tethered Token to a Role
    function roleAssignToToken(uint256 toToken, string memory role, uint256 amount) external;

    /// Remove Someone Else from a Role
    function roleRemove(address account, string calldata role, uint256 amount) external;

    /// Remove Tethered Token from a Role
    function roleRemoveFromToken(uint256 sbt, string memory role, uint256 amount) external;

    /// Change Role Wrapper (Add & Remove)
    function roleChange(address account, string memory roleOld, string memory roleNew, uint256 amount) external;

    /// Get Token URI by Token ID
    function uri(uint256 token_id) external returns (string memory);

    /// Set Metadata URI For Role
    function setRoleURI(string memory role, string memory _tokenURI) external;

    /// Set Contract URI
    function setContractURI(string calldata contract_uri) external;

    /// Generic Config Get Function
    function confGet(string memory key) external view returns (string memory);

    /// Generic Config Set Function
    function confSet(string memory key, string memory value) external;

    //--- Events

    /// Nominate
    event Nominate(address account, uint256 indexed id, string uri);

}
