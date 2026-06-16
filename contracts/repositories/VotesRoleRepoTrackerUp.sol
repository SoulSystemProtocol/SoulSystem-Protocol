// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.6.0) (governance/utils/Votes.sol)
pragma solidity 0.8.14;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CheckpointsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/utils/IVotesUpgradeable.sol";
import "./interfaces/IVotesRoleRepoTracker.sol";
import "../abstract/Tracker.sol";
import "../abstract/ProtocolEntityUpgradable.sol";

/**
 * @dev [WIP] attempt on Vote Tracking with Role segmentation (Track power per each role)
 * 
 * @dev Based on VotesUpgradeable  https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v4.7.0/contracts/governance/utils/VotesUpgradeable.sol
 * @title Votes Repository
 * @dev Retains Voting Power History for other Contracts
 * Version 1.0.0
 */
// abstract contract VotesUpgradeable is Initializable, IVotesUpgradeable, ContextUpgradeable, EIP712Upgradeable {
contract VotesRoleRepoTrackerUp is 
        IVotesRoleRepoTracker, 
        // IVotesUpgradeable, 
        // Initializable, 
        ProtocolEntityUpgradable,
        UUPSUpgradeable,
        Tracker,
        // ContextUpgradeable, 
        EIP712Upgradeable {

            
    /// Upgrade Permissions
    function _authorizeUpgrade(address newImplementation) internal onlyOwner override { }

    /// Initializer
    function initialize (address hub) public initializer {
        //Initializers
        __Ownable_init();
        __ProtocolEntity_init(hub);
        __EIP712_init("VotesRoleRepoTrackerUp", "1");
        __UUPSUpgradeable_init();
        _setTargetContract( dataRepo().addressGetOf(address(_HUB), "SBT") );
    }

    /// Expose Target (SBT) Contract
    function getTargetContract() public view virtual override returns (address) {
        return _targetContract;
    }


    //** Implementation

    //Track Voting Units
    // mapping(address => mapping(address => uint256)) internal _unitsBalance;
    //[contract][tokenId] => [amount]
    // mapping(address => mapping(uint256 => uint256)) internal _unitsBalance;  
    //[contract][domainId][tokenId] => [amount]
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) internal _unitsBalance;

// x [contract:Soul][domainId:SBT_A][tokenId] => Struct{value, power, ...}
// x [contract:Game][domainId:role?][tokenId] => Struct{value, power, ...}
// x [contract_A:Game][SBTA:role?][contract_B][tokenId] => Struct{value, power, wisdom, safety, etc. [...domains?]}

// x [contract_A:Game][SBT_A: ?domain?][ domain ][contract_B][tokenId] => amount
// x [contract_A:Game][SBT_A: ?domain?][contract_B][tokenId][domain] => amount
// x mapping(address => mapping(uint256 => mapping(address => mapping(uint256 => mapping(uint256 => uint256))))) internal _unitsBalanceNew;

/* MOVED TO Opinion
//Only souls can have opinions + attachd to the SBT Contract
// v [SBT_A:(Game)][contract][tokenId][domain] => amount
mapping(uint256 => mapping(address => mapping(uint256 => mapping(uint256 => uint256)))) internal _unitsBalance2;
*/

