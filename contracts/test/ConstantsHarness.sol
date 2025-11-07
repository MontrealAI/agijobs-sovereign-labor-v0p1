// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {AGIALPHA} from "../Constants.sol";

contract ConstantsHarness {
    function agiAlpha() external pure returns (address) {
        return AGIALPHA;
    }
}
