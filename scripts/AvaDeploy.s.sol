// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;
pragma experimental ABIEncoderV2;

import 'forge-std/Test.sol';
import {LendingPool} from '../src/contracts/v2AvaPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {AaveV2Avalanche} from 'aave-address-book/AaveV2Avalanche.sol';

contract AvaDeploy is Test {
  // artifacts
  string constant aaveMerkleDistributorArtifact =
    'out/AaveMerkleDistributor.sol/AaveMerkleDistributor.json';
  string constant avaRescueMissionPayload_1_Artifact =
    'out/AvaRescueMissionPayload_Guardian_1.sol/AvaRescueMissionPayload_Guardian_1.json';
  string constant avaRescueMissionPayload_2_Artifact =
    'out/AvaRescueMissionPayload_Guardian_2.sol/AvaRescueMissionPayload_Guardian_2.json';

  // TODO
  address constant merkleDistributorOwner = address(1);

  // contracts
  address public aaveMerkleDistributor;
  LendingPool public lendingPool;

  // payload
  address public payload_1;
  address public payload_2;

  function run() public {
    vm.startBroadcast();

    aaveMerkleDistributor = deployCode(aaveMerkleDistributorArtifact);
    IOwnable(aaveMerkleDistributor).transferOwnership(merkleDistributorOwner);

    lendingPool = new LendingPool();

    payload_1 = deployCode(
      avaRescueMissionPayload_1_Artifact,
      abi.encode(aaveMerkleDistributor, address(lendingPool))
    );
    payload_2 = deployCode(avaRescueMissionPayload_2_Artifact, abi.encode(aaveMerkleDistributor));

    console.log('merkle distributor address', aaveMerkleDistributor);
    console.log('v2LendingPool address', address(lendingPool));
    console.log('payload 1 address', payload_1);
    console.log('payload 2 address', payload_2);

    vm.stopBroadcast();
  }
}

interface IOwnable {
  function transferOwnership(address newOwner) external;
}
