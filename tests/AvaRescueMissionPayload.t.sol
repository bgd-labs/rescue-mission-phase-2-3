// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;
pragma experimental ABIEncoderV2;

import {TestWithExecutor} from './helper/GovHelpers.sol';
import {LendingPool, IERC20} from '../src/contracts/v2AvaPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {AaveV2Avalanche} from 'aave-address-book/AaveV2Avalanche.sol';

contract AvaRescueMissionPayloadTest is TestWithExecutor {
  // artifacts
  string constant aaveMerkleDistributorArtifact =
    'out/AaveMerkleDistributor.sol/AaveMerkleDistributor.json';
  string constant avaRescueMissionPayloadArtifact =
    'out/AvaRescueMissionPayload.sol/AvaRescueMissionPayload.json';

  uint256 constant USDTe_POOL_RESCUE_AMOUNT = 1_772_206585;
  uint256 constant USDCe_POOL_RESCUE_AMOUNT = 2_522_408895;
  uint256 constant USDCe_WETH_GATEWAY_RESCUE_AMOUNT = 14_100_000000;

  address OWNER_ADDRESSES_PROVIDER = 0x01244E7842254e3FD229CD263472076B1439D1Cd; // the owner of weth gateway

  address constant USDTe_TOKEN = 0xc7198437980c041c805A1EDcbA50c1Ce5db95118;
  address constant USDCe_TOKEN = 0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664;

  address constant WETH_GATEWAY = 0x8a47F74d1eE0e2edEB4F3A7e64EF3bD8e11D27C8;

  address public payload;
  address public aaveMerkleDistributor;

  function setUp() public {
    vm.createSelectFork(vm.rpcUrl('avalanche'), 34911904);
    _deployContracts();
    // TODO: remove when the owner of weth gateway has been transferred
    vm.startPrank(OWNER_ADDRESSES_PROVIDER);
    IOwnable(WETH_GATEWAY).transferOwnership(AaveV2Avalanche.POOL_ADMIN);
    vm.stopPrank();
    _selectPayloadExecutor(AaveV2Avalanche.POOL_ADMIN);
  }

  function testPayload() public {
    // Execute proposal
    _executor.execute(payload);

    assertEq(IERC20(USDTe_TOKEN).balanceOf(aaveMerkleDistributor), USDTe_POOL_RESCUE_AMOUNT);
    assertEq(
      IERC20(USDCe_TOKEN).balanceOf(aaveMerkleDistributor),
      USDCe_POOL_RESCUE_AMOUNT + USDCe_WETH_GATEWAY_RESCUE_AMOUNT
    );
  }

  function _deployContracts() internal {
    aaveMerkleDistributor = deployCode(aaveMerkleDistributorArtifact);
    // give ownership of distributor to guardian
    IOwnable(aaveMerkleDistributor).transferOwnership(AaveV2Avalanche.POOL_ADMIN);

    LendingPool lendingPool = new LendingPool();

    payload = deployCode(
      avaRescueMissionPayloadArtifact,
      abi.encode(aaveMerkleDistributor, address(lendingPool))
    );
  }
}

interface IOwnable {
  function transferOwnership(address newOwner) external;
}
