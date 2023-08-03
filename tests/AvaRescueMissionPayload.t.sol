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

  uint256 constant USDT_E_RESCUE_AMOUNT = 1_772_206585;
  uint256 constant USDC_E_RESCUE_AMOUNT = 2_522_408895;

  address OWNER_ADDRESSES_PROVIDER = 0x01244E7842254e3FD229CD263472076B1439D1Cd; // the owner of addresses provider

  address constant USDTe_TOKEN = 0xc7198437980c041c805A1EDcbA50c1Ce5db95118;
  address constant USDCe_TOKEN = 0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664;

  address public payload;
  address public aaveMerkleDistributor;

  function setUp() public {
    vm.createSelectFork(vm.rpcUrl('avalanche'), 32249000);
    _deployContracts();
    vm.startPrank(OWNER_ADDRESSES_PROVIDER);
    // TODO: remove this after the ownership has been transferred
    IOwnable(address(AaveV2Avalanche.POOL_ADDRESSES_PROVIDER)).transferOwnership(
      AaveV2Avalanche.POOL_ADMIN
    );
    vm.stopPrank();
    _selectPayloadExecutor(AaveV2Avalanche.POOL_ADMIN);
  }

  function testPayload() public {
    // Execute proposal
    _executor.execute(payload);

    assertEq(IERC20(USDTe_TOKEN).balanceOf(aaveMerkleDistributor), USDT_E_RESCUE_AMOUNT);
    assertEq(IERC20(USDCe_TOKEN).balanceOf(aaveMerkleDistributor), USDC_E_RESCUE_AMOUNT);
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
