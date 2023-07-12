// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;
pragma experimental ABIEncoderV2;

import {Vm} from 'forge-std/Vm.sol';
import {TestWithExecutor, AaveGovernanceV2} from './helper/GovHelpers.sol';
import {LendingPool, IERC20} from '../src/contracts/v2PolPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {AToken} from '../src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol';
import {AaveV2PolygonAssets} from 'aave-address-book/AaveV2Polygon.sol';

contract PolRescueMissionPayloadTest is TestWithExecutor {
  // artifacts
  string constant aaveMerkleDistributorArtifact =
    'out/AaveMerkleDistributor.sol/AaveMerkleDistributor.json';
  string constant polRescueMissionPayloadArtifact =
    'out/PolRescueMissionPayload.sol/PolRescueMissionPayload.json';

  uint256 public constant WBTC_RESCUE_AMOUNT = 22994977;
  uint256 public constant A_DAI_RESCUE_AMOUNT = 4_250_580268097645600939;
  uint256 public constant A_USDC_RESCUE_AMOUNT = 514_131_378018;
  uint256 public constant USDC_RESCUE_AMOUNT = 4_515_242949;

  address public payload;
  address public aaveMerkleDistributor;

  function setUp() public {
    vm.createSelectFork(vm.rpcUrl('polygon'), 42885400);
    _deployContracts();
    _selectPayloadExecutor(AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR);
  }

  function testPayload() public {
    // Execute proposal
    _executor.execute(payload);

    assertEq(
      IERC20(AaveV2PolygonAssets.WBTC_UNDERLYING).balanceOf(aaveMerkleDistributor),
      WBTC_RESCUE_AMOUNT
    );
    assertEq(
      IERC20(AaveV2PolygonAssets.DAI_A_TOKEN).balanceOf(aaveMerkleDistributor),
      A_DAI_RESCUE_AMOUNT
    );
    assertEq(
      IERC20(AaveV2PolygonAssets.USDC_A_TOKEN).balanceOf(aaveMerkleDistributor),
      A_USDC_RESCUE_AMOUNT
    );
    assertEq(
      IERC20(AaveV2PolygonAssets.USDC_UNDERLYING).balanceOf(aaveMerkleDistributor),
      USDC_RESCUE_AMOUNT
    );
  }

  function _deployContracts() internal {
    aaveMerkleDistributor = deployCode(aaveMerkleDistributorArtifact);
    // give ownership of distributor to bridge executor
    IOwnable(aaveMerkleDistributor).transferOwnership(AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR);

    LendingPool lendingPool = new LendingPool();
    AToken aToken = new AToken();

    payload = deployCode(
      polRescueMissionPayloadArtifact,
      abi.encode(aaveMerkleDistributor, address(lendingPool), address(aToken))
    );
  }
}

interface IOwnable {
  function transferOwnership(address newOwner) external;
}
