// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AaveV2Ethereum, AaveV2EthereumAssets} from 'aave-address-book/AaveV2Ethereum.sol';
import {AaveV2EthereumAMM} from 'aave-address-book/AaveV2EthereumAMM.sol';
import {ILendingPoolAddressesProvider} from './interfaces/ILendingPoolAddressesProvider.sol';
import {AaveMerkleDistributor} from 'rescue-mission-phase-1/contracts/AaveMerkleDistributor.sol';
import {IRescue} from './interfaces/IRescue.sol';

contract EthRescueMissionPayload {
  AaveMerkleDistributor public immutable AAVE_MERKLE_DISTRIBUTOR;
  address public immutable V1_POOL_IMPL;
  address public immutable V2_POOL_IMPL;
  address public immutable V2_AMM_POOL_IMPL;
  address public immutable V2_RAI_A_TOKEN_IMPL;
  address public immutable V2_USDT_A_TOKEN_IMPL;

  address public constant V1_POOL = 0x398eC7346DcD622eDc5ae82352F02bE94C62d119;
  address public constant V1_BTC_A_TOKEN = 0xFC4B8ED459e00e5400be803A9BB3954234FD50e3;
  address public constant HOT_TOKEN = 0x6c6EE5e31d828De241282B9606C8e98Ea48526E2;

  ILendingPoolAddressesProvider public constant V1_LENDING_POOL_ADDRESSES_PROVIDER =
    ILendingPoolAddressesProvider(0x24a42fD28C976A61Df5D00D0599C34c4f90748c8);
  ILendingPoolAddressesProvider public constant V2_LENDING_POOL_ADDRESSES_PROVIDER =
    ILendingPoolAddressesProvider(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
  ILendingPoolAddressesProvider public constant V2_AMM_LENDING_POOL_ADDRESSES_PROVIDER =
    ILendingPoolAddressesProvider(0xAcc030EF66f9dFEAE9CbB0cd1B25654b82cFA8d5);

  bytes32 public constant A_RAI_MERKLE_ROOT =
    0x46cf998dfa113fd51bc43bf8931a5b20d45a75471dde5df7b06654e94333a463;

  bytes32 public constant A_BTC_MERKLE_ROOT =
    0x46cf998dfa113fd51bc43bf8931a5b20d45a75471dde5df7b06654e94333a463;

  bytes32 public constant USDT_MERKLE_ROOT =
    0x46cf998dfa113fd51bc43bf8931a5b20d45a75471dde5df7b06654e94333a463;

  bytes32 public constant DAI_MERKLE_ROOT =
    0x46cf998dfa113fd51bc43bf8931a5b20d45a75471dde5df7b06654e94333a463;

  bytes32 public constant GUSD_MERKLE_ROOT =
    0x46cf998dfa113fd51bc43bf8931a5b20d45a75471dde5df7b06654e94333a463;

  bytes32 public constant LINK_MERKLE_ROOT =
    0x46cf998dfa113fd51bc43bf8931a5b20d45a75471dde5df7b06654e94333a463;

  bytes32 public constant HOT_MERKLE_ROOT =
    0x46cf998dfa113fd51bc43bf8931a5b20d45a75471dde5df7b06654e94333a463;

  bytes32 public constant USDC_MERKLE_ROOT =
    0x46cf998dfa113fd51bc43bf8931a5b20d45a75471dde5df7b06654e94333a463;

  uint256 public constant A_RAI_RESCUE_AMOUNT = 8007719287288096435418;

  uint256 public constant A_BTC_RESCUE_AMOUNT = 841600717506653731350931;

  uint256 public constant USDT_RESCUE_AMOUNT_AMM_POOL = 19845132947543342156792;

  uint256 public constant USDT_RESCUE_AMOUNT_A_USDT = 19845132947543342156792;

  uint256 DAI_RESCUE_AMOUNT = 8007719287288096435418;

  uint256 public constant GUSD_RESCUE_AMOUNT = 841600717506653731350931;

  uint256 public constant LINK_RESCUE_AMOUNT = 19845132947543342156792;

  uint256 HOT_RESCUE_AMOUNT = 8007719287288096435418;

  uint256 public constant USDC_RESCUE_AMOUNT = 841600717506653731350931;

  constructor(
    AaveMerkleDistributor aaveMerkleDistributor,
    address v1PoolImpl,
    address v2PoolImpl,
    address v2AmmPoolImpl,
    address v2RaiATokenImpl,
    address v2UsdtATokenImpl
  ) {
    AAVE_MERKLE_DISTRIBUTOR = aaveMerkleDistributor;
    V1_POOL_IMPL = v1PoolImpl;
    V2_POOL_IMPL = v2PoolImpl;
    V2_AMM_POOL_IMPL = v2AmmPoolImpl;
    V2_RAI_A_TOKEN_IMPL = v2RaiATokenImpl;
    V2_USDT_A_TOKEN_IMPL = v2UsdtATokenImpl;
  }

  function execute() external {
    _initializeDistribution();

    _updateContractsWithRescueFunction();

    _rescueTokensToMerkleDistributor();
  }

  function _initializeDistribution() internal {
    address[] memory tokens = new address[](8);
    tokens[0] = AaveV2EthereumAssets.RAI_A_TOKEN;
    tokens[1] = V1_BTC_A_TOKEN;
    tokens[2] = AaveV2EthereumAssets.USDT_UNDERLYING;
    tokens[3] = AaveV2EthereumAssets.DAI_UNDERLYING;
    tokens[4] = AaveV2EthereumAssets.GUSD_UNDERLYING;
    tokens[5] = AaveV2EthereumAssets.LINK_UNDERLYING;
    tokens[6] = HOT_TOKEN;
    tokens[7] = AaveV2EthereumAssets.USDC_UNDERLYING;

    bytes32[] memory merkleRoots = new bytes32[](8);
    merkleRoots[0] = A_RAI_MERKLE_ROOT;
    merkleRoots[1] = A_BTC_MERKLE_ROOT;
    merkleRoots[2] = USDT_MERKLE_ROOT;
    merkleRoots[3] = DAI_MERKLE_ROOT;
    merkleRoots[4] = GUSD_MERKLE_ROOT;
    merkleRoots[5] = LINK_MERKLE_ROOT;
    merkleRoots[6] = HOT_MERKLE_ROOT;
    merkleRoots[7] = USDC_MERKLE_ROOT;

    AAVE_MERKLE_DISTRIBUTOR.addDistributions(tokens, merkleRoots);
  }

  function _updateContractsWithRescueFunction() internal {
    // Set new pool implementaion with rescue function for Aave V1, V2, V2 Amm pools
    V1_LENDING_POOL_ADDRESSES_PROVIDER.setLendingPoolImpl(V1_POOL_IMPL);
    V1_LENDING_POOL_ADDRESSES_PROVIDER.setLendingPoolImpl(V2_POOL_IMPL);
    V1_LENDING_POOL_ADDRESSES_PROVIDER.setLendingPoolImpl(V2_AMM_POOL_IMPL);

    // update aToken impl for aRai and aUsdt with rescue function
    AaveV2Ethereum.POOL_CONFIGURATOR.updateAToken(
      AaveV2EthereumAssets.RAI_UNDERLYING,
      address(V2_RAI_A_TOKEN_IMPL)
    );
    AaveV2Ethereum.POOL_CONFIGURATOR.updateAToken(
      AaveV2EthereumAssets.USDT_UNDERLYING,
      address(V2_USDT_A_TOKEN_IMPL)
    );
  }

  function _rescueTokensToMerkleDistributor() internal {
    IRescue(V1_POOL).rescueTokens(
      V1_BTC_A_TOKEN,
      address(AAVE_MERKLE_DISTRIBUTOR),
      A_BTC_RESCUE_AMOUNT
    );
    IRescue(V1_POOL).rescueTokens(
      AaveV2EthereumAssets.LINK_UNDERLYING,
      address(AAVE_MERKLE_DISTRIBUTOR),
      LINK_RESCUE_AMOUNT
    );

    IRescue(address(AaveV2Ethereum.POOL)).rescueTokens(
      AaveV2EthereumAssets.DAI_UNDERLYING,
      address(AAVE_MERKLE_DISTRIBUTOR),
      DAI_RESCUE_AMOUNT
    );
    IRescue(address(AaveV2Ethereum.POOL)).rescueTokens(
      AaveV2EthereumAssets.GUSD_UNDERLYING,
      address(AAVE_MERKLE_DISTRIBUTOR),
      GUSD_RESCUE_AMOUNT
    );
    IRescue(address(AaveV2Ethereum.POOL)).rescueTokens(
      HOT_TOKEN,
      address(AAVE_MERKLE_DISTRIBUTOR),
      HOT_RESCUE_AMOUNT
    );
    IRescue(address(AaveV2Ethereum.POOL)).rescueTokens(
      AaveV2EthereumAssets.USDC_UNDERLYING,
      address(AAVE_MERKLE_DISTRIBUTOR),
      USDC_RESCUE_AMOUNT
    );
    IRescue(address(AaveV2EthereumAMM.POOL)).rescueTokens(
      AaveV2EthereumAssets.USDT_UNDERLYING,
      address(AAVE_MERKLE_DISTRIBUTOR),
      USDT_RESCUE_AMOUNT_AMM_POOL
    );

    IRescue(AaveV2EthereumAssets.USDT_A_TOKEN).rescueTokens(
      AaveV2EthereumAssets.USDT_UNDERLYING,
      address(AAVE_MERKLE_DISTRIBUTOR),
      USDT_RESCUE_AMOUNT_A_USDT
    );
    IRescue(AaveV2EthereumAssets.RAI_A_TOKEN).rescueTokens(
      AaveV2EthereumAssets.RAI_A_TOKEN,
      address(AAVE_MERKLE_DISTRIBUTOR),
      A_RAI_RESCUE_AMOUNT
    );
  }
}