// If you're not a [slot:developer] how can you have an opinion about [slot:development]?
// Opinion about how [domain:speed|value] you [action(tokenId):eat] => [amount:high]


    /// Expose Voting Power Transfer Method
    /// @dev Run this on the consumer contract. On _afterTokenTransfer() 
    // function transferVotingUnits(address from, address to, uint256 amount) external override {
    //     _transferVotingUnits(from, to, amount);
    // }
    function transferVotingUnits(uint256 from, uint256 to, uint256 domain, uint256 amount) external override {
        _transferVotingUnits(from, to, domain, amount);
    }

    /**
     * @dev Returns the balance of `account`.
     */
    // function _getVotingUnits(address account) internal view returns (uint256) {
        // return _unitsBalance[msg.sender][account];
    // }
    function _getVotingUnits(uint256 sbt, uint256 domain) internal view returns (uint256) {
        return _unitsBalance[msg.sender][domain][sbt];
        // return _unitsBalanceNew[msg.sender][sbt1][msg.sender][sbt2][domain];
    }


    //** Core

    using CheckpointsUpgradeable for CheckpointsUpgradeable.History;
    using CountersUpgradeable for CountersUpgradeable.Counter;


    bytes32 private constant _DELEGATION_TYPEHASH = keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    // mapping(address => address) private _delegation;
    // mapping(address => mapping(address => address)) private _delegation;
    // mapping(address => mapping(uint256 => uint256)) private _delegation;
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) private _delegation;
    
    // mapping(address => CheckpointsUpgradeable.History) private _delegateCheckpoints;
    // mapping(address => mapping(address => CheckpointsUpgradeable.History)) private _delegateCheckpoints;
    // mapping(address => mapping(uint256 => CheckpointsUpgradeable.History)) private _delegateCheckpoints;
    mapping(address => mapping(uint256 => mapping(uint256 => CheckpointsUpgradeable.History))) private _delegateCheckpoints;

    // CheckpointsUpgradeable.History private _totalCheckpoints;
    mapping(address => CheckpointsUpgradeable.History) private _totalCheckpoints;

    // mapping(address => CountersUpgradeable.Counter) private _nonces;
    // mapping(address => mapping(address => CountersUpgradeable.Counter)) private _nonces;
    mapping(address => mapping(uint256 => CountersUpgradeable.Counter)) private _nonces;


    /**
     * @dev Returns the current amount of votes that `account` has.
     */
    function getVotes(address account, uint256 domain) public view override returns (uint256) {
        // return _delegateCheckpoints[msg.sender][account].latest();
        return getVotesForToken(getExtTokenId(account), domain);
    }
    function getVotesForToken(uint256 sbt, uint256 domain) public view virtual override returns (uint256) {
        return _delegateCheckpoints[msg.sender][domain][sbt].latest();
    }

    /**
     * @dev Returns the amount of votes that `account` had at the end of a past block (`blockNumber`).
     *
     * Requirements:
     *
     * - `blockNumber` must have been already mined
     */
    function getPastVotes(address account, uint256 domain, uint256 blockNumber) public view override returns (uint256) {
        // return _delegateCheckpoints[msg.sender][account].getAtBlock(blockNumber);
        return getPastVotesForToken(getExtTokenId(account), domain, blockNumber);
    }
    function getPastVotesForToken(uint256 sbt, uint256 domain, uint256 blockNumber) public view virtual override returns (uint256) {
        return _delegateCheckpoints[msg.sender][domain][sbt].getAtBlock(blockNumber);
    }

    /**
     * @dev Returns the total supply of votes available at the end of a past block (`blockNumber`).
     *
     * NOTE: This value is the sum of all available votes, which is not necessarily the sum of all delegated votes.
     * Votes that have not been delegated are still part of total supply, even though they would not participate in a
     * vote.
     *
     * Requirements:
     *
     * - `blockNumber` must have been already mined
     */
    function getPastTotalSupply(uint256 blockNumber) public view override returns (uint256) {
        require(blockNumber < block.number, "VotesRepo: block not yet mined");
        return _totalCheckpoints[msg.sender].getAtBlock(blockNumber);
    }

    /**
     * @dev Returns the current total supply of votes.
     */
    function _getTotalSupply() internal view virtual returns (uint256) {
        return _totalCheckpoints[msg.sender].latest();
    }

    /**
     * @dev Returns the delegate that `account` has chosen.
     */
    function delegates(uint256 domain, address account) public view override returns (address) {
        // return _delegation[msg.sender][account];
        return _getAccount( delegatesToken(domain, getExtTokenId(account)) );
    }
    function delegatesToken(uint256 domain, uint256 sbt) public view override returns (uint256) {
        // return _delegation[msg.sender][domain][sbt];
        return delegatesTokenOf(msg.sender, domain, sbt);
    }
    function delegatesTokenOf(address contractAddr, uint256 domain, uint256 sbt) public view virtual override returns (uint256) {
        //Disable opt-out option by defaulting to Self        
        uint256 delegatee = _delegation[contractAddr][domain][sbt];
        return delegatee == 0 ? sbt : delegatee;
    }

    /**
     * @dev Delegates votes from the sender to `delegatee`.
     * /
    function delegate(uint256 domain, address delegatee) public virtual {
        revert("Insecure function, instead use delegateFrom()");
        // address account = _msgSender();  //Won't Work
        address account = tx.origin;    //Insecure
        _delegate(account, domain, delegatee);
    }

    /**
     * @dev Delegates votes from the sender to `delegatee`.
     * Security is up to the calling contract
     */
    function delegateFrom(uint256 domain, address from, address to) public override {
        _delegateToken(_getExtTokenId(from), domain, _getExtTokenId(to));
    }

    /**
     * @dev Delegates votes from signer to `delegatee`.
     */
    function delegateBySig(uint256 domain, address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) public override {
        require(block.timestamp <= expiry, "VotesRepo: signature expired");
        address signer = ECDSAUpgradeable.recover(
            _hashTypedDataV4(keccak256(abi.encode(_DELEGATION_TYPEHASH, delegatee, nonce, expiry))),
            v, r, s
        );
        require(nonce == _useNonce(_getExtTokenId(signer)), "VotesRepo: invalid nonce");
        _delegate(signer, domain, delegatee);
    }

    /**
     * @dev Delegate all of `account`'s voting units to `delegatee`.
     *
     * Emits events {DelegateChanged} and {DelegateVotesChanged}.
     */
    function _delegate(address account, uint256 domain, address delegatee) internal virtual {
        return _delegateToken(_getExtTokenId(account), domain, _getExtTokenId(delegatee));
    }
    function _delegateToken(uint256 sbt, uint256 domain, uint256 delegatee) internal virtual {
        // address oldDelegate = delegates(sbt);
        uint256 oldDelegate = delegatesToken(domain, sbt);
        _delegation[msg.sender][domain][sbt] = delegatee;
        emit DelegateChanged(_getAccount(sbt), _getAccount(oldDelegate), _getAccount(delegatee));   //For Backward Compatibility (Should Not be Trusted)
        emit DelegateChangedToken(sbt, oldDelegate, delegatee);
        _moveDelegateVotes(oldDelegate, delegatee, domain, _getVotingUnits(sbt, domain));
    }

    /**
     * @dev Transfers, mints, or burns voting units. To register a mint, `from` should be zero. To register a burn, `to`
     * should be zero. Total supply of voting units will be adjusted with mints and burns.
     */
    // function _transferVotingUnits(address from, address to, uint256 amount) internal virtual {
    function _transferVotingUnits(uint256 from, uint256 to, uint256 domain, uint256 amount) internal virtual {

        // _unitsBalanceNew[msg.sender][from][msg.sender][to][domain];

        if (from == 0) {
            //Mint
            _totalCheckpoints[msg.sender].push(_add, amount);
        }
        if (to == 0) {
            //Burn
            _totalCheckpoints[msg.sender].push(_subtract, amount);
        }

        _moveDelegateVotes(delegatesToken(domain, from), delegatesToken(domain, to), domain, amount);
    }

    /**
     * @dev Moves delegated votes from one delegate to another.
     */
    // function _moveDelegateVotes(address from, address to, uint256 amount) private {
    function _moveDelegateVotes(uint256 from, uint256 to, uint256 domain, uint256 amount) private {
        if (from != to && amount > 0) {
            if (from != 0) {
                (uint256 oldValue, uint256 newValue) = _delegateCheckpoints[msg.sender][domain][from].push(_subtract, amount);
                // emit DelegateVotesChanged(from, oldValue, newValue);
                emit DelegateVotesChanged(_getAccount(from), oldValue, newValue);   //For Backward Compatibility (Should Not be Trusted)
                emit DelegateVotesChangedToken(from, oldValue, newValue);
            }
            if (to != 0) {
                (uint256 oldValue, uint256 newValue) = _delegateCheckpoints[msg.sender][domain][to].push(_add, amount);
                // emit DelegateVotesChanged(to, oldValue, newValue);
                emit DelegateVotesChanged(_getAccount(to), oldValue, newValue);   //For Backward Compatibility (Should Not be Trusted)
                emit DelegateVotesChangedToken(to, oldValue, newValue);
            }
        }
    }

    function _add(uint256 a, uint256 b) private pure returns (uint256) {
        return a + b;
    }

    function _subtract(uint256 a, uint256 b) private pure returns (uint256) {
        return a - b;
    }

    /**
     * @dev Consumes a nonce.
     *
     * Returns the current value and increments nonce.
     */
    function _useNonce(uint256 owner) internal virtual returns (uint256 current) {
        CountersUpgradeable.Counter storage nonce = _nonces[msg.sender][owner];
        current = nonce.current();
        nonce.increment();
    }

    /**
     * @dev Returns an address nonce.
     */
    function nonces(address owner) public view virtual returns (uint256) {
        // return _nonces[msg.sender][owner].current();
        return noncesForToken(getExtTokenId(owner));
    }
    function noncesForToken(uint256 owner) public view virtual returns (uint256) {
        return _nonces[msg.sender][owner].current();
    }

    /**
     * @dev Returns the contract's {EIP712} domain separator.
     */
    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /** MOVED
     * @dev Must return the voting units held by an account.
     * /
    function _getVotingUnits(address) internal view virtual returns (uint256);

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[46] private __gap;
}
