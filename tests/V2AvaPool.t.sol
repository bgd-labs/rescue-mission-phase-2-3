// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Test} from 'forge-std/Test.sol';
import {LendingPool, ILendingPoolAddressesProvider, IERC20} from '../src/contracts/v2AvaPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {AaveGovernanceV2} from 'aave-address-book/AaveGovernanceV2.sol';
import {AaveV2Avalanche} from 'aave-address-book/AaveV2Avalanche.sol';

contract V2AvaPoolTest is Test {
  LendingPool NEW_POOL_IMPL;

  address constant MERKLE_DISTRIBUTOR = address(1653);
  address constant USDC_E_TOKEN = 0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664;
  address constant USDT_E_TOKEN = 0xc7198437980c041c805A1EDcbA50c1Ce5db95118;

  address constant OWNER = 0x01244E7842254e3FD229CD263472076B1439D1Cd;

  uint256 constant USDC_E_RESCUE_AMOUNT = 2_522_408895;
  uint256 constant USDT_E_RESCUE_AMOUNT = 1_772_206585;

  function setUp() public {
    vm.createSelectFork('avalanche', 32249000);
    NEW_POOL_IMPL = new LendingPool();
  }

  function testUpdateV2EthPool() public {
    assert(LendingPool(address(AaveV2Avalanche.POOL)).LENDINGPOOL_REVISION() == 2);
    _updatePool();
    assert(LendingPool(address(AaveV2Avalanche.POOL)).LENDINGPOOL_REVISION() == 3);
  }

  function testRescueUsdcE() public {
    _updatePool();
    vm.startPrank(AaveV2Avalanche.POOL_ADMIN);
    LendingPool(address(AaveV2Avalanche.POOL)).rescueTokens(
      USDC_E_TOKEN,
      MERKLE_DISTRIBUTOR,
      USDC_E_RESCUE_AMOUNT
    );
    assertEq(IERC20(USDC_E_TOKEN).balanceOf(MERKLE_DISTRIBUTOR), USDC_E_RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function testRescueUsdtE() public {
    _updatePool();
    vm.startPrank(AaveV2Avalanche.POOL_ADMIN);
    LendingPool(address(AaveV2Avalanche.POOL)).rescueTokens(
      USDT_E_TOKEN,
      MERKLE_DISTRIBUTOR,
      USDT_E_RESCUE_AMOUNT
    );
    assertEq(IERC20(USDT_E_TOKEN).balanceOf(MERKLE_DISTRIBUTOR), USDT_E_RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function _updatePool() internal {
    vm.startPrank(OWNER);
    AaveV2Avalanche.POOL_ADDRESSES_PROVIDER.setLendingPoolImpl(address(NEW_POOL_IMPL));
    vm.stopPrank();
  }
}
