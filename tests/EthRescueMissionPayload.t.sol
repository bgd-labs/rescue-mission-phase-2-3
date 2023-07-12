// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;
pragma experimental ABIEncoderV2;

import {Vm} from 'forge-std/Vm.sol';
import {GovHelpers, TestWithExecutor} from './helper/GovHelpers.sol';
import {LendingPool as V2LendingPool} from '../src/contracts/v2EthPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {LendingPool as V2AmmLendingPool} from '../src/contracts/v2AmmPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol';
import {AToken as V2AToken, ILendingPool as IV2LendingPool, IERC20} from '../src/contracts/v2EthAToken/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol';
import {AaveV2Ethereum, AaveV2EthereumAssets} from 'aave-address-book/AaveV2Ethereum.sol';

contract EthRescueMissionPayloadTest is TestWithExecutor {
  // artifacts
  string constant v1PoolArtifact = 'out/LendingPool.sol/LendingPool.json';
  string constant aaveMerkleDistributorArtifact =
    'out/AaveMerkleDistributor.sol/AaveMerkleDistributor.json';
  string constant ethRescueMissionPayloadlArtifact =
    'out/EthRescueMissionPayload.sol/EthRescueMissionPayload.json';

  uint256 public constant A_RAI_RESCUE_AMOUNT = 1_481_160740870074804020;
  uint256 public constant A_BTC_RESCUE_AMOUNT = 192454215;
  uint256 public constant USDT_RESCUE_AMOUNT_AMM_POOL = 20_600_057405;
  uint256 public constant USDT_RESCUE_AMOUNT_A_USDT = 11_010e6;
  uint256 public constant DAI_RESCUE_AMOUNT = 22_000;
  uint256 public constant GUSD_RESCUE_AMOUNT = 19_994_86;
  uint256 public constant LINK_RESCUE_AMOUNT = 4084e18;
  uint256 public constant HOT_RESCUE_AMOUNT = 1_046_391e18;
  uint256 public constant USDC_RESCUE_AMOUNT = 1_089_889717;

  address constant WBTC_A_TOKEN = 0xFC4B8ED459e00e5400be803A9BB3954234FD50e3;
  address public constant HOT_TOKEN = 0x6c6EE5e31d828De241282B9606C8e98Ea48526E2;

  address public payload;
  address public aaveMerkleDistributor;

  function setUp() public {
    vm.createSelectFork(vm.rpcUrl('mainnet'), 17591311);
    _deployContracts();
    _selectPayloadExecutor(GovHelpers.SHORT_EXECUTOR);
  }

  function testPayload() public {
    // Execute proposal
    _executor.execute(payload);

    assertEq(
      IERC20(AaveV2EthereumAssets.RAI_A_TOKEN).balanceOf(aaveMerkleDistributor),
      A_RAI_RESCUE_AMOUNT
    );
    assertEq(IERC20(WBTC_A_TOKEN).balanceOf(aaveMerkleDistributor), A_BTC_RESCUE_AMOUNT);
    assertEq(
      IERC20(AaveV2EthereumAssets.USDT_UNDERLYING).balanceOf(aaveMerkleDistributor),
      USDT_RESCUE_AMOUNT_A_USDT + USDT_RESCUE_AMOUNT_AMM_POOL
    );
    assertEq(
      IERC20(AaveV2EthereumAssets.DAI_UNDERLYING).balanceOf(aaveMerkleDistributor),
      DAI_RESCUE_AMOUNT
    );
    assertEq(
      IERC20(AaveV2EthereumAssets.GUSD_UNDERLYING).balanceOf(aaveMerkleDistributor),
      GUSD_RESCUE_AMOUNT
    );
    assertEq(
      IERC20(AaveV2EthereumAssets.LINK_UNDERLYING).balanceOf(aaveMerkleDistributor),
      LINK_RESCUE_AMOUNT
    );
    assertEq(IERC20(HOT_TOKEN).balanceOf(aaveMerkleDistributor), HOT_RESCUE_AMOUNT);
    assertEq(
      IERC20(AaveV2EthereumAssets.USDC_UNDERLYING).balanceOf(aaveMerkleDistributor),
      USDC_RESCUE_AMOUNT
    );
  }

  function _deployContracts() internal {
    aaveMerkleDistributor = deployCode(aaveMerkleDistributorArtifact);
    // give ownership of distributor to short executor
    IOwnable(aaveMerkleDistributor).transferOwnership(GovHelpers.SHORT_EXECUTOR);

    address v1LendingPoolAddress = deployCode(v1PoolArtifact);
    V2LendingPool v2LendingPool = new V2LendingPool();
    V2AmmLendingPool v2AmmLendingPool = new V2AmmLendingPool();

    V2AToken raiAToken = new V2AToken(
      IV2LendingPool(address(AaveV2Ethereum.POOL)),
      AaveV2EthereumAssets.RAI_UNDERLYING,
      address(AaveV2Ethereum.COLLECTOR),
      'Aave interest bearing RAI',
      'aRAI',
      AaveV2Ethereum.DEFAULT_INCENTIVES_CONTROLLER
    );
    V2AToken usdtAToken = new V2AToken(
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
  }
}

interface IOwnable {
  function transferOwnership(address newOwner) external;
}
