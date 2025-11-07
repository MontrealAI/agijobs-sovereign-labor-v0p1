// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IJobRegistryTax} from "../interfaces/IJobRegistryTax.sol";
import {IJobRegistryAck} from "../interfaces/IJobRegistryAck.sol";
import {ITaxPolicy} from "../interfaces/ITaxPolicy.sol";

/// @title MockJobRegistry
/// @notice Lightweight JobRegistry stand-in that always reports acknowledgements satisfied.
contract MockJobRegistry is IJobRegistryTax, IJobRegistryAck {
    ITaxPolicy private _policy;

    function setPolicy(ITaxPolicy newPolicy) external {
        _policy = newPolicy;
    }

    function taxPolicy() external view override returns (ITaxPolicy) {
        return _policy;
    }

    function acknowledgeTaxPolicy() external pure override returns (string memory) {
        return "ack";
    }

    function acknowledgeFor(address) external pure override returns (string memory) {
        return "ack";
    }
}
