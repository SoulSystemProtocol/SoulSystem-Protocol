// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

import "../libraries/DataTypes.sol";

interface IClaim {
    
    //-- Functions

    /// File the Claim (Validate & Open Discussion)  --> Open
    function stageFile() external;

    /// Stage: Wait For Verdict  --> Pending
    function stageWaitForDecision() external;

    /// Stage: Place Verdict  --> Closed
    // function stageDecision(string calldata uri) external;
    function stageDecision(DataTypes.InputDecision[] calldata verdict, string calldata uri) external;

    /// Stage: Reject Claim --> Cancelled
    function stageCancel(string calldata uri) external;

    /// Request to Join
    // function nominate(uint256 soulToken, string memory uri) external;

    //Get Contract Association
    // function assocGet(string memory key) external view returns (address);

    //** Rules
    
    /// Add Rule Reference
    function ruleRefAdd(address game_, uint256 ruleId_) external;

    //--- Events

    /// Rule Reference Added
    event RuleAdded(address game, uint256 ruleId);

    //Rule Confirmed
    event RuleConfirmed(uint256 ruleId);

    //Rule Denied (Changed from Confirmed)
    // event RuleDenied(uint256 ruleId);
    
    /// Nominate
    // event Nominate(address account, uint256 indexed id, string uri);

}
