import {providers, ethers} from 'ethers';
import {ChainId} from '@aave/contract-helpers';
import {
  AaveV2Avalanche,
  AaveV2Ethereum,
  AaveV2EthereumAMM,
  AaveV2Polygon,
  AaveV3Arbitrum,
  AaveV3Avalanche,
  AaveV3Ethereum,
  AaveV3Fantom,
  AaveV3Optimism,
  AaveV3Polygon,
} from '@bgd-labs/aave-address-book';
import {
  JSON_RPC_PROVIDER,
  AAVE_V1_LENDING_POOL,
  AaveMarket,
  ContractType,
  PoolEvents,
} from '../js-scripts/common/constants';
import {IERC20__factory} from './typechain/IERC20__factory';
import {LendingPoolFactory as v2LendingPoolFactory} from './typechain/v2_LendingPool__factory';
import {LendingPool__factory as v1LendingPoolFactory} from './typechain/v1_LendingPool__factory';
import {L2Pool__factory} from './typechain/L2Pool__factory';
import {L2Pool} from './typechain/L2Pool';
import {Pool} from './typechain/Pool';
import {Pool__factory} from './typechain/Pool__factory';
import {LendingPool as v1LendingPool} from './typechain/v1_LendingPool';
import {LendingPool as v2LendingPool} from './typechain/v2_LendingPool';
import {sleep} from './common/helper';
import {QueryParameter, DuneClient, ExecutionState} from '@cowprotocol/ts-dune-client';

const MAX_REQUEST = 10;
let CURRENT_REQUEST_COUNT = 0;

export async function getPastLogs(
  fromBlock: number,
  toBlock: number,
  token: string,
  to: string,
  network: keyof typeof JSON_RPC_PROVIDER,
  provider: providers.StaticJsonRpcProvider,
  toType: ContractType,
  aaveMarket: AaveMarket
): Promise<{topic1: string; data: string; tx_hash: string; block_number: number}[]> {
  if (fromBlock <= toBlock) {
    try {
      const contract = IERC20__factory.connect(token, provider);
      const event = contract.filters.Transfer(null, to);
      const eventsToFilter = getEventsToFilterOut(provider, network, token, toType, aaveMarket);
      const client = new DuneClient(process.env.DUNE_API_KEY ?? '');
      const queryID = 2665038;
      let parameters = [
        QueryParameter.text('networkTable', getDuneNetworkTable(network)),
        QueryParameter.text('tokenAddress', event.address),
        QueryParameter.text('topic0', event.topics[0]),
        QueryParameter.text('topic2', event.topics[2]),
        QueryParameter.number('fromBlock', fromBlock),
        QueryParameter.number('toBlock', toBlock),
      ];
      if (eventsToFilter) {
        parameters = parameters.concat([
          QueryParameter.text('poolContract', eventsToFilter?.supplyEvent.address as string),

          // supply params
          QueryParameter.text('supplyTopic0', (eventsToFilter?.supplyEvent.topics as string[])[0]),
          QueryParameter.text('supplyTopic1', (eventsToFilter?.supplyEvent.topics as string[])[1]),

          // repay params
          QueryParameter.text('repayTopic0', (eventsToFilter?.repayEvent.topics as string[])[0]),
          QueryParameter.text('repayTopic1', (eventsToFilter?.repayEvent.topics as string[])[1]),

          // liquidation params
          QueryParameter.text(
            'liquidationTopic0',
            (eventsToFilter?.liqCallEvent.topics as string[])[0]
          ),
          QueryParameter.text(
            'liquidationTopic2',
            (eventsToFilter?.liqCallEvent.topics as string[])[2]
          ),

          // flashloan params
          QueryParameter.text(
            'flashloanTopic0',
            (eventsToFilter?.flashloanEvent.topics as string[])[0]
          ),
          QueryParameter.text(
            'flashloanTopic2',
            (eventsToFilter?.flashloanEvent.topics as string[])[2] ?? '0x'
          ),
          QueryParameter.text(
            'flashloanTopic3',
            (eventsToFilter?.flashloanEvent.topics as string[])[3] ?? '0x'
          ),
        ]);
      }

      CURRENT_REQUEST_COUNT = CURRENT_REQUEST_COUNT + 1;
      if (CURRENT_REQUEST_COUNT <= MAX_REQUEST) {
        await sleep(3500);
        const response = await client.execute(queryID, parameters);
        CURRENT_REQUEST_COUNT = CURRENT_REQUEST_COUNT - 1;
        return getDuneExecutionResult(client, response.execution_id);
      } else {
        CURRENT_REQUEST_COUNT = CURRENT_REQUEST_COUNT - 1;
        await sleep(100000);
        return getPastLogs(fromBlock, toBlock, token, to, network, provider, toType, aaveMarket);
      }
    } catch (error) {
      // @ts-expect-error
      if (error.message == 'too many requests') {
        CURRENT_REQUEST_COUNT = CURRENT_REQUEST_COUNT - 1;
        await sleep(100000);
        return getPastLogs(fromBlock, toBlock, token, to, network, provider, toType, aaveMarket);
      } else {
        throw error;
      }
    }
  }
  return [];
}

async function getDuneExecutionResult(
  client: DuneClient,
  executionId: string
): Promise<{topic1: string; data: string; tx_hash: string; block_number: number}[]> {
  try {
    const response = await client.getResult(executionId);
    if (response.state == ExecutionState.COMPLETED) {
      return response.result?.rows as {
        topic1: string;
        data: string;
        tx_hash: string;
        block_number: number;
      }[];
    } else {
      await sleep(45000);
      return getDuneExecutionResult(client, executionId);
    }
  } catch (error) {
    // @ts-expect-error
    if (error.message == 'too many requests') {
      await sleep(45000);
      return getDuneExecutionResult(client, executionId);
    } else {
      throw error;
    }
  }
}

