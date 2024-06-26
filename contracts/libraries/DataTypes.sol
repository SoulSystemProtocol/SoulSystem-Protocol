// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.14;

/**
 * @title DataTypes
 * @notice A standard library of generally used data types
 */
library DataTypes {

    //---

    //NFT Identifiers
    struct Entity {
        address account;
        uint256 id;
        uint256 chain;
    }
    //Rating Domains
    enum Domain {
        Environment,
        Personal,
        Community,
        Professional
    }

    //--- Claims

    //Claim Lifecycle
    enum ClaimStage {
        Draft,
        Open,           // Filed -- Confirmation/Discussion (Evidence, Witnesses, etc’)
        Decision,       // Awaiting Decision (Authority, Jury, vote, etc’)
        Action,         // Remedy - Reward / Punishment / Compensation
        Appeal,
        Execution,
        Closed,
        Cancelled       // Denied / Withdrawn
    }

    //--- Actions

    // Semantic Action Entity
    struct Action {
        string name;    // Title: "Breach of contract",  
        string text;    // text: "The founder of the project must comply with the terms of the contract with investors",  //Text Description
        string uri;     //Additional Info
        SVO entities;
        // Confirmation confirmation;          //REMOVED - Confirmations a part of the Rule, Not action
    }

    struct SVO {    //Action's Core (System Role Mapping) (Immutable)
        string subject;
        string verb;
        string object;
        string tool; //[TBD]
    }

    //--- Rules
    
    // Rule Object
    struct Rule {
        bytes32 about;   //About What (Action's CID)      //TODO: Maybe Call This 'actionCID'? 
        string affected; //Affected Role. E.g. "investors"
        bool negation;   //0 - Commission  1 - Omission
        //-- Mutable
        string uri;      //Test & Conditions
        bool disabled;   //1 - Rule Disabled
    }
    /* DEPRECATED - Using RepChange instead due to new rep structure
    // Effect Structure (Reputation Changes)
    struct Effect {
        string name;
        uint8 value;    // value: 5
        bool direction; // Direction: -
        // bytes32 action; //Action CID
        // bytes data;  //[TBD]
        bool disabled;  //1 - Rule Disabled
    }
    */
    // Effect Structure (Reputation Changes)
    struct RepChange {
        // uint256 domain;
        string domain;
        int256 value;    // value: 5
        // bytes32 action; //Action CID
        // bytes data;  //[TBD]
        bool disabled;  //1 - Rule Disabled
    }

    // Stored Reactions [Action -> Reaction]
    /*
        action => Contract + Function + Parameters

        bytes memory data = abi.encodeWithSignature(verb:"set(uint256)", params:_value)
        //address(tool:contract).call(data);

        * tool: Target Contract: Repo:string => address 
        * verb: Function signature (string)
        * Parameters: [param]:[type:key]  E.g.
            to => Role:subject
            amount => RepoUint:prize
            / amount => function:getBalance() + Parameters...

        
        sig + param type (by source) => topic
    */
    struct Reaction {
        address tool; //assocGet() => Game / Soul
        string verb; //ruleAdd() / burn()
        bytes data; //rule / tokenId /...
    }

    //Rule Confirmation Method
    struct Confirmation {
        string ruling; //Decision Maker ["authority"|"jury"|"democracy"]
        bool evidence; //Require Evidence
        // uint witness; //Minimal number of witnesses //Removed
        uint quorum; //Minimal number/percent of voters  //Added
    }

    //Conditions
    struct Condition {
        string repo; //Condition Repository Identifier 
        bytes32 id; //Condition CID
    }

    //--- Claim Data

    //Rule Reference
    struct RuleRef {
        address game;
        uint256 ruleId;
    }
    
    //-- Function Inputs Structs

    //Role Input Struct
    struct InputRole {
        address account;
        string role;
    }

    //Role Input Struct (for Token)
    struct InputRoleToken {
        uint256 tokenId;
        string role;
        // uint256 amount;  //TBD - breaking upgrade?
    }

    //Decision Input
    struct InputDecision {
        uint256 ruleId;
        bool decision;
    }

    //Post Input Struct
    struct PostInput {
        uint256 tokenId;
        string entRole;
        string uri;
    }

    //Role Name Input Struct
    // struct InputRoleMapping {
    //     string role;
    //     string name;
    // }

}


