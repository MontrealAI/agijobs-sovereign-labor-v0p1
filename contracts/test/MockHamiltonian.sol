// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IHamiltonian} from "../interfaces/IHamiltonian.sol";

/// @dev Mock Hamiltonian feed that lets tests drive energy scores directly.
contract MockHamiltonian is IHamiltonian {
    int256 private current;

    function setHamiltonian(int256 value) external {
        current = value;
    }

    function currentHamiltonian() external view override returns (int256) {
        return current;
    }
}
