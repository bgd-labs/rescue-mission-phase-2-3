// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Test} from 'forge-std/Test.sol';
import {AToken, ILendingPool, IERC20} from '../src/contracts/v2AUsdt/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol';
import {AaveGovernanceV2} from 'aave-address-book/AaveGovernanceV2.sol';
import {AaveV2Ethereum, AaveV2EthereumAssets} from 'aave-address-book/AaveV2Ethereum.sol';
import 'forge-std/console.sol';

contract V2AUsdtTest is Test {
  AToken NEW_A_TOKEN_IMPL;
  address public constant MERKLE_DISTRIBUTOR = address(1653);
  uint256 public constant RESCUE_AMOUNT = 11_010e6;

  function setUp() public {
    vm.createSelectFork('mainnet', 17591311);
    NEW_A_TOKEN_IMPL = new AToken(
      ILendingPool(address(AaveV2Ethereum.POOL)),
      AaveV2EthereumAssets.USDT_UNDERLYING,
      address(AaveV2Ethereum.COLLECTOR),
      'Aave interest bearing USDT',
      'aUSDT',
      AaveV2Ethereum.DEFAULT_INCENTIVES_CONTROLLER
    );
  }

  function testUpdateAToken() public {
    assertEq(AToken(AaveV2EthereumAssets.USDT_A_TOKEN).ATOKEN_REVISION(), 2);
    _updateAToken();
    assertEq(AToken(AaveV2EthereumAssets.USDT_A_TOKEN).ATOKEN_REVISION(), 3);
  }

  function testRescueUsdt() public {
    _updateAToken();
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    AToken(AaveV2EthereumAssets.USDT_A_TOKEN).rescueTokens(
      AaveV2EthereumAssets.USDT_UNDERLYING,
      MERKLE_DISTRIBUTOR,
      RESCUE_AMOUNT
    );
    assertEq(IERC20(AaveV2EthereumAssets.USDT_UNDERLYING).balanceOf(MERKLE_DISTRIBUTOR), RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function _updateAToken() internal {
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    AaveV2Ethereum.POOL_CONFIGURATOR.updateAToken(
      AaveV2EthereumAssets.USDT_UNDERLYING,
      address(NEW_A_TOKEN_IMPL)
    );
    vm.stopPrank();
  }
}
