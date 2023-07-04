// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Test} from 'forge-std/Test.sol';
import {LendingPool, IERC20} from '../src/contracts/v2PolPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {LendingPoolAddressesProvider} from '../src/contracts/v2PolPool/LendingPool/contracts/protocol/configuration/LendingPoolAddressesProvider.sol';
import {AaveV2PolygonAssets} from 'aave-address-book/AaveV2Polygon.sol';
import {AaveGovernanceV2} from 'aave-address-book/AaveGovernanceV2.sol';

contract V2PolPoolTest is Test {
  address constant LENDING_POOL_ADDRESSES_PROVIDER = 0xd05e3E715d945B59290df0ae8eF85c1BdB684744;
  address constant LENDING_POOL = 0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf;
  LendingPool NEW_POOL_IMPL;

  address constant MERKLE_DISTRIBUTOR = address(1653);
  uint256 constant WBTC_RESCUE_AMOUNT = 22994977;
  uint256 constant USDC_RESCUE_AMOUNT = 4_515_242949;

  function setUp() public {
    vm.createSelectFork('polygon', 44674257);
    NEW_POOL_IMPL = new LendingPool();
  }

  function testUpdateV2PolPool() public {
    assert(LendingPool(LENDING_POOL).LENDINGPOOL_REVISION() == 2);
    _updatePool();
    assert(LendingPool(LENDING_POOL).LENDINGPOOL_REVISION() == 3);
  }

  function testRescueUsdc() public {
    _updatePool();
    vm.startPrank(AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR);
    LendingPool(LENDING_POOL).rescueTokens(
      AaveV2PolygonAssets.USDC_UNDERLYING,
      MERKLE_DISTRIBUTOR,
      USDC_RESCUE_AMOUNT
    );
    assertEq(
      IERC20(AaveV2PolygonAssets.USDC_UNDERLYING).balanceOf(MERKLE_DISTRIBUTOR),
      USDC_RESCUE_AMOUNT
    );
    vm.stopPrank();
  }

  function testRescueWbtc() public {
    _updatePool();
    vm.startPrank(AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR);
    LendingPool(LENDING_POOL).rescueTokens(
      AaveV2PolygonAssets.WBTC_UNDERLYING,
      MERKLE_DISTRIBUTOR,
      WBTC_RESCUE_AMOUNT
    );
    assertEq(
      IERC20(AaveV2PolygonAssets.WBTC_UNDERLYING).balanceOf(MERKLE_DISTRIBUTOR),
      WBTC_RESCUE_AMOUNT
    );
    vm.stopPrank();
  }

  function _updatePool() internal {
    vm.startPrank(AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR);
    LendingPoolAddressesProvider(LENDING_POOL_ADDRESSES_PROVIDER).setLendingPoolImpl(
      address(NEW_POOL_IMPL)
    );
    vm.stopPrank();
  }
}
