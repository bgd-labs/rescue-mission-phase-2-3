// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;
pragma experimental ABIEncoderV2;

import {Vm} from 'forge-std/Vm.sol';
import {TestWithExecutor} from './helper/GovHelpers.sol';
import {LendingPool, IERC20} from '../src/contracts/v2AvaPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {AaveV2Avalanche} from 'aave-address-book/AaveV2Avalanche.sol';

contract AvaRescueMissionPayloadTest is TestWithExecutor {
  // artifacts
  string constant aaveMerkleDistributorArtifact =
    'out/AaveMerkleDistributor.sol/AaveMerkleDistributor.json';
  string constant avaRescueMissionPayload_1_Artifact =
    'out/AvaRescueMissionPayload_Guardian_1.sol/AvaRescueMissionPayload_Guardian_1.json';
  string constant avaRescueMissionPayload_2_Artifact =
    'out/AvaRescueMissionPayload_Guardian_2.sol/AvaRescueMissionPayload_Guardian_2.json';

  uint256 constant USDT_E_RESCUE_AMOUNT = 1_772_206585;
  uint256 constant USDC_E_RESCUE_AMOUNT = 2_522_408895;

  address GUARDIAN_1 = 0x01244E7842254e3FD229CD263472076B1439D1Cd; // the owner of addresses provider
  address GUARDIAN_2 = AaveV2Avalanche.POOL_ADMIN;

  address constant USDTe_TOKEN = 0xc7198437980c041c805A1EDcbA50c1Ce5db95118;
  address constant USDCe_TOKEN = 0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664;

  address public payload_1;
  address public payload_2;
  address public aaveMerkleDistributor;

  function setUp() public {
    vm.createSelectFork(vm.rpcUrl('avalanche'), 32249000);
    _deployContracts();
    _selectPayloadExecutor(GUARDIAN_1);
  }

  function testPayload() public {
    // Execute proposal
    _executor.execute(payload_1);

    _selectPayloadExecutor(GUARDIAN_2);
    _executor.execute(payload_2);

    assertEq(IERC20(USDTe_TOKEN).balanceOf(aaveMerkleDistributor), USDT_E_RESCUE_AMOUNT);
    assertEq(IERC20(USDCe_TOKEN).balanceOf(aaveMerkleDistributor), USDC_E_RESCUE_AMOUNT);
  }

  function _deployContracts() internal {
    aaveMerkleDistributor = deployCode(aaveMerkleDistributorArtifact);
    // give ownership of distributor to GUARDIAN_1 (owner of addresses provider)
    IOwnable(aaveMerkleDistributor).transferOwnership(GUARDIAN_1);

    LendingPool lendingPool = new LendingPool();

    payload_1 = deployCode(
      avaRescueMissionPayload_1_Artifact,
      abi.encode(aaveMerkleDistributor, address(lendingPool))
    );
    payload_2 = deployCode(avaRescueMissionPayload_2_Artifact, abi.encode(aaveMerkleDistributor));
  }
}

interface IOwnable {
  function transferOwnership(address newOwner) external;
}
