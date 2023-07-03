// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;

import {Vm} from 'forge-std/Vm.sol';
import {LendingPool, LendingPoolAddressesProvider, ERC20} from '../src/contracts/v1Pool/LendingPool/LendingPool.sol';

contract V1PoolTest {
  address constant LINK_TOKEN = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
  address constant WBTC_A_TOKEN = 0xFC4B8ED459e00e5400be803A9BB3954234FD50e3;
  address constant SHORT_EXECUTOR = 0xEE56e2B3D491590B5b31738cC34d5232F378a8D5;
  address constant LENDING_POOL_ADDRESSES_PROVIDER = 0x24a42fD28C976A61Df5D00D0599C34c4f90748c8;
  address constant LENDING_POOL = 0x398eC7346DcD622eDc5ae82352F02bE94C62d119;

  LendingPool NEW_POOL_IMPL;
  address public constant MERKLE_DISTRIBUTOR = address(1653);
  uint256 public constant A_WBTC_RESCUE_AMOUNT = 192454215;
  uint256 public constant LINK_RESCUE_AMOUNT = 4084e18;

  Vm private constant vm = Vm(address(bytes20(uint160(uint256(keccak256('hevm cheat code'))))));

  function setUp() public {
    vm.createSelectFork('mainnet', 17591311);
    NEW_POOL_IMPL = new LendingPool();
  }

  function testUpdatePool() public {
    assert(LendingPool(LENDING_POOL).LENDINGPOOL_REVISION() == 5);
    _updatePool();
    assert(LendingPool(LENDING_POOL).LENDINGPOOL_REVISION() == 6);
  }

  function testRescueAWbtc() public {
    _updatePool();
    vm.startPrank(SHORT_EXECUTOR);
    LendingPool(LENDING_POOL).rescueTokens(
      WBTC_A_TOKEN,
      MERKLE_DISTRIBUTOR,
      A_WBTC_RESCUE_AMOUNT
    );
    assert(ERC20(WBTC_A_TOKEN).balanceOf(MERKLE_DISTRIBUTOR) == A_WBTC_RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function testRescueLink() public {
    _updatePool();
    vm.startPrank(SHORT_EXECUTOR);
    LendingPool(LENDING_POOL).rescueTokens(
      LINK_TOKEN,
      MERKLE_DISTRIBUTOR,
      LINK_RESCUE_AMOUNT
    );
    assert(ERC20(LINK_TOKEN).balanceOf(MERKLE_DISTRIBUTOR) == LINK_RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function _updatePool() internal {
    vm.startPrank(SHORT_EXECUTOR);
    LendingPoolAddressesProvider(LENDING_POOL_ADDRESSES_PROVIDER).setLendingPoolImpl(
      address(NEW_POOL_IMPL)
    );
    vm.stopPrank();
  }
}
