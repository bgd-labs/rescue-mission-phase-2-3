// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Test} from 'forge-std/Test.sol';
import {AToken, ILendingPool, IERC20} from '../src/contracts/v2EthAToken/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol';
import {AaveGovernanceV2} from 'aave-address-book/AaveGovernanceV2.sol';
import {AaveV2Ethereum, AaveV2EthereumAssets} from 'aave-address-book/AaveV2Ethereum.sol';

contract V2EthATokenTest is Test {
  AToken NEW_USDT_A_TOKEN_IMPL;
  AToken NEW_RAI_A_TOKEN_IMPL;

  address public constant MERKLE_DISTRIBUTOR = address(1653);
  uint256 public constant USDT_RESCUE_AMOUNT = 11_010e6;
  uint256 public constant A_RAI_RESCUE_AMOUNT = 1_481_160740870074804020;

  function setUp() public {
    vm.createSelectFork('mainnet', 17591311);
    NEW_USDT_A_TOKEN_IMPL = new AToken(
      ILendingPool(address(AaveV2Ethereum.POOL)),
      AaveV2EthereumAssets.USDT_UNDERLYING,
      address(AaveV2Ethereum.COLLECTOR),
      'Aave interest bearing USDT',
      'aUSDT',
      AaveV2Ethereum.DEFAULT_INCENTIVES_CONTROLLER
    );
    NEW_RAI_A_TOKEN_IMPL = new AToken(
      ILendingPool(address(AaveV2Ethereum.POOL)),
      AaveV2EthereumAssets.RAI_UNDERLYING,
      address(AaveV2Ethereum.COLLECTOR),
      'Aave interest bearing RAI 1',
      'aRAI',
      AaveV2Ethereum.DEFAULT_INCENTIVES_CONTROLLER
    );
  }

  function testUpdateARai() public {
    assertEq(AToken(AaveV2EthereumAssets.RAI_A_TOKEN).ATOKEN_REVISION(), 2);
    _updateARai();
    assertEq(AToken(AaveV2EthereumAssets.RAI_A_TOKEN).ATOKEN_REVISION(), 3);
  }

  function testUpdateAUsdt() public {
    assertEq(AToken(AaveV2EthereumAssets.USDT_A_TOKEN).ATOKEN_REVISION(), 2);
    _updateAUsdt();
    assertEq(AToken(AaveV2EthereumAssets.USDT_A_TOKEN).ATOKEN_REVISION(), 3);
  }

  function testRescueUsdt() public {
    _updateAUsdt();
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    AToken(AaveV2EthereumAssets.USDT_A_TOKEN).rescueTokens(
      AaveV2EthereumAssets.USDT_UNDERLYING,
      MERKLE_DISTRIBUTOR,
      USDT_RESCUE_AMOUNT
    );
    assertEq(IERC20(AaveV2EthereumAssets.USDT_UNDERLYING).balanceOf(MERKLE_DISTRIBUTOR), USDT_RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function testRescueARai() public {
    _updateARai();
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    AToken(AaveV2EthereumAssets.RAI_A_TOKEN).rescueTokens(
      AaveV2EthereumAssets.RAI_A_TOKEN,
      MERKLE_DISTRIBUTOR,
      A_RAI_RESCUE_AMOUNT
    );
    assertEq(IERC20(AaveV2EthereumAssets.RAI_A_TOKEN).balanceOf(MERKLE_DISTRIBUTOR), A_RAI_RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function _updateAUsdt() internal {
    NEW_USDT_A_TOKEN_IMPL.initialize(0, 'A_TOKEN_NAME', 'A_TOKEN_SYMBOL');
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    AaveV2Ethereum.POOL_CONFIGURATOR.updateAToken(
      AaveV2EthereumAssets.USDT_UNDERLYING,
      address(NEW_USDT_A_TOKEN_IMPL)
    );
    vm.stopPrank();
  }

  function _updateARai() internal {
    NEW_RAI_A_TOKEN_IMPL.initialize(0, 'A_TOKEN_NAME', 'A_TOKEN_SYMBOL');
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    AaveV2Ethereum.POOL_CONFIGURATOR.updateAToken(
      AaveV2EthereumAssets.RAI_UNDERLYING,
      address(NEW_RAI_A_TOKEN_IMPL)
    );
    vm.stopPrank();
  }
}
