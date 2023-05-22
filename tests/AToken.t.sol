// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Test} from 'forge-std/Test.sol';
import {AToken} from '../src/contracts/v2/AToken.sol';
import {AaveGovernanceV2} from 'aave-address-book/AaveGovernanceV2.sol';
import {AaveV2Polygon, AaveV2PolygonAssets} from "aave-address-book/AaveV2Polygon.sol";
import {LendingPoolConfigurator} from 'protocol-v2/contracts/protocol/lendingpool/LendingPoolConfigurator.sol';
import {ILendingPoolConfigurator} from 'protocol-v2/contracts/interfaces/ILendingPoolConfigurator.sol';
import 'forge-std/console.sol';

contract ATokenTest is Test {
  AToken NEW_A_TOKEN_IMPL;
  address public constant MERKLE_DISTRIBUTOR = address(1653);
  uint256 public constant RESCUE_AMOUNT = 514131378018;

  function setUp() public {
    vm.createSelectFork(
      'polygon',
      42885400
    );
    NEW_A_TOKEN_IMPL = new AToken();
  }

  function testUpdateAToken() public {
    _updateAToken();
    assertEq(
      AToken(AaveV2PolygonAssets.USDC_A_TOKEN).ATOKEN_REVISION(),
      3
    );
  }

  function testRescue() public {
    _updateAToken();
    vm.startPrank(AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR);
    AToken(AaveV2PolygonAssets.USDC_A_TOKEN).rescueTokens(
    AaveV2PolygonAssets.USDC_A_TOKEN,
    MERKLE_DISTRIBUTOR,
    RESCUE_AMOUNT
    );
    assertEq(
      AToken(AaveV2PolygonAssets.USDC_A_TOKEN).balanceOf(MERKLE_DISTRIBUTOR),
      RESCUE_AMOUNT
    );
    vm.stopPrank();
  }

  function _updateAToken() internal {
    vm.startPrank(AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR);
    LendingPoolConfigurator(address(AaveV2Polygon.POOL_CONFIGURATOR)).updateAToken(
      ILendingPoolConfigurator.UpdateATokenInput({
        asset: AaveV2PolygonAssets.USDC_UNDERLYING,
        treasury: address(AaveV2Polygon.COLLECTOR),
        incentivesController: AaveV2Polygon.DEFAULT_INCENTIVES_CONTROLLER,
        name: 'Aave Matic Market USDC',
        symbol: 'amUSDC',
        implementation: address(NEW_A_TOKEN_IMPL),
        params: ''
      })
    );
    vm.stopPrank();
  }
}
