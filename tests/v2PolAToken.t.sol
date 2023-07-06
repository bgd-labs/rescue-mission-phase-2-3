// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Test} from 'forge-std/Test.sol';
import {AToken, ILendingPool, IAaveIncentivesController, IERC20} from '../src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol';
import {AaveGovernanceV2} from 'aave-address-book/AaveGovernanceV2.sol';
import {AaveV2Polygon, AaveV2PolygonAssets} from 'aave-address-book/AaveV2Polygon.sol';
import {LendingPoolConfigurator} from 'protocol-v2/contracts/protocol/lendingpool/LendingPoolConfigurator.sol';
import {ILendingPoolConfigurator} from 'protocol-v2/contracts/interfaces/ILendingPoolConfigurator.sol';

contract V2PolATokenTest is Test {
  AToken NEW_A_TOKEN_IMPL;
  address public constant MERKLE_DISTRIBUTOR = address(1653);
  uint256 public constant A_USDC_RESCUE_AMOUNT = 514_131_378018;
  uint256 public constant A_DAI_RESCUE_AMOUNT = 4_250_580268097645600939;

  function setUp() public {
    vm.createSelectFork('polygon', 42885400);
    NEW_A_TOKEN_IMPL = new AToken();
    NEW_A_TOKEN_IMPL.initialize(
      ILendingPool(address(AaveV2Polygon.POOL)),
      address(AaveV2Polygon.COLLECTOR),
      address(0),
      IAaveIncentivesController(AaveV2Polygon.DEFAULT_INCENTIVES_CONTROLLER),
      18,
      'A_TOKEN_NAME',
      'A_TOKEN_SYMBOL',
      bytes('')
    );
  }

  function testUpdateAUsdc() public {
    assertEq(AToken(AaveV2PolygonAssets.USDC_A_TOKEN).ATOKEN_REVISION(), 2);
    _updateAUsdc();
    assertEq(AToken(AaveV2PolygonAssets.USDC_A_TOKEN).ATOKEN_REVISION(), 3);
  }

  function testUpdateADai() public {
    assertEq(AToken(AaveV2PolygonAssets.DAI_A_TOKEN).ATOKEN_REVISION(), 2);
    _updateADai();
    assertEq(AToken(AaveV2PolygonAssets.DAI_A_TOKEN).ATOKEN_REVISION(), 3);
  }

  function testRescueAUsdc() public {
    _updateAUsdc();
    vm.startPrank(AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR);
    AToken(AaveV2PolygonAssets.USDC_A_TOKEN).rescueTokens(
      AaveV2PolygonAssets.USDC_A_TOKEN,
      MERKLE_DISTRIBUTOR,
      A_USDC_RESCUE_AMOUNT
    );
    assertEq(
      AToken(AaveV2PolygonAssets.USDC_A_TOKEN).balanceOf(MERKLE_DISTRIBUTOR),
      A_USDC_RESCUE_AMOUNT
    );
    vm.stopPrank();
  }

  function testRescueADai() public {
    _updateADai();
    vm.startPrank(AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR);
    AToken(AaveV2PolygonAssets.DAI_A_TOKEN).rescueTokens(
      AaveV2PolygonAssets.DAI_A_TOKEN,
      MERKLE_DISTRIBUTOR,
      A_DAI_RESCUE_AMOUNT
    );
    assertEq(
      AToken(AaveV2PolygonAssets.DAI_A_TOKEN).balanceOf(MERKLE_DISTRIBUTOR),
      A_DAI_RESCUE_AMOUNT
    );
    vm.stopPrank();
  }

  function _updateAUsdc() internal {
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

  function _updateADai() internal {
    vm.startPrank(AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR);
    LendingPoolConfigurator(address(AaveV2Polygon.POOL_CONFIGURATOR)).updateAToken(
      ILendingPoolConfigurator.UpdateATokenInput({
        asset: AaveV2PolygonAssets.DAI_UNDERLYING,
        treasury: address(AaveV2Polygon.COLLECTOR),
        incentivesController: AaveV2Polygon.DEFAULT_INCENTIVES_CONTROLLER,
        name: 'Aave Matic Market DAI',
        symbol: 'amDAI',
        implementation: address(NEW_A_TOKEN_IMPL),
        params: ''
      })
    );
    vm.stopPrank();
  }
}
