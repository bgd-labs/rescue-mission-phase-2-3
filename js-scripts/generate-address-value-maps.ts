import { BigNumber, Event, providers } from 'ethers';
import fs from 'fs';
import { ChainId } from '@aave/contract-helpers';
import { fetchLabel, wait } from './label-map';
import { AaveV2Avalanche, AaveV2Ethereum, AaveV2EthereumAMM, AaveV2Polygon, AaveV3Arbitrum, AaveV3Avalanche, AaveV3Ethereum, AaveV3Fantom, AaveV3Harmony, AaveV3Optimism, AaveV3Polygon } from "@bgd-labs/aave-address-book";
import { IERC20__factory } from './typechain/IERC20__factory';
import { LendingPoolFactory } from './typechain/LendingPoolFactory';
import { L2Pool__factory } from './typechain/L2Pool__factory';
import { L2Pool } from './typechain/L2Pool';
import { Pool } from './typechain/Pool';
import { Pool__factory } from './typechain/Pool__factory';
import { LendingPool } from './typechain/LendingPool';
import TOKENS_ETH from './assets/ethTokens.json';
import TOKENS_POL from './assets/polTokens.json';
import TOKENS_AVA from './assets/avaTokens.json';
import TOKENS_OPT from './assets/optTokens.json';
import TOKENS_ARB from './assets/arbTokens.json';
import TOKENS_HAR from './assets/harTokens.json';
import TOKENS_FAN from './assets/fanTokens.json';
import V2_ETH_A_TOKENS from './assets/v2EthATokens.json';
import V2_POL_A_TOKENS from './assets/v2PolATokens.json';
import V2_AVA_A_TOKENS from './assets/v2AvaATokens.json';
import V2AMM_ETH_A_TOKENS from './assets/v2AmmATokens.json';
import V3_ETH_A_TOKENS from './assets/v3EthATokens.json';
import V3_POL_A_TOKENS from './assets/v2PolATokens.json';
import V3_AVA_A_TOKENS from './assets/v3AvaATokens.json';
import V3_OPT_A_TOKENS from './assets/v3OptATokens.json';
import V3_ARB_A_TOKENS from './assets/v3ArbATokens.json';
import V3_HAR_A_TOKENS from './assets/v3HarATokens.json';
import V3_FAN_A_TOKENS from './assets/v3FanATokens.json';
const amountsFilePath = `./js-scripts/maps/amountsByContract.txt`;

