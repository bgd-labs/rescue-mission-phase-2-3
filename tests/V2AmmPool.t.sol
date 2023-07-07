// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Test} from 'forge-std/Test.sol';
import {LendingPool, ILendingPoolAddressesProvider, IERC20} from '../src/contracts/v2AmmPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {LendingPoolAddressesProvider} from '../src/contracts/v2AmmPool/LendingPool/contracts/protocol/configuration/LendingPoolAddressesProvider.sol';
import {AaveGovernanceV2} from 'aave-address-book/AaveGovernanceV2.sol';

contract V2AmmPoolTest is Test {
  address constant LENDING_POOL_ADDRESSES_PROVIDER = 0xAcc030EF66f9dFEAE9CbB0cd1B25654b82cFA8d5;
  address constant LENDING_POOL = 0x7937D4799803FbBe595ed57278Bc4cA21f3bFfCB;
  LendingPool NEW_POOL_IMPL;
  address constant MERKLE_DISTRIBUTOR = address(1653);
  address constant USDT_TOKEN = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
  uint256 constant RESCUE_AMOUNT = 20_600_057405;

  function setUp() public {
    vm.createSelectFork('mainnet', 17591311);
    NEW_POOL_IMPL = new LendingPool();
  }

  function testUpdateV2AmmPool() public {
    assert(LendingPool(LENDING_POOL).LENDINGPOOL_REVISION() == 2);
    _updatePool();
    assert(LendingPool(LENDING_POOL).LENDINGPOOL_REVISION() == 3);
  }

  function testRescueUsdt() public {
    _updatePool();
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    LendingPool(LENDING_POOL).rescueTokens(USDT_TOKEN, MERKLE_DISTRIBUTOR, RESCUE_AMOUNT);
    assertEq(IERC20(USDT_TOKEN).balanceOf(MERKLE_DISTRIBUTOR), RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function _updatePool() internal {
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    LendingPoolAddressesProvider(LENDING_POOL_ADDRESSES_PROVIDER).setLendingPoolImpl(
      address(NEW_POOL_IMPL)
    );
    vm.stopPrank();
  }
}
