// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IDisputeModule} from "../interfaces/IDisputeModule.sol";
import {ITaxPolicy} from "../interfaces/ITaxPolicy.sol";

contract MockDisputeModule is IDisputeModule {
    ITaxPolicy public policy;

    function version() external pure returns (uint256) {
        return 2;
    }

    function setTaxPolicy(ITaxPolicy newPolicy) external {
        policy = newPolicy;
    }

    function raiseDispute(uint256, address, bytes32, string calldata) external {}

    function raiseGovernanceDispute(uint256, string calldata) external {}

    function resolveDispute(uint256, bool) external {}

    function resolveWithSignatures(uint256, bool, bytes[] calldata) external {}

    function submitEvidence(uint256, bytes32, string calldata) external {}

    function slashValidator(address, uint256, address) external {}
}
