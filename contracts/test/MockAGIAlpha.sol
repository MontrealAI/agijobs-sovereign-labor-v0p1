// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockAGIAlpha
/// @notice Minimal ERC20 implementation deployed into the AGIALPHA address during tests.
contract MockAGIAlpha is ERC20 {
    constructor() ERC20("AGIJobs Alpha", "AGIALPHA") {}

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
