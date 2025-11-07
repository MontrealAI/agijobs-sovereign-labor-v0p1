// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "forge-std/StdCheats.sol";
import "forge-std/StdInvariant.sol";

import {StakeManager} from "contracts/StakeManager.sol";
import {StakeManagerHarness} from "contracts/test/StakeManagerHarness.sol";
import {MockJobRegistry} from "contracts/test/MockJobRegistry.sol";
import {MockAGIAlpha} from "contracts/test/MockAGIAlpha.sol";
import {MockDisputeModule} from "contracts/test/MockDisputeModule.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {AGIALPHA} from "contracts/Constants.sol";

contract StakeManagerHandler is Test {

    StakeManagerHarness public immutable stakeManager;
    MockJobRegistry public immutable jobRegistry;
    MockAGIAlpha public immutable token;
    TimelockController public immutable timelock;
    address public immutable pauser;

    bool public mutationWhilePaused;
    uint256 public lastSlashAmount;
    uint256 public lastValidatorTarget;
    uint256 public lastEmployerShare;
    uint256 public lastTreasuryShare;
    uint256 public lastOperatorShare;
    uint256 public lastBurnShare;

    constructor(
        StakeManagerHarness _stakeManager,
        MockJobRegistry _jobRegistry,
        MockAGIAlpha _token,
        TimelockController _timelock,
        address _pauser
    ) {
        stakeManager = _stakeManager;
        jobRegistry = _jobRegistry;
        token = _token;
        timelock = _timelock;
        pauser = _pauser;
    }

    function depositStake(uint256 seed, uint256 amount) external {
        address staker = address(uint160(seed));
        if (staker == address(0)) {
            staker = address(0x1111);
        }
        amount = bound(amount, 1, 1e30);

        token.mint(staker, amount);
        vm.startPrank(staker);
        token.approve(address(stakeManager), amount);
        bool paused = stakeManager.paused();
        try stakeManager.depositStake(StakeManager.Role.Agent, amount) {
            if (paused) {
                mutationWhilePaused = true;
            }
        } catch {
            // ignored: revert could stem from insufficient stake or bounds
        }
        vm.stopPrank();
    }

    function slashStake(uint256 seed, uint256 rawAmount) external {
        address staker = address(uint160(seed));
        if (staker == address(0)) {
            staker = address(0x2222);
        }
        address employer = address(uint160(seed >> 96));
        if (employer == address(0)) {
            employer = address(0x3333);
        }

        uint256 amount = bound(rawAmount, 1, 1e30);
        _ensureStake(staker, amount + 1 ether);

        bool paused = stakeManager.paused();
        vm.startPrank(address(jobRegistry));
        try stakeManager.slash(staker, StakeManager.Role.Agent, amount, employer) {
            if (paused) {
                mutationWhilePaused = true;
            }
            (
                uint256 validatorTarget,
                uint256 employerShare,
                uint256 treasuryShare,
                uint256 operatorShare,
                uint256 burnShare
            ) = stakeManager.exposedSplitSlashAmount(amount);
            lastSlashAmount = amount;
            lastValidatorTarget = validatorTarget;
            lastEmployerShare = employerShare;
            lastTreasuryShare = treasuryShare;
            lastOperatorShare = operatorShare;
            lastBurnShare = burnShare;
        } catch {
            // ignore failed slash (insufficient stake, invalid params, etc.)
        }
        vm.stopPrank();
    }

    function togglePause(uint256 flag) external {
        bool shouldPause = flag % 2 == 0;
        if (shouldPause) {
            vm.prank(pauser);
            stakeManager.pause();
        } else {
            vm.prank(pauser);
            stakeManager.unpause();
        }
    }

    function setSlashDistribution(uint256 employer, uint256 treasury, uint256 operatorPct, uint256 validator) external {
        employer = bound(employer, 0, 100);
        treasury = bound(treasury, 0, 100 - employer);
        operatorPct = bound(operatorPct, 0, 100 - employer - treasury);
        validator = bound(validator, 0, 100);

        vm.startPrank(address(timelock));
        stakeManager.setSlashDistribution(employer, treasury, operatorPct, validator);
        stakeManager.setValidatorSlashRewardPct(validator);
        vm.stopPrank();
    }

    function _ensureStake(address staker, uint256 target) internal {
        uint256 current = stakeManager.stakes(staker, StakeManager.Role.Agent);
        if (current >= target) {
            return;
        }
        uint256 delta = target - current;
        token.mint(staker, delta);
        vm.startPrank(staker);
        token.approve(address(stakeManager), delta);
        vm.stopPrank();
        vm.prank(address(jobRegistry));
        stakeManager.depositStakeFor(staker, StakeManager.Role.Agent, delta);
    }
}

contract StakeManagerInvariantTest is StdInvariant, Test {
    StakeManagerHarness private stakeManager;
    MockJobRegistry private jobRegistry;
    MockAGIAlpha private token;
    TimelockController private timelock;
    StakeManagerHandler private handler;
    MockDisputeModule private disputeModule;
    address private pauser = address(0xBEEF);

    function setUp() public {
        MockAGIAlpha template = new MockAGIAlpha();
        vm.etch(AGIALPHA, address(template).code);
        token = MockAGIAlpha(AGIALPHA);

        address admin = address(this);
        address[] memory proposers = new address[](1);
        proposers[0] = admin;
        address[] memory executors = new address[](1);
        executors[0] = admin;
        timelock = new TimelockController(0, proposers, executors, admin);

        stakeManager = new StakeManagerHarness(
            0,
            50,
            50,
            address(0),
            address(0),
            address(0),
            address(timelock)
        );

        jobRegistry = new MockJobRegistry();
        disputeModule = new MockDisputeModule();
        vm.prank(address(timelock));
        stakeManager.setModules(address(jobRegistry), address(disputeModule));
        vm.prank(address(timelock));
        stakeManager.setPauserManager(pauser);
        vm.prank(address(timelock));
        stakeManager.setPauser(pauser);

        handler = new StakeManagerHandler(stakeManager, jobRegistry, token, timelock, pauser);
        targetContract(address(handler));
    }

    function invariant_noStateChangeWhilePaused() public view {
        assertFalse(handler.mutationWhilePaused(), "state mutation detected while paused");
    }

    function invariant_slashAccountingConservesAmount() public view {
        uint256 amount = handler.lastSlashAmount();
        if (amount == 0) {
            return;
        }
        uint256 total =
            handler.lastValidatorTarget() +
            handler.lastEmployerShare() +
            handler.lastTreasuryShare() +
            handler.lastOperatorShare() +
            handler.lastBurnShare();
        assertEq(total, amount, "slash distribution must equal input amount");
    }
}
