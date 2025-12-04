// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IJobRegistryTax} from "../interfaces/IJobRegistryTax.sol";
import {IJobRegistryAck} from "../interfaces/IJobRegistryAck.sol";
import {ITaxPolicy} from "../interfaces/ITaxPolicy.sol";

/// @title TrackingJobRegistry
/// @notice Minimal job registry stand-in that records acknowledgement attempts.
contract TrackingJobRegistry is IJobRegistryTax, IJobRegistryAck {
    ITaxPolicy private _policy;

    /// @notice Number of times acknowledge* has been invoked.
    uint256 public acknowledgeCount;

    /// @notice Tracks acknowledgements per user for test assertions.
    mapping(address => uint256) public acknowledgements;

    constructor(ITaxPolicy policy) {
        _policy = policy;
    }

    function setPolicy(ITaxPolicy policy) external {
        _policy = policy;
    }

    function taxPolicy() external view override returns (ITaxPolicy) {
        return _policy;
    }

    function acknowledgeTaxPolicy() external override returns (string memory ack) {
        acknowledgeCount += 1;
        acknowledgements[msg.sender] += 1;
        ack = _policy.acknowledgeFor(msg.sender);
    }

    function acknowledgeFor(address user) external override returns (string memory ack) {
        acknowledgeCount += 1;
        acknowledgements[user] += 1;
        ack = _policy.acknowledgeFor(user);
    }

    function version() external pure returns (uint256) {
        return 2;
    }
}
