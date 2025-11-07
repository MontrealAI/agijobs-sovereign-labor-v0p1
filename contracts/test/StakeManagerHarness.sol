// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {StakeManager} from "../StakeManager.sol";

/// @title StakeManagerHarness
/// @notice Testing harness exposing internal helpers for property checks.
contract StakeManagerHarness is StakeManager {
    constructor(
        uint256 _minStake,
        uint256 _employerSlashPct,
        uint256 _treasurySlashPct,
        address _treasury,
        address _jobRegistry,
        address _disputeModule,
        address _governance
    ) StakeManager(
        _minStake,
        _employerSlashPct,
        _treasurySlashPct,
        _treasury,
        _jobRegistry,
        _disputeModule,
        _governance
    ) {}

    function exposedSplitSlashAmount(uint256 amount)
        external
        view
        returns (
            uint256 validatorTarget,
            uint256 employerShare,
            uint256 treasuryShare,
            uint256 operatorShare,
            uint256 burnShare
        )
    {
        return _splitSlashAmount(amount);
    }
}
