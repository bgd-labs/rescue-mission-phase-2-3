// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Test} from 'forge-std/Test.sol';
import {LendingPool, ILendingPoolAddressesProvider, IERC20} from '../src/contracts/v2EthPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {LendingPoolAddressesProvider} from '../src/contracts/v2EthPool/LendingPool/contracts/protocol/configuration/LendingPoolAddressesProvider.sol';
import {AaveGovernanceV2} from 'aave-address-book/AaveGovernanceV2.sol';

contract V2EthPoolTest is Test {
  address constant LENDING_POOL_ADDRESSES_PROVIDER = 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5;
  address constant LENDING_POOL = 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9;
  LendingPool NEW_POOL_IMPL;

  address constant MERKLE_DISTRIBUTOR = address(1653);
  address constant DAI_TOKEN = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address constant GUSD_TOKEN = 0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd;
  address constant HOT_TOKEN = 0x6c6EE5e31d828De241282B9606C8e98Ea48526E2;
  address constant USDC_TOKEN = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

  uint256 constant DAI_RESCUE_AMOUNT = 22_000e18;
  uint256 constant GUSD_RESCUE_AMOUNT = 19_994_86;
  uint256 constant HOT_RESCUE_AMOUNT = 1_046_391e18;
  uint256 constant USDC_RESCUE_AMOUNT = 1_089_889717;

  function setUp() public {
    vm.createSelectFork('mainnet', 17591311);
    NEW_POOL_IMPL = new LendingPool();
  }

  function testUpdateV2EthPool() public {
    assert(LendingPool(LENDING_POOL).LENDINGPOOL_REVISION() == 3);
    _updatePool();
    assert(LendingPool(LENDING_POOL).LENDINGPOOL_REVISION() == 4);
  }

  function testRescueDai() public {
    _updatePool();
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    LendingPool(LENDING_POOL).rescueTokens(
      DAI_TOKEN,
      MERKLE_DISTRIBUTOR,
      DAI_RESCUE_AMOUNT
    );
    assertEq(IERC20(DAI_TOKEN).balanceOf(MERKLE_DISTRIBUTOR), DAI_RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function testRescueGusd() public {
    _updatePool();
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    LendingPool(LENDING_POOL).rescueTokens(
      GUSD_TOKEN,
      MERKLE_DISTRIBUTOR,
      GUSD_RESCUE_AMOUNT
    );
    assertEq(IERC20(GUSD_TOKEN).balanceOf(MERKLE_DISTRIBUTOR), GUSD_RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function testRescueHot() public {
    _updatePool();
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    LendingPool(LENDING_POOL).rescueTokens(
      HOT_TOKEN,
      MERKLE_DISTRIBUTOR,
      HOT_RESCUE_AMOUNT
    );
    assertEq(IERC20(HOT_TOKEN).balanceOf(MERKLE_DISTRIBUTOR), HOT_RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function testRescueUsdc() public {
    _updatePool();
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    LendingPool(LENDING_POOL).rescueTokens(
      USDC_TOKEN,
      MERKLE_DISTRIBUTOR,
      USDC_RESCUE_AMOUNT
    );
    assertEq(IERC20(USDC_TOKEN).balanceOf(MERKLE_DISTRIBUTOR), USDC_RESCUE_AMOUNT);
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