function getDuneNetworkTable(network: keyof typeof JSON_RPC_PROVIDER) {
  switch (network) {
    case ChainId.mainnet:
      return 'ethereum.logs';
    case ChainId.polygon:
      return 'polygon.logs';
    case ChainId.avalanche:
      return 'avalanche_c.logs';
    case ChainId.optimism:
      return 'optimism.logs';
    case ChainId.arbitrum_one:
      return 'arbitrum.logs';
    case ChainId.fantom:
      return 'fantom.logs';
    default:
      throw Error(`Invalid network to get dune network table`);
  }
}

function getV3ATokensEventsToFilterOut(
  provider: providers.StaticJsonRpcProvider,
  network: keyof typeof JSON_RPC_PROVIDER,
  token: string
): PoolEvents {
  let v3PoolContract: Pool | L2Pool;
  switch (network) {
    case ChainId.mainnet:
      v3PoolContract = Pool__factory.connect(AaveV3Ethereum.POOL, provider);
      break;
    case ChainId.polygon:
      v3PoolContract = L2Pool__factory.connect(AaveV3Polygon.POOL, provider);
      break;
    case ChainId.avalanche:
      v3PoolContract = L2Pool__factory.connect(AaveV3Avalanche.POOL, provider);
      break;
    case ChainId.optimism:
      v3PoolContract = L2Pool__factory.connect(AaveV3Optimism.POOL, provider);
      break;
    case ChainId.arbitrum_one:
      v3PoolContract = L2Pool__factory.connect(AaveV3Arbitrum.POOL, provider);
      break;
    case ChainId.fantom:
      v3PoolContract = L2Pool__factory.connect(AaveV3Fantom.POOL, provider);
      break;
    default:
      throw Error(`Invalid network for v3 market. network: ${network}`);
  }
  const supplyEvent = v3PoolContract.filters.Supply(token, null, null, null, null);
  const repayEvent = v3PoolContract.filters.Repay(token, null, null, null);
  const liqCallEvent = v3PoolContract.filters.LiquidationCall(
    null,
    token,
    null,
    null,
    null,
    null,
    null
  );
  const flashloanEvent = v3PoolContract.filters.FlashLoan(null, null, token, null, null, null);
  return {supplyEvent, repayEvent, liqCallEvent, flashloanEvent};
}

function getV2ATokensEventsToFilterOut(
  provider: providers.StaticJsonRpcProvider,
  network: keyof typeof JSON_RPC_PROVIDER,
  token: string,
  isAmm?: boolean
): PoolEvents {
  let v2PoolContract: v2LendingPool;
  switch (network) {
    case ChainId.mainnet:
      v2PoolContract = isAmm
        ? (v2PoolContract = v2LendingPoolFactory.connect(AaveV2EthereumAMM.POOL, provider))
        : (v2PoolContract = v2LendingPoolFactory.connect(AaveV2Ethereum.POOL, provider));
      break;
    case ChainId.polygon:
      v2PoolContract = v2LendingPoolFactory.connect(AaveV2Polygon.POOL, provider);
      break;
    case ChainId.avalanche:
      v2PoolContract = v2LendingPoolFactory.connect(AaveV2Avalanche.POOL, provider);
      break;
    default:
      throw Error(`Invalid network for v2 market. network: ${network}`);
  }
  const repayEvent = v2PoolContract.filters.Repay(token, null, null, null);
  const supplyEvent = v2PoolContract.filters.Deposit(token, null, null, null, null);
  const liqCallEvent = v2PoolContract.filters.LiquidationCall(
    null,
    token,
    null,
    null,
    null,
    null,
    null
  );
  const flashloanEvent = v2PoolContract.filters.FlashLoan(null, null, token, null, null, null);
  return {repayEvent, supplyEvent, liqCallEvent, flashloanEvent};
}

function getV1PoolEventsToFilterOut(
  provider: providers.StaticJsonRpcProvider,
  token: string
): PoolEvents {
  let v1PoolCoreContract: v1LendingPool;
  v1PoolCoreContract = v1LendingPoolFactory.connect(AAVE_V1_LENDING_POOL, provider);
  const repayEvent = v1PoolCoreContract.filters.Repay(token, null, null, null);
  const supplyEvent = v1PoolCoreContract.filters.Deposit(token, null, null, null, null);
  const liqCallEvent = v1PoolCoreContract.filters.LiquidationCall(
    null,
    token,
    null,
    null,
    null,
    null,
    null
  );
  const flashloanEvent = v1PoolCoreContract.filters.FlashLoan(null, token, null, null, null, null);
  return {repayEvent, supplyEvent, liqCallEvent, flashloanEvent};
}

function getEventsToFilterOut(
  provider: providers.StaticJsonRpcProvider,
  network: keyof typeof JSON_RPC_PROVIDER,
  token: string,
  toType?: ContractType,
  aaveMarket?: AaveMarket
): PoolEvents | undefined {
  if (toType === ContractType.aToken || toType === ContractType.PoolCore) {
    switch (aaveMarket) {
      case AaveMarket.v1:
        return getV1PoolEventsToFilterOut(provider, token);
      case AaveMarket.v2:
        return getV2ATokensEventsToFilterOut(provider, network, token);
      case AaveMarket.v2Amm:
        return getV2ATokensEventsToFilterOut(provider, network, token, true);
      case AaveMarket.v3:
        return getV3ATokensEventsToFilterOut(provider, network, token);
      default:
        throw Error('Invalid Aave market for the aToken');
    }
  }
}
