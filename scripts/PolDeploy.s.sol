// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;
pragma experimental ABIEncoderV2;

import 'forge-std/Test.sol';
import {LendingPool} from '../src/contracts/v2PolPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {AToken} from '../src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol';
import {AaveGovernanceV2} from 'aave-address-book/AaveGovernanceV2.sol';

contract PolDeploy is Test {
  // artifacts
  string constant aaveMerkleDistributorArtifact =
    'out/AaveMerkleDistributor.sol/AaveMerkleDistributor.json';
  string constant polRescueMissionPayloadArtifact =
    'out/PolRescueMissionPayload.sol/PolRescueMissionPayload.json';

  // contracts
  address public aaveMerkleDistributor;
  AToken public aToken;
  LendingPool public lendingPool;

  // payload
  address public payload;

  function run() public {
    vm.startBroadcast();

    aaveMerkleDistributor = deployCode(aaveMerkleDistributorArtifact);
    IOwnable(aaveMerkleDistributor).transferOwnership(AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR);

    lendingPool = new LendingPool();
    aToken = new AToken();

    payload = deployCode(
      polRescueMissionPayloadArtifact,
      abi.encode(aaveMerkleDistributor, address(lendingPool), address(aToken))
    );

    console.log('merkle distributor address', aaveMerkleDistributor);
    console.log('v2LendingPool address', address(lendingPool));
    console.log('aToken address', address(aToken));
    console.log('payload address', payload);

    vm.stopBroadcast();
  }
}

interface IOwnable {
  function transferOwnership(address newOwner) external;
}
