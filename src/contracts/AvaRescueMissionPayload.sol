// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AaveV2Avalanche, AaveV2AvalancheAssets} from 'aave-address-book/AaveV2Avalanche.sol';
import {AaveMerkleDistributor} from 'rescue-mission-phase-1/contracts/AaveMerkleDistributor.sol';
import {IWETHGateway} from './interfaces/IWETHGateway.sol';
import {IRescue} from './interfaces/IRescue.sol';

/**
 * @title AvaRescueMissionPayload
 * @author BGD
 * @notice This payload contract initializes the distribution on the distributor, updates the contracts with
 *         rescue function and transfer the tokens to rescue to the merkle distributor contract - the payload should
 *         be executed by the pool admin / guardian multi-sig.
 */
contract AvaRescueMissionPayload {
  AaveMerkleDistributor public immutable AAVE_MERKLE_DISTRIBUTOR;
  address public immutable V2_POOL_IMPL;

  address public constant WETH_GATEWAY = 0x8a47F74d1eE0e2edEB4F3A7e64EF3bD8e11D27C8;

  bytes32 public constant USDTe_MERKLE_ROOT =
    0xa9512e18f4e9bd831bd35f0b57ed065c33b1f91ae2dce6881eead4b6bf8b39c7;

  bytes32 public constant USDCe_MERKLE_ROOT =
    0xeb179de06f52bdf883837eb45464224305c5eaddfa9518e0e293f5abca13b0fe;

  uint256 public constant USDTe_POOL_RESCUE_AMOUNT = 1_772_206585;

  uint256 public constant USDCe_POOL_RESCUE_AMOUNT = 2_522_408895;

  uint256 public constant USDCe_WETH_GATEWAY_RESCUE_AMOUNT = 14_100_000000;

  /**
   * @param aaveMerkleDistributor distributor contract which will distribute the tokens to rescue.
   *  @param v2PoolImpl address of the new aave v2 lending pool contract with rescue function.
   */
  constructor(AaveMerkleDistributor aaveMerkleDistributor, address v2PoolImpl) {
    AAVE_MERKLE_DISTRIBUTOR = aaveMerkleDistributor;
    V2_POOL_IMPL = v2PoolImpl;
  }

  function execute() external {
    _initializeDistribution();

    _updateContractWithRescueFunction();

    _rescueTokensToMerkleDistributor();
  }

  function _initializeDistribution() internal {
    address[] memory tokens = new address[](2);
    tokens[0] = AaveV2AvalancheAssets.USDTe_UNDERLYING;
    tokens[1] = AaveV2AvalancheAssets.USDCe_UNDERLYING;

    bytes32[] memory merkleRoots = new bytes32[](2);
    merkleRoots[0] = USDTe_MERKLE_ROOT;
    merkleRoots[1] = USDCe_MERKLE_ROOT;

    AAVE_MERKLE_DISTRIBUTOR.addDistributions(tokens, merkleRoots);
  }

  function _updateContractWithRescueFunction() internal {
    // Set new pool implementaion with rescue function for Aave V2 pool
    AaveV2Avalanche.POOL_ADDRESSES_PROVIDER.setLendingPoolImpl(V2_POOL_IMPL);
  }

  function _rescueTokensToMerkleDistributor() internal {
    IRescue(address(AaveV2Avalanche.POOL)).rescueTokens(
      AaveV2AvalancheAssets.USDTe_UNDERLYING,
      address(AAVE_MERKLE_DISTRIBUTOR),
      USDTe_POOL_RESCUE_AMOUNT
    );
    IRescue(address(AaveV2Avalanche.POOL)).rescueTokens(
      AaveV2AvalancheAssets.USDCe_UNDERLYING,
      address(AAVE_MERKLE_DISTRIBUTOR),
      USDCe_POOL_RESCUE_AMOUNT
    );
    IWETHGateway(WETH_GATEWAY).emergencyTokenTransfer(
      AaveV2AvalancheAssets.USDCe_UNDERLYING,
      address(AAVE_MERKLE_DISTRIBUTOR),
      USDCe_WETH_GATEWAY_RESCUE_AMOUNT
    );
  }
}
