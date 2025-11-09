// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";

import {AGIALPHA} from "contracts/Constants.sol";
import {MockAGIAlpha} from "contracts/test/MockAGIAlpha.sol";
import {TaxPolicy} from "contracts/TaxPolicy.sol";
import {StakeManager} from "contracts/StakeManager.sol";
import {FeePool} from "contracts/FeePool.sol";
import {ReputationEngine} from "contracts/ReputationEngine.sol";
import {IdentityRegistry} from "contracts/IdentityRegistry.sol";
import {CertificateNFT} from "contracts/CertificateNFT.sol";
import {DemoValidationModule} from "contracts/test/DemoValidationModule.sol";
import {MockDisputeModule} from "contracts/test/MockDisputeModule.sol";
import {JobRegistry} from "contracts/JobRegistry.sol";
import {IStakeManager} from "contracts/interfaces/IStakeManager.sol";
import {IValidationModule} from "contracts/interfaces/IValidationModule.sol";
import {IReputationEngine} from "contracts/interfaces/IReputationEngine.sol";
import {IDisputeModule} from "contracts/interfaces/IDisputeModule.sol";
import {IFeePool} from "contracts/interfaces/IFeePool.sol";
import {ITaxPolicy} from "contracts/interfaces/ITaxPolicy.sol";
import {IIdentityRegistry} from "contracts/interfaces/IIdentityRegistry.sol";
import {IENS} from "contracts/interfaces/IENS.sol";
import {INameWrapper} from "contracts/interfaces/INameWrapper.sol";
import {IJobRegistry} from "contracts/interfaces/IJobRegistry.sol";
import {ICertificateNFT} from "contracts/interfaces/ICertificateNFT.sol";

contract DemoFlowTest is Test {
    address private constant OWNER = address(0xA11CE);
    address private constant EMPLOYER = address(0xBEEF);
    address private constant AGENT = address(0xCAFE);
    address private constant TREASURY = address(0xFEE1);

    MockAGIAlpha private token;
    TaxPolicy private taxPolicy;
    StakeManager private stakeManager;
    FeePool private feePool;
    ReputationEngine private reputationEngine;
    IdentityRegistry private identityRegistry;
    CertificateNFT private certificateNFT;
    DemoValidationModule private validationModule;
    MockDisputeModule private disputeModule;
    JobRegistry private jobRegistry;

    function setUp() public {
        MockAGIAlpha template = new MockAGIAlpha();
        vm.etch(AGIALPHA, address(template).code);
        token = MockAGIAlpha(AGIALPHA);

        vm.startPrank(OWNER);
        taxPolicy = new TaxPolicy(
            "ipfs://demo-tax-policy",
            "Participants accept all tax responsibility."
        );
        stakeManager = new StakeManager(
            1 ether,
            9500,
            500,
            TREASURY,
            address(0),
            address(0),
            OWNER
        );
        feePool = new FeePool(address(stakeManager), 0, TREASURY, address(taxPolicy));
        reputationEngine = new ReputationEngine(address(stakeManager));
        identityRegistry = new IdentityRegistry(
            IENS(address(0)),
            INameWrapper(address(0)),
            IReputationEngine(address(reputationEngine)),
            bytes32(0),
            bytes32(0)
        );
        certificateNFT = new CertificateNFT("Demo Credential", "DEMO");
        validationModule = new DemoValidationModule();
        disputeModule = new MockDisputeModule();
        jobRegistry = new JobRegistry(
            IValidationModule(address(validationModule)),
            IStakeManager(address(stakeManager)),
            IReputationEngine(address(reputationEngine)),
            IDisputeModule(address(disputeModule)),
            ICertificateNFT(address(certificateNFT)),
            IFeePool(address(feePool)),
            ITaxPolicy(address(taxPolicy)),
            5,
            1 ether,
            new address[](0),
            OWNER
        );

        validationModule.configure(jobRegistry);
        validationModule.setDefaultOutcome(true);

        taxPolicy.setAcknowledger(address(jobRegistry), true);
        taxPolicy.setAcknowledger(address(stakeManager), true);
        jobRegistry.setAcknowledger(address(stakeManager), true);
        jobRegistry.setIdentityRegistry(address(identityRegistry));

        stakeManager.setJobRegistry(address(jobRegistry));
        stakeManager.setDisputeModule(address(disputeModule));
        stakeManager.setFeePool(address(feePool));
        stakeManager.setTreasuryAllowlist(TREASURY, true);
        stakeManager.setTreasury(TREASURY);

        feePool.setStakeManager(address(stakeManager));
        feePool.setTaxPolicy(address(taxPolicy));
        feePool.setTreasuryAllowlist(TREASURY, true);
        feePool.setTreasury(TREASURY);
        feePool.setBurnPct(0);

        reputationEngine.setCaller(address(jobRegistry), true);
        reputationEngine.setCaller(address(validationModule), true);

        certificateNFT.setJobRegistry(address(jobRegistry));
        certificateNFT.setStakeManager(address(stakeManager));

        disputeModule.setTaxPolicy(ITaxPolicy(address(taxPolicy)));
        identityRegistry.addAdditionalAgent(AGENT);
        vm.stopPrank();
    }

    function testDemoLifecycleHappyPath() public {
        uint256 reward = 100 ether;
        uint256 stakeAmount = jobRegistry.jobStake();
        uint256 feePct = jobRegistry.feePct();
        uint256 fee = (reward * feePct) / 100;
        uint64 deadline = uint64(block.timestamp + 7 days);
        bytes32 specHash = keccak256(abi.encodePacked("demo-spec-v1"));

        token.mint(EMPLOYER, reward + fee);
        vm.startPrank(EMPLOYER);
        token.approve(address(stakeManager), reward + fee);
        uint256 jobId = jobRegistry.acknowledgeAndCreateJob(
            reward,
            deadline,
            specHash,
            "ipfs://demo/job/1"
        );
        vm.stopPrank();

        assertTrue(taxPolicy.hasAcknowledged(EMPLOYER));

        token.mint(AGENT, stakeAmount);
        vm.startPrank(AGENT);
        token.approve(address(stakeManager), stakeAmount);
        jobRegistry.stakeAndApply(jobId, stakeAmount, "agent.demo", new bytes32[](0));
        jobRegistry.submit(
            jobId,
            keccak256(abi.encodePacked("demo-result")),
            "ipfs://demo/result/1",
            "agent.demo",
            new bytes32[](0)
        );
        vm.stopPrank();

        IJobRegistry.Job memory submitted = jobRegistry.jobs(jobId);
        IJobRegistry.JobMetadata memory submittedMeta = jobRegistry.decodeJobMetadata(
            submitted.packedMetadata
        );
        assertEq(uint256(submittedMeta.state), uint256(IJobRegistry.Status.Submitted));

        validationModule.complete(jobId);

        vm.prank(EMPLOYER);
        jobRegistry.finalize(jobId);

        IJobRegistry.Job memory finalized = jobRegistry.jobs(jobId);
        IJobRegistry.JobMetadata memory finalizedMeta = jobRegistry.decodeJobMetadata(
            finalized.packedMetadata
        );
        assertEq(uint256(finalizedMeta.state), uint256(IJobRegistry.Status.Finalized));

        assertEq(token.balanceOf(AGENT), reward);
        assertEq(stakeManager.stakeOf(AGENT, IStakeManager.Role.Agent), stakeAmount);
        assertEq(token.balanceOf(address(feePool)), fee);
        assertTrue(taxPolicy.hasAcknowledged(AGENT));
    }
}
