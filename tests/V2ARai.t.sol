// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Test} from 'forge-std/Test.sol';
import {AToken, ILendingPool} from '../src/contracts/V2ARai/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol';
import {AaveGovernanceV2} from 'aave-address-book/AaveGovernanceV2.sol';
import {AaveV2Ethereum, AaveV2EthereumAssets} from 'aave-address-book/AaveV2Ethereum.sol';
import 'forge-std/console.sol';

interface IV2EthLendingPoolConfigurator {
  function updateAToken(address asset, address implementation) external;
}

contract V2ARaiTest is Test {
  AToken NEW_A_TOKEN_IMPL;
  address public constant MERKLE_DISTRIBUTOR = address(1653);
  uint256 public constant RESCUE_AMOUNT = 1481160740870074804020;

  function setUp() public {
    vm.createSelectFork('mainnet', 17591311);
    NEW_A_TOKEN_IMPL = new AToken(
      ILendingPool(address(AaveV2Ethereum.POOL)),
      AaveV2EthereumAssets.RAI_UNDERLYING,
      address(AaveV2Ethereum.COLLECTOR),
      'Aave interest bearing RAI',
      'aRAI',
      AaveV2Ethereum.DEFAULT_INCENTIVES_CONTROLLER
    );
  }

  function testUpdateAToken() public {
    assertEq(AToken(AaveV2EthereumAssets.RAI_A_TOKEN).ATOKEN_REVISION(), 2);
    _updateAToken();
    assertEq(AToken(AaveV2EthereumAssets.RAI_A_TOKEN).ATOKEN_REVISION(), 3);
  }

  function testRescue() public {
    _updateAToken();
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    AToken(AaveV2EthereumAssets.RAI_A_TOKEN).rescueTokens(
      AaveV2EthereumAssets.RAI_A_TOKEN,
      MERKLE_DISTRIBUTOR,
      RESCUE_AMOUNT
    );
    assertEq(AToken(AaveV2EthereumAssets.RAI_A_TOKEN).balanceOf(MERKLE_DISTRIBUTOR), RESCUE_AMOUNT);
    vm.stopPrank();
  }

  function _updateAToken() internal {
    vm.startPrank(AaveGovernanceV2.SHORT_EXECUTOR);
    IV2EthLendingPoolConfigurator(address(AaveV2Ethereum.POOL_CONFIGURATOR)).updateAToken(
      AaveV2EthereumAssets.RAI_UNDERLYING,
      address(NEW_A_TOKEN_IMPL)
    );
    vm.stopPrank();
  }
}
