// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {TestWithExecutor, AaveGovernanceV2} from './helper/GovHelpers.sol';
import {AaveMerkleDistributor, IERC20} from 'rescue-mission-phase-1/contracts/AaveMerkleDistributor.sol';
import {OptRescueMissionPayload} from '../src/contracts/OptRescueMissionPayload.sol';
import {AaveV3OptimismAssets} from 'aave-address-book/AaveV3Optimism.sol';

contract OptRescueMissionPayloadTest is TestWithExecutor {
  uint256 public constant USDC_RESCUE_AMOUNT = 44_428_421035;

  OptRescueMissionPayload public payload;
  AaveMerkleDistributor public aaveMerkleDistributor;

  function setUp() public {
    vm.createSelectFork(vm.rpcUrl('optimism'), 107648877);
    _deployContracts();
    _selectPayloadExecutor(AaveGovernanceV2.OPTIMISM_BRIDGE_EXECUTOR);
  }

  function testPayload() public {
    // Execute payload
    _executor.execute(address(payload));

    assertEq(
      IERC20(AaveV3OptimismAssets.USDC_UNDERLYING).balanceOf(address(aaveMerkleDistributor)),
      USDC_RESCUE_AMOUNT
    );
  }

  function _deployContracts() internal {
    aaveMerkleDistributor = new AaveMerkleDistributor();
    // give ownership of distributor to bridge executor
    aaveMerkleDistributor.transferOwnership(AaveGovernanceV2.OPTIMISM_BRIDGE_EXECUTOR);

    payload = new OptRescueMissionPayload(aaveMerkleDistributor);
  }
}
