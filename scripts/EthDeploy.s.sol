// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;
pragma experimental ABIEncoderV2;

import 'forge-std/Test.sol';
import {LendingPool as V2LendingPool} from '../src/contracts/v2EthPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {LendingPool as V2AmmLendingPool} from '../src/contracts/v2AmmPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {AToken as V2AToken, ILendingPool as IV2LendingPool} from '../src/contracts/v2EthAToken/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol';
import {AaveV2Ethereum, AaveV2EthereumAssets} from 'aave-address-book/AaveV2Ethereum.sol';

contract EthDeploy is Test {
  // artifacts
  string constant v1PoolArtifact = 'out/LendingPool.sol/LendingPool.json';
  string constant ethRescueMissionPayloadlArtifact =
    'out/EthRescueMissionPayload.sol/EthRescueMissionPayload.json';

  // contracts
  address public constant aaveMerkleDistributor = 0xa88c6D90eAe942291325f9ae3c66f3563B93FE10;
  address public v1LendingPoolAddress;
  V2LendingPool v2LendingPool;
  V2AmmLendingPool v2AmmLendingPool;
  V2AToken raiAToken;
  V2AToken usdtAToken;

  // payload
  address public payload;

  function run() public {
    vm.startBroadcast();

    v1LendingPoolAddress = deployCode(v1PoolArtifact);
    v2LendingPool = new V2LendingPool();
    v2AmmLendingPool = new V2AmmLendingPool();

    raiAToken = new V2AToken(
      IV2LendingPool(address(AaveV2Ethereum.POOL)),
      AaveV2EthereumAssets.RAI_UNDERLYING,
      address(AaveV2Ethereum.COLLECTOR),
      'Aave interest bearing RAI',
      'aRAI',
      AaveV2Ethereum.DEFAULT_INCENTIVES_CONTROLLER
    );
    usdtAToken = new V2AToken(
      IV2LendingPool(address(AaveV2Ethereum.POOL)),
      AaveV2EthereumAssets.USDT_UNDERLYING,
      address(AaveV2Ethereum.COLLECTOR),
      'Aave interest bearing USDT',
      'aUSDT',
      AaveV2Ethereum.DEFAULT_INCENTIVES_CONTROLLER
    );

    payload = deployCode(
      ethRescueMissionPayloadlArtifact,
      abi.encode(
        aaveMerkleDistributor,
        v1LendingPoolAddress,
        address(v2LendingPool),
        address(v2AmmLendingPool),
        address(raiAToken),
        address(usdtAToken)
      )
    );

    console.log('v1LendingPool address', v1LendingPoolAddress);
    console.log('v2LendingPool address', address(v2LendingPool));
    console.log('v2AmmLendingPool address', address(v2AmmLendingPool));
    console.log('raiAToken address', address(raiAToken));
    console.log('usdtAToken address', address(usdtAToken));
    console.log('payload address', payload);

    vm.stopBroadcast();
  }
}
