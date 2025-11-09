// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IValidationModule} from "../interfaces/IValidationModule.sol";
import {IJobRegistry} from "../interfaces/IJobRegistry.sol";

/// @title DemoValidationModule
/// @notice Minimal validation harness used by integration tests to short-circuit
///         commit-reveal flows while exercising the JobRegistry demo pipeline.
/// @dev Satisfies the `IValidationModule` interface so production contracts can
///      be wired without modification. Only the `start` entry point is
///      implemented; all other mutating methods revert when called to surface
///      unexpected dependencies during tests.
contract DemoValidationModule is IValidationModule {
    IJobRegistry public jobRegistry;
    bool public defaultOutcome = true;

    mapping(uint256 => bool) private _hasCustomOutcome;
    mapping(uint256 => bool) private _customOutcome;
    mapping(uint256 => bool) private _pending;

    error NotConfigured();
    error OnlyJobRegistry();
    error NotSupported();
    error NotPending();

    event DemoValidationQueued(uint256 indexed jobId);

    /// @notice Configure the job registry that will receive validation results.
    /// @param registry Deployed job registry for the demo environment.
    function configure(IJobRegistry registry) external {
        jobRegistry = registry;
    }

    /// @notice Toggle the default outcome applied when no per-job override exists.
    /// @param success True to auto-approve submissions, false to auto-reject.
    function setDefaultOutcome(bool success) external {
        defaultOutcome = success;
    }

    /// @notice Override the outcome returned for a specific job identifier.
    /// @param jobId Job identifier produced by the registry.
    /// @param success Validation result to relay back to the registry.
    function setJobOutcome(uint256 jobId, bool success) external {
        _hasCustomOutcome[jobId] = true;
        _customOutcome[jobId] = success;
    }

    /// @inheritdoc IValidationModule
    function version() external pure override returns (uint256) {
        return 2;
    }

    /// @inheritdoc IValidationModule
    function selectValidators(uint256, uint256)
        external
        pure
        override
        returns (address[] memory)
    {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function start(uint256 jobId, uint256)
        external
        override
        returns (address[] memory)
    {
        if (address(jobRegistry) == address(0)) revert NotConfigured();
        if (msg.sender != address(jobRegistry)) revert OnlyJobRegistry();
        _pending[jobId] = true;
        emit DemoValidationQueued(jobId);
        return new address[](0);
    }

    /// @notice Complete validation for a pending job using the configured outcome.
    /// @param jobId Identifier of the job being processed.
    function complete(uint256 jobId) external {
        if (!_pending[jobId]) revert NotPending();
        delete _pending[jobId];
        bool outcome = _hasCustomOutcome[jobId]
            ? _customOutcome[jobId]
            : defaultOutcome;
        jobRegistry.validationComplete(jobId, outcome);
    }

    /// @inheritdoc IValidationModule
    function commitValidation(uint256, bytes32, string calldata, bytes32[] calldata)
        external
        pure
        override
    {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function revealValidation(
        uint256,
        bool,
        bytes32,
        bytes32,
        string calldata,
        bytes32[] calldata
    ) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function finalize(uint256) external pure override returns (bool) {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function finalizeValidation(uint256) external pure override returns (bool) {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function forceFinalize(uint256) external pure override returns (bool) {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function triggerFailover(
        uint256,
        FailoverAction,
        uint64,
        string calldata
    ) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setParameters(
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    ) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setValidatorsPerJob(uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setCommitRevealWindows(uint256, uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setTiming(uint256, uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setValidatorBounds(uint256, uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setRequiredValidatorApprovals(uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function resetJobNonce(uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setApprovalThreshold(uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setAutoApprovalTarget(bool) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setValidatorSlashingPct(uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setNonRevealPenalty(uint256, uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setRevealQuorum(uint256, uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setEarlyFinalizeDelay(uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setForceFinalizeGrace(uint256) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setValidatorSubdomains(address[] calldata, string[] calldata)
        external
        pure
        override
    {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setMySubdomain(string calldata) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function setSelectionStrategy(SelectionStrategy) external pure override {
        revert NotSupported();
    }

    /// @inheritdoc IValidationModule
    function bumpValidatorAuthCacheVersion() external pure override {}

    /// @inheritdoc IValidationModule
    function validators(uint256) external pure override returns (address[] memory) {
        return new address[](0);
    }

    /// @inheritdoc IValidationModule
    function votes(uint256 jobId, address) external view override returns (bool) {
        if (_hasCustomOutcome[jobId]) {
            return _customOutcome[jobId];
        }
        return defaultOutcome;
    }

    /// @inheritdoc IValidationModule
    function failoverStates(uint256)
        external
        pure
        override
        returns (
            FailoverAction action,
            uint64 extensions,
            uint64 lastExtendedTo,
            uint64 lastTriggeredAt,
            bool escalated
        )
    {
        action = FailoverAction.None;
        extensions = 0;
        lastExtendedTo = 0;
        lastTriggeredAt = 0;
        escalated = false;
    }
}
