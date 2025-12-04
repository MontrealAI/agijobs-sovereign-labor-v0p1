// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {StakeManager} from "../StakeManager.sol";
import {IJobRegistryTax} from "../interfaces/IJobRegistryTax.sol";
import {IJobRegistryAck} from "../interfaces/IJobRegistryAck.sol";
import {ITaxPolicy} from "../interfaces/ITaxPolicy.sol";

/// @title MaliciousJobRegistry
/// @notice Simulates a hostile registry attempting to reenter StakeManager flows.
contract MaliciousJobRegistry is IJobRegistryTax, IJobRegistryAck {
    error ReentrancyUnexpectedlySucceeded();
    error UnexpectedRevert(bytes4 selector);
    error ReentrancyGuardReentrantCall();

    StakeManager public immutable stakeManager;
    ITaxPolicy private _policy;
    address public attacker;
    StakeManager.Role public attackRole;
    uint256 public attackAmount;

    constructor(StakeManager target) {
        stakeManager = target;
    }

    function configureAttack(address newAttacker, StakeManager.Role role, uint256 amount) external {
        attacker = newAttacker;
        attackRole = role;
        attackAmount = amount;
    }

    function setPolicy(ITaxPolicy newPolicy) external {
        _policy = newPolicy;
    }

    function taxPolicy() external view override returns (ITaxPolicy) {
        return _policy;
    }

    function acknowledgeTaxPolicy() external pure override returns (string memory) {
        return "ack";
    }

    function acknowledgeFor(address) external override returns (string memory) {
        if (attackAmount > 0) {
            uint256 amount = attackAmount;
            attackAmount = 0;
            try stakeManager.depositStakeFor(attacker, attackRole, amount) {
                revert ReentrancyUnexpectedlySucceeded();
            } catch (bytes memory data) {
                if (data.length < 4) revert UnexpectedRevert(bytes4(0));
                bytes4 selector = bytes4(data);
                if (selector != ReentrancyGuardReentrantCall.selector) {
                    revert UnexpectedRevert(selector);
                }
            }
        }
        return "ack";
    }

    function version() external pure returns (uint256) {
        return 2;
    }
}