const JSON_RPC_PROVIDER = {
  [ChainId.mainnet]: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.polygon]: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.optimism]: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.arbitrum_one]: `https://arbitrum-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.avalanche]: process.env.RPC_AVALANCHE,
  [ChainId.harmony]: process.env.RPC_HARMONY,
  [ChainId.fantom]: process.env.RPC_FANTOM,
};

enum AaveMarket { v1, v2, v2Amm, v3 };

async function fetchTxns(
  token: string,
  to: string,
  network: keyof typeof JSON_RPC_PROVIDER,
  name: string,
  isAToken?: boolean,
  aTokenMarket?: AaveMarket,
  validateEvent?: (events: Event[], network: keyof typeof JSON_RPC_PROVIDER) => Promise<Event[]>,
): Promise<Record<string, { amount: string; txHash: string[] }>> {
  const provider = new providers.StaticJsonRpcProvider(
    JSON_RPC_PROVIDER[network],
  );
  const contract = IERC20__factory.connect(token, provider);
  const event = contract.filters.Transfer(null, to);

  async function getPastLogs(
    fromBlock: number,
    toBlock: number,
  ): Promise<Event[]> {
    console.log(`fromBlock: ${fromBlock} toBlock: ${toBlock}`);
    if (fromBlock <= toBlock) {
      try {
        const events = await contract.queryFilter(event, fromBlock, toBlock);
        return isAToken ? await filterEvents(events, fromBlock, toBlock) : events;
      } catch (error) {
        // @ts-expect-error
        if (error.error?.message?.indexOf('[') > -1) {
          // alchemy specific solution, that optimizes, taking into account
          // alchemy error information
          // @ts-expect-error
          const { 0: newFromBlock, 1: newToBlock } = error.error.message
            .split('[')[1]
            .split(']')[0]
            .split(', ');

          console.log(
            contract.address,
            ' Error code: ',
            // @ts-expect-error
            error.error?.code,
            ' fromBloc: ',
            Number(newFromBlock),
            ' toBlock: ',
            Number(newToBlock),
          );

          const arr1 = await getPastLogs(
            Number(newFromBlock),
            Number(newToBlock),
          );
          const arr2 = await getPastLogs(Number(newToBlock) + 1, toBlock);
          return [...arr1, ...arr2];
        } else {
          // solution that will work with generic rpcs or
          // if alchemy fails with different error
          const midBlock = (fromBlock + toBlock) >> 1;
          const arr1 = await getPastLogs(fromBlock, midBlock);
          const arr2 = await getPastLogs(midBlock + 1, toBlock);
          return [...arr1, ...arr2];
        }
      }
    }
    return [];
  }

  async function getV3ATokensEventsToFilterOut(fromBlock: number, toBlock: number): Promise<Event[]> {
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
      case ChainId.harmony:
        v3PoolContract = L2Pool__factory.connect(AaveV3Harmony.POOL, provider);
        break;
      case ChainId.fantom:
        v3PoolContract = L2Pool__factory.connect(AaveV3Fantom.POOL, provider);
        break;
      default:
        throw Error(`Invalid network for v3 market. network: ${network}`);
    }
    const repayEvent = v3PoolContract.filters.Repay(getUnderlyingToken(to), null, null, null);
    const supplyEvent = v3PoolContract.filters.Supply(getUnderlyingToken(to), null, null, null, null);
    const liqCallEvent = v3PoolContract.filters.LiquidationCall(null, getUnderlyingToken(to), null, null, null, null, null);
    const flashloanEvent = v3PoolContract.filters.FlashLoan(null, null, getUnderlyingToken(to), null, null, null);

    const repayEvents = await v3PoolContract.queryFilter(repayEvent, fromBlock, toBlock);
    const supplyEvents = await v3PoolContract.queryFilter(supplyEvent, fromBlock, toBlock);
    const liqCallEvents = await v3PoolContract.queryFilter(liqCallEvent, fromBlock, toBlock);
    const flashloanEvents = await v3PoolContract.queryFilter(flashloanEvent, fromBlock, toBlock);
    return [...repayEvents, ...supplyEvents, ...liqCallEvents, ...flashloanEvents];
  }

  async function getV2ATokensEventsToFilterOut(fromBlock: number, toBlock: number, isAmm?: boolean): Promise<Event[]> {
    let v2PoolContract: LendingPool;
    switch (network) {
      case ChainId.mainnet:
        v2PoolContract = isAmm ?
          v2PoolContract = LendingPoolFactory.connect(AaveV2EthereumAMM.POOL, provider) :
          v2PoolContract = LendingPoolFactory.connect(AaveV2Ethereum.POOL, provider);
        break;
      case ChainId.polygon:
        v2PoolContract = LendingPoolFactory.connect(AaveV2Polygon.POOL, provider);
        break;
      case ChainId.avalanche:
        v2PoolContract = LendingPoolFactory.connect(AaveV2Avalanche.POOL, provider);
        break;
      default:
        throw Error(`Invalid network for v2 market. network: ${network}`);
    }
    const repayEvent = v2PoolContract.filters.Repay(getUnderlyingToken(to), null, null, null);
    const supplyEvent = v2PoolContract.filters.Deposit(getUnderlyingToken(to), null, null, null, null);
    const liqCallEvent = v2PoolContract.filters.LiquidationCall(null, getUnderlyingToken(to), null, null, null, null, null);
    const flashloanEvent = v2PoolContract.filters.FlashLoan(null, null, getUnderlyingToken(to), null, null, null);

    const repayEvents = await v2PoolContract.queryFilter(repayEvent, fromBlock, toBlock);
    const supplyEvents = await v2PoolContract.queryFilter(supplyEvent, fromBlock, toBlock);
    const liqCallEvents = await v2PoolContract.queryFilter(liqCallEvent, fromBlock, toBlock);
    const flashloanEvents = await v2PoolContract.queryFilter(flashloanEvent, fromBlock, toBlock);
    return [...repayEvents, ...supplyEvents, ...liqCallEvents, ...flashloanEvents];
  }

  // TODO: Add more markets
  async function getEventsToFilterOut(fromBlock: number, toBlock: number): Promise<Event[]> {
    if (isAToken) {
      switch (aTokenMarket) {
        case AaveMarket.v2:
          return await getV2ATokensEventsToFilterOut(fromBlock, toBlock);
        case AaveMarket.v2Amm:
          return await getV2ATokensEventsToFilterOut(fromBlock, toBlock, true);
        case AaveMarket.v3:
          return await getV3ATokensEventsToFilterOut(fromBlock, toBlock);
        default:
          throw Error('Invalid Aave market for the aToken');
      }
    }
    return [];
  }

  // TODO: Add more markets
  function getUnderlyingToken(aToken: string): string {
    if (network == ChainId.mainnet && aTokenMarket == AaveMarket.v2) {
      const tokenSymbol = Object.keys(V2_ETH_A_TOKENS).find(key => V2_ETH_A_TOKENS[key as keyof typeof V2_ETH_A_TOKENS] === aToken);
      return TOKENS_ETH[tokenSymbol as keyof typeof TOKENS_ETH];
    } else if (network == ChainId.mainnet && aTokenMarket == AaveMarket.v3) {
      const tokenSymbol = Object.keys(V3_ETH_A_TOKENS).find(key => V3_ETH_A_TOKENS[key as keyof typeof V3_ETH_A_TOKENS] === aToken);
      return TOKENS_ETH[tokenSymbol as keyof typeof TOKENS_ETH];
    } else if (network == ChainId.mainnet && aTokenMarket == AaveMarket.v2Amm) {
      const tokenSymbol = Object.keys(V2AMM_ETH_A_TOKENS).find(key => V2AMM_ETH_A_TOKENS[key as keyof typeof V2AMM_ETH_A_TOKENS] === aToken);
      return TOKENS_ETH[tokenSymbol as keyof typeof TOKENS_ETH];
    } else if (network == ChainId.polygon && aTokenMarket == AaveMarket.v2) {
      const tokenSymbol = Object.keys(V2_POL_A_TOKENS).find(key => V2_POL_A_TOKENS[key as keyof typeof V2_POL_A_TOKENS] === aToken);
      return TOKENS_POL[tokenSymbol as keyof typeof TOKENS_POL];
    } else if (network == ChainId.polygon && aTokenMarket == AaveMarket.v3) {
      const tokenSymbol = Object.keys(V3_POL_A_TOKENS).find(key => V3_POL_A_TOKENS[key as keyof typeof V3_POL_A_TOKENS] === aToken);
      return TOKENS_POL[tokenSymbol as keyof typeof TOKENS_POL];
    } else if (network == ChainId.avalanche && aTokenMarket == AaveMarket.v2) {
      const tokenSymbol = Object.keys(V2_AVA_A_TOKENS).find(key => V2_AVA_A_TOKENS[key as keyof typeof V2_AVA_A_TOKENS] === aToken);
      return TOKENS_AVA[tokenSymbol as keyof typeof TOKENS_AVA];
    } else if (network == ChainId.avalanche && aTokenMarket == AaveMarket.v3) {
      const tokenSymbol = Object.keys(V3_AVA_A_TOKENS).find(key => V3_AVA_A_TOKENS[key as keyof typeof V3_AVA_A_TOKENS] === aToken);
      return TOKENS_AVA[tokenSymbol as keyof typeof TOKENS_AVA];
    } else if (network == ChainId.optimism && aTokenMarket == AaveMarket.v3) {
      const tokenSymbol = Object.keys(V3_OPT_A_TOKENS).find(key => V3_OPT_A_TOKENS[key as keyof typeof V3_OPT_A_TOKENS] === aToken);
      return TOKENS_OPT[tokenSymbol as keyof typeof TOKENS_OPT];
    } else if (network == ChainId.arbitrum_one && aTokenMarket == AaveMarket.v3) {
      const tokenSymbol = Object.keys(V3_ARB_A_TOKENS).find(key => V3_ARB_A_TOKENS[key as keyof typeof V3_ARB_A_TOKENS] === aToken);
      return TOKENS_ARB[tokenSymbol as keyof typeof TOKENS_ARB];
    } else if (network == ChainId.harmony && aTokenMarket == AaveMarket.v3) {
      const tokenSymbol = Object.keys(V3_HAR_A_TOKENS).find(key => V3_HAR_A_TOKENS[key as keyof typeof V3_HAR_A_TOKENS] === aToken);
      return TOKENS_HAR[tokenSymbol as keyof typeof TOKENS_HAR];
    } else if (network == ChainId.fantom && aTokenMarket == AaveMarket.v3) {
      const tokenSymbol = Object.keys(V3_FAN_A_TOKENS).find(key => V3_FAN_A_TOKENS[key as keyof typeof V3_FAN_A_TOKENS] === aToken);
      return TOKENS_FAN[tokenSymbol as keyof typeof TOKENS_FAN];
    }
    throw Error('Unable to find the underlying token for the aToken');
  }

  async function filterEvents(events: Event[], fromBlock: number, toBlock: number): Promise<Event[]> {
    try {
      if (events.length == 0) return events;
      const eventsToFilter = await getEventsToFilterOut(fromBlock, toBlock);
      const filteredEvents = events.filter((event) => !eventsToFilter.some((poolEvents) => poolEvents.transactionHash === event.transactionHash));
      console.log('filtered events', filteredEvents);
      return filteredEvents as Event[];
    } catch (error) {
      console.log('error in filtering', error);
      throw(error);
    }
  }

  const currentBlockNumber = await provider.getBlockNumber();
  let events = await getPastLogs(0, currentBlockNumber);
  if (validateEvent) events = await validateEvent(events, network);

  // Write events map of address value to json
  const addressValueMap: Record<string, { amount: string; txHash: string[] }> =
    {};
  let totalValue = BigNumber.from(0);
  let latestBlockNumber = 0;
  events.forEach((e: Event) => {
    if (e.args) {
      let value = BigNumber.from(e.args.value.toString());
      if (value.gt(0)) {
        if (e.blockNumber >= latestBlockNumber) {
          latestBlockNumber = e.blockNumber;
        }

        totalValue = totalValue.add(value);
        if (addressValueMap[e.args.from]) {
          const aggregatedValue = value
            .add(addressValueMap[e.args.from].amount)
            .toString();
          addressValueMap[e.args.from].amount = aggregatedValue;
          addressValueMap[e.args.from].txHash.push(e.transactionHash);
        } else {
          addressValueMap[e.args.from] = {
            amount: value.toString(),
            txHash: [e.transactionHash],
          };
        }
      }
    }
  });

  // write total amount on txt
  if (totalValue.gt(0)) {
    fs.appendFileSync(
      amountsFilePath,
      `total amount for ${name} chainId: ${network} in wei: ${totalValue} latestBlock: ${latestBlockNumber}\r\n`,
    );
  }
  return addressValueMap;
}

async function retryTillSuccess(
  provider: providers.Provider,
  event: Event,
  fn: (
    event: Event,
    provider: providers.Provider,
  ) => Promise<Event | undefined>,
): Promise<Event | undefined> {
  try {
    return fn(event, provider);
  } catch (e) {
    await wait(0.3);
    console.log('retrying');
    return retryTillSuccess(provider, event, fn);
  }
}

async function generateAndSaveMap(
  mappedContracts: Record<string, { amount: string; txHash: string[] }>[],
  name: string,
): Promise<void> {
  const aggregatedMapping: Record<
    string,
    { amount: string; txns: string[]; label?: string }
  > = {};
  const labels = require('./labels/labels.json');

  for (let mappedContract of mappedContracts) {
    for (let address of Object.keys(mappedContract)) {
      if (aggregatedMapping[address]) {
        const aggregatedValue = BigNumber.from(
          mappedContract[address].amount.toString(),
        )
          .add(aggregatedMapping[address].amount)
          .toString();
        aggregatedMapping[address].amount = aggregatedValue;
        aggregatedMapping[address].txns = [
          ...aggregatedMapping[address].txns,
          ...mappedContract[address].txHash,
        ];
      } else {
        aggregatedMapping[address] = {} as any;
        aggregatedMapping[address].amount =
          mappedContract[address].amount.toString();
        aggregatedMapping[address].txns = [...mappedContract[address].txHash];
        const label = await fetchLabel(address, labels);
        if (label) {
          aggregatedMapping[address].label = label;
        }
      }
    }
  }

  const path = `./js-scripts/maps/${name}RescueMap.json`;
  if (Object.keys(aggregatedMapping).length > 0) {
    fs.writeFileSync(path, JSON.stringify(aggregatedMapping, null, 2));
  }
}

async function generateEthTokensMap() {
  const tokenList = Object.entries(TOKENS_ETH);

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v2AmmAToken = V2AMM_ETH_A_TOKENS[tokenName as keyof typeof V2AMM_ETH_A_TOKENS];
      const v2AToken = V2_ETH_A_TOKENS[tokenName as keyof typeof V2_ETH_A_TOKENS];
      const v3AToken = V3_ETH_A_TOKENS[tokenName as keyof typeof V3_ETH_A_TOKENS];

      // rescue aRAI sent to aRAI contract
      if (tokenName == 'RAI') {
        const mappedContracts: Record<string,{ amount: string; txHash: string[] }>[] =
        await Promise.all([
          fetchTxns(
            v2AToken,
            v2AToken,
            ChainId.mainnet,
            `v2a${tokenName}-v2a${tokenName}`,
            true,
            AaveMarket.v2
          )
        ]);
        await generateAndSaveMap(mappedContracts, `ethereum_a${tokenName}`);
      }

      // rescue v2 and v3 tokens sent to v2 and v3 aToken contracts respectively
      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          v2AmmAToken ? fetchTxns(
            tokenAddress,
            v2AmmAToken,
            ChainId.mainnet,
            `v2${tokenName}-v2amm${tokenName}`,
            true,
            AaveMarket.v2Amm,
          ): {},
          v2AToken ? fetchTxns(
            tokenAddress,
            v2AToken,
            ChainId.mainnet,
            `v2${tokenName}-v2a${tokenName}`,
            true,
            AaveMarket.v2,
          ): {},
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.mainnet,
            `v3${tokenName}-v3a${tokenName}`,
            // validateATokenEvents
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, 'ethereum_' + tokenName.toLocaleLowerCase());
  });
}

async function generatePolTokensMap() {
  const tokenList = Object.entries(TOKENS_POL);

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v2AToken = V2_POL_A_TOKENS[tokenName as keyof typeof V2_POL_A_TOKENS];
      const v3AToken = V3_POL_A_TOKENS[tokenName as keyof typeof V3_POL_A_TOKENS];

      // rescue aUSDC aDAI sent to aUSDC and aDAI contracts respectively
      if (tokenName == 'USDC' || tokenName == 'DAI') {
        console.log('v2AToken', v2AToken);
        const mappedContracts: Record<string,{ amount: string; txHash: string[] }>[] =
        await Promise.all([
          fetchTxns(
            v2AToken,
            v2AToken,
            ChainId.polygon,
            `v2a${tokenName}-v2a${tokenName}`,
            true,
            AaveMarket.v2,
          )
        ]);
        await generateAndSaveMap(mappedContracts, `polygon_a${tokenName.toLocaleLowerCase()}`);
      }

      // rescue v2 and v3 tokens sent to v2 and v3 aToken contracts respectively
      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          v2AToken ? fetchTxns(
            tokenAddress,
            v2AToken,
            ChainId.polygon,
            `v2${tokenName}-v2a${tokenName}`,
            true,
            AaveMarket.v2
          ): {},
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.mainnet,
            `v3${tokenName}-v3a${tokenName}`,
            true,
            AaveMarket.v3
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, 'polygon_' + tokenName.toLocaleLowerCase());
  });
}

async function generateAvaTokensMap() {
  const tokenList = Object.entries(TOKENS_AVA);

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v2AToken = V2_AVA_A_TOKENS[tokenName as keyof typeof V2_AVA_A_TOKENS];
      const v3AToken = V3_AVA_A_TOKENS[tokenName as keyof typeof V3_AVA_A_TOKENS];

      // rescue v2 and v3 tokens sent to v2 and v3 aToken contracts respectively
      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          v2AToken ? fetchTxns(
            tokenAddress,
            v2AToken,
            ChainId.avalanche,
            `v2${tokenName}-v2a${tokenName}`,
            true,
            AaveMarket.v2
          ): {},
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.avalanche,
            `v3${tokenName}-v3a${tokenName}`,
            true,
            AaveMarket.v3
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, 'avalanche_' + tokenName.toLocaleLowerCase());
  });
}

async function generateOptTokensMap() {
  const tokenList = Object.entries(TOKENS_OPT);

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v3AToken = V3_OPT_A_TOKENS[tokenName as keyof typeof V3_OPT_A_TOKENS];

      // rescue v3 tokens sent to aToken contract
      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.optimism,
            `v3${tokenName}-v3a${tokenName}`,
            true,
            AaveMarket.v3
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, 'optimism_' + tokenName.toLocaleLowerCase());
  });
}

async function generateArbTokensMap() {
  const tokenList = Object.entries(TOKENS_ARB);

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v3AToken = V3_ARB_A_TOKENS[tokenName as keyof typeof V3_ARB_A_TOKENS];

      // rescue v3 tokens sent to aToken contract
      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.arbitrum_one,
            `v3${tokenName}-v3a${tokenName}`,
            true,
            AaveMarket.v3
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, 'arbitrum_' + tokenName.toLocaleLowerCase());
  });
}

async function generateHarTokensMap() {
  const tokenList = Object.entries(TOKENS_HAR);

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v3AToken = V3_HAR_A_TOKENS[tokenName as keyof typeof V3_HAR_A_TOKENS];

      // rescue v3 tokens sent to aToken contract
      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.harmony,
            `v3${tokenName}-v3a${tokenName}`,
            true,
            AaveMarket.v3
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, 'harmony_' + tokenName.toLocaleLowerCase());
  });
}

async function generateFanTokensMap() {
  const tokenList = Object.entries(TOKENS_FAN);

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v3AToken = V3_FAN_A_TOKENS[tokenName as keyof typeof V3_FAN_A_TOKENS];

      // rescue v3 tokens sent to aToken contract
      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.fantom,
            `v3${tokenName}-v3a${tokenName}`,
            true,
            AaveMarket.v3
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, 'fantom_' + tokenName.toLocaleLowerCase());
  });
}

// Phase 2
async function phase2() {
  fs.writeFileSync(amountsFilePath, '');
  await generateEthTokensMap();
  await generatePolTokensMap();
  await generateAvaTokensMap();
  await generateOptTokensMap();
  await generateArbTokensMap();
  await generateHarTokensMap();
  await generateFanTokensMap();
}

phase2().then(() => console.log('phase 2 all finished'));
