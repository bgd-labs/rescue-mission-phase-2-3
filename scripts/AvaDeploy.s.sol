// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;
pragma experimental ABIEncoderV2;

import 'forge-std/Test.sol';
import {LendingPool, ILendingPoolAddressesProvider} from '../src/contracts/v2AvaPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {AaveV2Avalanche} from 'aave-address-book/AaveV2Avalanche.sol';

contract AvaDeploy is Test {
  // artifacts
  string constant aaveMerkleDistributorArtifact =
    'out/AaveMerkleDistributor.sol/AaveMerkleDistributor.json';
  string constant avaRescueMissionPayloadArtifact =
    'out/AvaRescueMissionPayload.sol/AvaRescueMissionPayload.json';

  // contracts
  address public aaveMerkleDistributor;
  LendingPool public lendingPool;

  // payload
  address public payload;

  function run() public {
    vm.startBroadcast();

    aaveMerkleDistributor = deployCode(aaveMerkleDistributorArtifact);
    IOwnable(aaveMerkleDistributor).transferOwnership(AaveV2Avalanche.POOL_ADMIN);

    lendingPool = new LendingPool();

    payload = deployCode(
      avaRescueMissionPayloadArtifact,
      abi.encode(aaveMerkleDistributor, address(lendingPool))
    );

    console.log('merkle distributor address', aaveMerkleDistributor);
    console.log('v2LendingPool address', address(lendingPool));
    console.log('payload address', payload);

    vm.stopBroadcast();
  }
}

interface IOwnable {
  function transferOwnership(address newOwner) external;
}
