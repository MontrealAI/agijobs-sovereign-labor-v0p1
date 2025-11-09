// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title FlexibleMetadataToken
/// @notice Lightweight ERC-20 metadata stub for deployment config tests.
contract FlexibleMetadataToken {
    string public name;
    string public symbol;
    uint8 private immutable _decimals;

    constructor(string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals) {
        name = tokenName;
        symbol = tokenSymbol;
        _decimals = tokenDecimals;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }
}
