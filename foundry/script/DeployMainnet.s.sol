// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {OwnerConfigurator} from "../contracts/admin/OwnerConfigurator.sol";
import {TaxPolicy} from "../contracts/TaxPolicy.sol";
import {StakeManager} from "../contracts/StakeManager.sol";
import {FeePool} from "../contracts/FeePool.sol";
import {ReputationEngine} from "../contracts/ReputationEngine.sol";
import {PlatformRegistry} from "../contracts/PlatformRegistry.sol";
import {AttestationRegistry} from "../contracts/AttestationRegistry.sol";
import {IdentityRegistry} from "../contracts/IdentityRegistry.sol";
import {CertificateNFT} from "../contracts/CertificateNFT.sol";
import {ValidationModule} from "../contracts/ValidationModule.sol";
import {DisputeModule} from "../contracts/modules/DisputeModule.sol";
import {JobRegistry} from "../contracts/JobRegistry.sol";
import {ArbitratorCommittee} from "../contracts/ArbitratorCommittee.sol";
import {SystemPause} from "../contracts/SystemPause.sol";

contract DeployMainnet is Script {
    using stdJson for string;

    address private constant CANONICAL_AGIALPHA = 0xA61a3B3a130a9c20768EEBF97E21515A6046a1fA;
    bytes32 private constant ZERO_BYTES32 = bytes32(0);

    struct RuntimeConfig {
        uint256 platformFeeBps;
        uint256 platformFeePct;
        uint256 burnBpsOfFee;
        uint256 burnPct;
        uint256 slashBps;
        uint256 employerPct;
        uint256 treasuryPct;
        uint256 validatorQuorum;
        uint256 maxValidators;
        uint256 minStakeWei;
        uint256 jobStakeWei;
        uint256 disputeFeeWei;
        uint256 disputeWindow;
    }

    struct IdentityConfig {
        address ensRegistry;
        address nameWrapper;
        bytes32 agentRootNode;
        bytes32 clubRootNode;
        bytes32 agentMerkleRoot;
        bytes32 validatorMerkleRoot;
    }

    function _readUintString(
        string memory json,
        string memory key,
        uint256 defaultValue
    ) internal view returns (uint256) {
        if (!json.keyExists(key)) {
            return defaultValue;
        }
        string memory raw = json.readString(key);
        if (bytes(raw).length == 0) {
            return defaultValue;
        }
        return vm.parseUint(raw);
    }

    function _percentMultiple(
        uint256 value,
        uint256 divisor,
        string memory context
    ) internal pure returns (uint256) {
        require(value % divisor == 0, string.concat(context, " must be a multiple of divisor"));
        uint256 pct = value / divisor;
        require(pct <= 100, string.concat(context, " exceeds 100%"));
        return pct;
    }

    function run() external {
        string memory projectRoot = vm.projectRoot();
        string memory defaultPath = string.concat(projectRoot, "/deploy/config.mainnet.json");
        string memory configPath = vm.envOr("DEPLOY_CONFIG", defaultPath);
        string memory json = vm.readFile(configPath);

        uint256 cfgChainId = json.readUint(".chainId");
        require(cfgChainId == block.chainid, "Config chain mismatch");

        address ownerSafe = json.readAddress(".ownerSafe");
        address guardianSafe = json.readAddressOr(".guardianSafe", ownerSafe);
        address treasury = json.readAddressOr(".treasury", address(0));

        address agi = json.readAddress(".tokens.agi");
        if (block.chainid == 1) {
            require(agi == CANONICAL_AGIALPHA, "$AGIALPHA mismatch");
        }

        IERC20Metadata token = IERC20Metadata(agi);
        uint8 decimals = token.decimals();
        require(decimals == 18, "$AGIALPHA decimals");
        string memory symbol;
        string memory name;
        try token.symbol() returns (string memory s) {
            symbol = s;
        } catch {}
        try token.name() returns (string memory n) {
            name = n;
        } catch {}
        if (bytes(name).length > 0) {
            require(!_containsInsensitive(name, "test"), "$AGIALPHA name flagged as test");
        }

        RuntimeConfig memory params;
        params.platformFeeBps = json.readUintOr(".params.platformFeeBps", 1000);
        params.platformFeePct = _percentMultiple(params.platformFeeBps, 100, "platformFeeBps");
        params.burnBpsOfFee = json.readUintOr(".params.burnBpsOfFee", 100);
        params.burnPct = _percentMultiple(params.burnBpsOfFee, 100, "burnBpsOfFee");
        params.slashBps = json.readUintOr(".params.slashBps", 500);
        require(params.slashBps <= 10000, "slashBps invalid");
        params.treasuryPct = params.slashBps;
        params.employerPct = 10000 - params.treasuryPct;
        params.validatorQuorum = json.readUintOr(".params.validatorQuorum", 3);
        require(params.validatorQuorum > 0, "validatorQuorum zero");
        params.maxValidators = json.readUintOr(
            ".params.maxValidators",
            params.validatorQuorum * 2 > params.validatorQuorum ? params.validatorQuorum * 2 : params.validatorQuorum
        );
        params.minStakeWei = _readUintString(json, ".params.minStakeWei", 0);
        params.jobStakeWei = _readUintString(json, ".params.jobStakeWei", params.minStakeWei);
        params.disputeFeeWei = _readUintString(json, ".params.disputeFeeWei", 0);
        params.disputeWindow = json.readUintOr(".params.disputeWindow", 0);

        IdentityConfig memory identity;
        identity.ensRegistry = json.readAddressOr(".identity.ensRegistry", address(0));
        identity.nameWrapper = json.readAddressOr(".identity.nameWrapper", address(0));
        if (json.keyExists(".identity.agentRootNode")) {
            string memory node = json.readString(".identity.agentRootNode");
            if (bytes(node).length > 0) {
                identity.agentRootNode = vm.ensNamehash(node);
            }
        }
        if (json.keyExists(".identity.clubRootNode")) {
            string memory node = json.readString(".identity.clubRootNode");
            if (bytes(node).length > 0) {
                identity.clubRootNode = vm.ensNamehash(node);
            }
        }
        identity.agentMerkleRoot = json.readBytes32Or(".identity.agentMerkleRoot", ZERO_BYTES32);
        identity.validatorMerkleRoot = json.readBytes32Or(".identity.validatorMerkleRoot", ZERO_BYTES32);

        string memory taxPolicyUri = json.readStringOr(".tax.policyUri", "");
        string memory taxDescription = json.readStringOr(".tax.description", "");

        bytes32 rawKey;
        if (vm.envExists("DEPLOYER_PK")) {
            rawKey = vm.envBytes32("DEPLOYER_PK");
        } else if (vm.envExists("PRIVATE_KEY")) {
            rawKey = vm.envBytes32("PRIVATE_KEY");
        } else {
            revert("DEPLOYER_PK env required");
        }

        uint256 deployerKey = uint256(rawKey);
        address deployer = vm.addr(deployerKey);

        console2.log("\nDeploying Sovereign Labor kernel as", deployer);
        console2.log("Chain", block.chainid);
        console2.log("$AGIALPHA", agi, symbol);

        vm.startBroadcast(deployerKey);

        OwnerConfigurator ownerConfigurator = new OwnerConfigurator(ownerSafe);
        TaxPolicy taxPolicy = new TaxPolicy(taxPolicyUri, taxDescription);
        StakeManager stakeManager = new StakeManager(
            params.minStakeWei, params.employerPct, params.treasuryPct, treasury, address(0), address(0), deployer
        );
        FeePool feePool = new FeePool(stakeManager, params.burnPct, treasury, taxPolicy);
        ReputationEngine reputationEngine = new ReputationEngine(stakeManager);
        PlatformRegistry platformRegistry = new PlatformRegistry(stakeManager, reputationEngine, params.minStakeWei);
        AttestationRegistry attestationRegistry = new AttestationRegistry(identity.ensRegistry, identity.nameWrapper);
        IdentityRegistry identityRegistry = new IdentityRegistry(
            identity.ensRegistry, identity.nameWrapper, reputationEngine, identity.agentRootNode, identity.clubRootNode
        );
        CertificateNFT certificateNft = new CertificateNFT("Sovereign Labor Credential", "SLC");
        ValidationModule validationModule = new ValidationModule(
            address(0), stakeManager, 0, 0, params.validatorQuorum, params.maxValidators, new bytes32[](0)
        );
        DisputeModule disputeModule =
            new DisputeModule(address(0), params.disputeFeeWei, params.disputeWindow, address(0), deployer);
        JobRegistry jobRegistry = new JobRegistry(
            address(validationModule),
            address(stakeManager),
            address(reputationEngine),
            address(disputeModule),
            address(certificateNft),
            address(feePool),
            address(taxPolicy),
            params.platformFeePct,
            params.jobStakeWei,
            _singleAddressArray(address(taxPolicy)),
            deployer
        );
        ArbitratorCommittee committee = new ArbitratorCommittee(address(jobRegistry), address(disputeModule));
        SystemPause systemPause = new SystemPause(
            address(jobRegistry),
            address(stakeManager),
            address(validationModule),
            address(disputeModule),
            address(platformRegistry),
            address(feePool),
            address(reputationEngine),
            address(committee),
            deployer
        );

        if (address(attestationRegistry) != address(0)) {
            identityRegistry.setAttestationRegistry(address(attestationRegistry));
        }
        if (identity.agentMerkleRoot != ZERO_BYTES32) {
            identityRegistry.setAgentMerkleRoot(identity.agentMerkleRoot);
        }
        if (identity.validatorMerkleRoot != ZERO_BYTES32) {
            identityRegistry.setValidatorMerkleRoot(identity.validatorMerkleRoot);
        }

        validationModule.setJobRegistry(address(jobRegistry));
        validationModule.setStakeManager(address(stakeManager));
        validationModule.setIdentityRegistry(address(identityRegistry));
        validationModule.setReputationEngine(address(reputationEngine));

        stakeManager.setFeePool(address(feePool));
        stakeManager.setJobRegistry(address(jobRegistry));
        stakeManager.setDisputeModule(address(disputeModule));
        if (treasury != address(0)) {
            stakeManager.setTreasuryAllowlist(treasury, true);
            stakeManager.setTreasury(treasury);
        }

        disputeModule.setJobRegistry(address(jobRegistry));
        disputeModule.setStakeManager(address(stakeManager));
        disputeModule.setCommittee(address(committee));
        disputeModule.setTaxPolicy(address(taxPolicy));

        feePool.setStakeManager(address(stakeManager));
        feePool.setRewardRole(uint8(2));
        feePool.setTaxPolicy(address(taxPolicy));
        if (treasury != address(0)) {
            feePool.setTreasuryAllowlist(treasury, true);
            feePool.setTreasury(treasury);
        }
        feePool.setGovernance(address(systemPause));

        reputationEngine.setCaller(address(jobRegistry), true);
        reputationEngine.setCaller(address(validationModule), true);

        certificateNft.setJobRegistry(address(jobRegistry));

        taxPolicy.transferOwnership(address(systemPause));
        jobRegistry.transferOwnership(address(systemPause));
        stakeManager.transferOwnership(address(systemPause));
        validationModule.transferOwnership(address(systemPause));
        disputeModule.transferOwnership(address(systemPause));
        platformRegistry.transferOwnership(address(systemPause));
        feePool.transferOwnership(address(systemPause));
        reputationEngine.transferOwnership(address(systemPause));
        committee.transferOwnership(address(systemPause));

        systemPause.executeGovernanceCall(
            address(taxPolicy), abi.encodeWithSelector(taxPolicy.acceptOwnership.selector)
        );

        systemPause.setModules(
            address(jobRegistry),
            address(stakeManager),
            address(validationModule),
            address(disputeModule),
            address(platformRegistry),
            address(feePool),
            address(reputationEngine),
            address(committee)
        );
        systemPause.setGlobalPauser(guardianSafe);
        systemPause.transferOwnership(ownerSafe);

        certificateNft.transferOwnership(ownerSafe);
        attestationRegistry.transferOwnership(ownerSafe);
        identityRegistry.transferOwnership(ownerSafe);

        vm.stopBroadcast();

        _writeManifest(
            projectRoot,
            cfgChainId,
            ownerSafe,
            guardianSafe,
            treasury,
            address(systemPause),
            address(ownerConfigurator),
            address(jobRegistry),
            address(stakeManager),
            address(validationModule),
            address(disputeModule),
            address(committee),
            address(platformRegistry),
            address(reputationEngine),
            address(identityRegistry),
            address(attestationRegistry),
            address(certificateNft),
            address(taxPolicy),
            address(feePool)
        );

        console2.log("\nDeployment complete. Accept pending Safe tasks for identity modules.");
    }

    function _containsInsensitive(
        string memory haystack,
        string memory needle
    ) internal pure returns (bool) {
        bytes memory h = bytes(_lower(haystack));
        bytes memory n = bytes(_lower(needle));
        if (n.length == 0 || h.length < n.length) {
            return false;
        }
        for (uint256 i = 0; i <= h.length - n.length; i++) {
            bool matchAll = true;
            for (uint256 j = 0; j < n.length; j++) {
                if (h[i + j] != n[j]) {
                    matchAll = false;
                    break;
                }
            }
            if (matchAll) {
                return true;
            }
        }
        return false;
    }

    function _lower(
        string memory value
    ) internal pure returns (string memory) {
        bytes memory input = bytes(value);
        for (uint256 i = 0; i < input.length; i++) {
            uint8 charCode = uint8(input[i]);
            if (charCode >= 65 && charCode <= 90) {
                input[i] = bytes1(charCode + 32);
            }
        }
        return string(input);
    }

    function _singleAddressArray(
        address value
    ) internal pure returns (address[] memory arr) {
        arr = new address[](1);
        arr[0] = value;
    }

    function _writeManifest(
        string memory root,
        uint256 chainId,
        address ownerSafe,
        address guardianSafe,
        address treasury,
        address systemPause,
        address ownerConfigurator,
        address jobRegistry,
        address stakeManager,
        address validationModule,
        address disputeModule,
        address committee,
        address platformRegistry,
        address reputationEngine,
        address identityRegistry,
        address attestationRegistry,
        address certificateNft,
        address taxPolicy,
        address feePool
    ) internal {
        string memory dir = string.concat(root, "/manifests");
        vm.createDir(dir, true);
        string memory filename =
            chainId == 1 ? "addresses.mainnet.json" : string.concat("addresses.", vm.toString(chainId), ".json");
        string memory path = string.concat(dir, "/", filename);

        string memory json = string.concat(
            '{\n  "chainId": ',
            vm.toString(chainId),
            ',\n  "ownerSafe": "',
            vm.toString(ownerSafe),
            '",\n  "guardianSafe": "',
            vm.toString(guardianSafe),
            '",\n  "treasury": "',
            vm.toString(treasury),
            '",\n  "SystemPause": "',
            vm.toString(systemPause),
            '",\n  "OwnerConfigurator": "',
            vm.toString(ownerConfigurator),
            '",\n  "JobRegistry": "',
            vm.toString(jobRegistry),
            '",\n  "StakeManager": "',
            vm.toString(stakeManager),
            '",\n  "ValidationModule": "',
            vm.toString(validationModule),
            '",\n  "DisputeModule": "',
            vm.toString(disputeModule),
            '",\n  "ArbitratorCommittee": "',
            vm.toString(committee),
            '",\n  "PlatformRegistry": "',
            vm.toString(platformRegistry),
            '",\n  "ReputationEngine": "',
            vm.toString(reputationEngine),
            '",\n  "IdentityRegistry": "',
            vm.toString(identityRegistry),
            '",\n  "AttestationRegistry": "',
            vm.toString(attestationRegistry),
            '",\n  "CertificateNFT": "',
            vm.toString(certificateNft),
            '",\n  "TaxPolicy": "',
            vm.toString(taxPolicy),
            '",\n  "FeePool": "',
            vm.toString(feePool),
            '"\n}\n'
        );

        vm.writeFile(path, json);
    }
}
