import { BigNumber, Event, ethers, providers } from 'ethers';
import fs from 'fs';
import { ChainId } from '@aave/contract-helpers';
import { fetchLabel } from './label-map';
import { AaveV2Avalanche, AaveV2Ethereum, AaveV2EthereumAMM, AaveV2Polygon, AaveV3Arbitrum, AaveV3Avalanche, AaveV3Ethereum, AaveV3Fantom, AaveV3Harmony, AaveV3Optimism, AaveV3Polygon } from "@bgd-labs/aave-address-book";
import { JSON_RPC_PROVIDER, AAVE_V1_LENDING_POOL, AAVE_V1_LENDING_POOL_CORE, AaveMarket, ContractType, amountsFilePath } from '../js-scripts/common/constants';
import { IERC20__factory } from './typechain/IERC20__factory';
import { LendingPoolFactory as v2LendingPoolFactory } from './typechain/v2_LendingPool__factory';
import { LendingPool__factory as v1LendingPoolFactory } from './typechain/v1_LendingPool__factory';
import { L2Pool__factory } from './typechain/L2Pool__factory';
import { L2Pool } from './typechain/L2Pool';
import { Pool } from './typechain/Pool';
import { Pool__factory } from './typechain/Pool__factory';
import { LendingPool as v1LendingPool } from './typechain/v1_LendingPool';
import { LendingPool as v2LendingPool } from './typechain/v2_LendingPool';
import { getContractCreationBlock } from './common/helper';
import TOKENS_ETH from './assets/ethTokens.json';
import TOKENS_POL from './assets/polTokens.json';
import TOKENS_AVA from './assets/avaTokens.json';
import TOKENS_OPT from './assets/optTokens.json';
import TOKENS_ARB from './assets/arbTokens.json';
import TOKENS_HAR from './assets/harTokens.json';
import TOKENS_FAN from './assets/fanTokens.json';
import V1_ETH_A_TOKENS from './assets/v1EthATokens.json';
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

async function fetchTxns(
  token: string,
  to: string,
  network: keyof typeof JSON_RPC_PROVIDER,
  name: string,
  toType?: ContractType,
  aaveMarket?: AaveMarket,
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
        return await filterEvents(events, fromBlock, toBlock);
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
    const repayEvent = v3PoolContract.filters.Repay(token, null, null, null);
    const supplyEvent = v3PoolContract.filters.Supply(token, null, null, null, null);
    const liqCallEvent = v3PoolContract.filters.LiquidationCall(null, token, null, null, null, null, null);
    const flashloanEvent = v3PoolContract.filters.FlashLoan(null, null, token, null, null, null);

    const repayEvents = await v3PoolContract.queryFilter(repayEvent, fromBlock, toBlock);
    const supplyEvents = await v3PoolContract.queryFilter(supplyEvent, fromBlock, toBlock);
    const liqCallEvents = await v3PoolContract.queryFilter(liqCallEvent, fromBlock, toBlock);
    const flashloanEvents = await v3PoolContract.queryFilter(flashloanEvent, fromBlock, toBlock);
    return [...repayEvents, ...supplyEvents, ...liqCallEvents, ...flashloanEvents];
  }

  async function getV2ATokensEventsToFilterOut(fromBlock: number, toBlock: number, isAmm?: boolean): Promise<Event[]> {
    let v2PoolContract: v2LendingPool;
    switch (network) {
      case ChainId.mainnet:
        v2PoolContract = isAmm ?
          v2PoolContract = v2LendingPoolFactory.connect(AaveV2EthereumAMM.POOL, provider) :
          v2PoolContract = v2LendingPoolFactory.connect(AaveV2Ethereum.POOL, provider);
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
    const liqCallEvent = v2PoolContract.filters.LiquidationCall(null, token, null, null, null, null, null);
    const flashloanEvent = v2PoolContract.filters.FlashLoan(null, null, token, null, null, null);

    const repayEvents = await v2PoolContract.queryFilter(repayEvent, fromBlock, toBlock);
    const supplyEvents = await v2PoolContract.queryFilter(supplyEvent, fromBlock, toBlock);
    const liqCallEvents = await v2PoolContract.queryFilter(liqCallEvent, fromBlock, toBlock);
    const flashloanEvents = await v2PoolContract.queryFilter(flashloanEvent, fromBlock, toBlock);
    return [...repayEvents, ...supplyEvents, ...liqCallEvents, ...flashloanEvents];
  }

  async function getV1PoolEventsToFilterOut(fromBlock: number, toBlock: number): Promise<Event[]> {
    let v1PoolCoreContract: v1LendingPool;
    v1PoolCoreContract = v1LendingPoolFactory.connect(AAVE_V1_LENDING_POOL, provider);
    const repayEvent = v1PoolCoreContract.filters.Repay(token, null, null, null);
    const supplyEvent = v1PoolCoreContract.filters.Deposit(token, null, null, null, null);
    const liqCallEvent = v1PoolCoreContract.filters.LiquidationCall(null, token, null, null, null, null, null);
    const flashloanEvent = v1PoolCoreContract.filters.FlashLoan(null, token, null, null, null, null);

    const repayEvents = await v1PoolCoreContract.queryFilter(repayEvent, fromBlock, toBlock);
    const supplyEvents = await v1PoolCoreContract.queryFilter(supplyEvent, fromBlock, toBlock);
    const liqCallEvents = await v1PoolCoreContract.queryFilter(liqCallEvent, fromBlock, toBlock);
    const flashloanEvents = await v1PoolCoreContract.queryFilter(flashloanEvent, fromBlock, toBlock);
    return [...repayEvents, ...supplyEvents, ...liqCallEvents, ...flashloanEvents];
  }

  async function getEventsToFilterOut(fromBlock: number, toBlock: number): Promise<Event[]> {
    if (toType === ContractType.aToken || toType === ContractType.PoolCore) {
      switch (aaveMarket) {
        case AaveMarket.v1:
          return await getV1PoolEventsToFilterOut(fromBlock, toBlock);
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

  async function filterEvents(events: Event[], fromBlock: number, toBlock: number): Promise<Event[]> {
    try {
      if (events.length == 0 || (aaveMarket === AaveMarket.v1 && toType !== ContractType.PoolCore)) return events;
      const eventsToFilter = await getEventsToFilterOut(fromBlock, toBlock);
      const filteredEvents = events.filter((event) => !eventsToFilter.some((poolEvents) => poolEvents.transactionHash === event.transactionHash));
      console.log('filtered events', filteredEvents);
      return filteredEvents as Event[];
    } catch (error) {
      throw(error);
    }
  }

  const fromBlockNumber = await getContractCreationBlock(to, provider, network);
  const currentBlockNumber = await provider.getBlockNumber();
  let events = await getPastLogs(fromBlockNumber, currentBlockNumber);
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

async function generateAndSaveMap(
  mappedContracts: Record<string, { amount: string; txHash: string[] }>[],
  name: string,
  network: string,
): Promise<void> {
  const aggregatedMapping: Record<
    string,
    { amount: string; txns: string[]; label?: string }
  > = {};
  const labels = require('./labels/labels.json');

  for (let mappedContract of mappedContracts) {
    for (let address of Object.keys(mappedContract)) {
      if (address === ethers.constants.AddressZero) continue;
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

  const path = `./js-scripts/maps/${network}/${name}RescueMap.json`;
  if (Object.keys(aggregatedMapping).length > 0) {
    fs.writeFileSync(path, JSON.stringify(aggregatedMapping, null, 2));
  }
}

async function generateEthTokensMap() {
  const tokenList = Object.entries(TOKENS_ETH);
  const tokensStuckInV2Pool = [TOKENS_ETH.DAI, TOKENS_ETH.GUSD, TOKENS_ETH.USDC, TOKENS_ETH.HOT];
  const tokensStuckInV2AmmPool = [TOKENS_ETH.USDT];
  const tokensStuckInV1Pool = [TOKENS_ETH.LINK, V1_ETH_A_TOKENS.WBTC];

  // v2 aRAI token sent to v2 aRAI contract
  const aRaiMappedContracts: Record<string,{ amount: string; txHash: string[] }>[] =
  await Promise.all([
    fetchTxns(
      V2_ETH_A_TOKENS.RAI,
      V2_ETH_A_TOKENS.RAI,
      ChainId.mainnet,
      `v2aRAI-v2aRAI`,
      ContractType.aToken,
      AaveMarket.v2
    )
  ]);
  await generateAndSaveMap(aRaiMappedContracts, `v2_aRai`, 'ethereum');

  // v1 aDAI token sent to v1 aDAI contract
  const aDaiMappedContracts: Record<string,{ amount: string; txHash: string[] }>[] =
  await Promise.all([
    fetchTxns(
      V1_ETH_A_TOKENS.DAI,
      V1_ETH_A_TOKENS.DAI,
      ChainId.mainnet,
      `v1aDAI-v1aDAI`,
      ContractType.aToken,
      AaveMarket.v1
    )
  ]);
  await generateAndSaveMap(aDaiMappedContracts, `v1_aDai`, 'ethereum');

  // v1 aWBTC token sent to v1 Pool contract
  const aWbtcMappedContracts: Record<string,{ amount: string; txHash: string[] }>[] =
  await Promise.all([
    fetchTxns(
      V1_ETH_A_TOKENS.WBTC,
      AAVE_V1_LENDING_POOL,
      ChainId.mainnet,
      `v1aWBTC-v1Pool`,
      ContractType.Pool,
      AaveMarket.v1
    )
  ]);
  await generateAndSaveMap(aWbtcMappedContracts, `v1_aWbtc`, 'ethereum');

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const tokenStuckInV1Pool = tokensStuckInV1Pool.find((stuckToken) => stuckToken == tokenAddress);
      const tokenStuckInV2Pool = tokensStuckInV2Pool.find((stuckToken) => stuckToken == tokenAddress);
      const tokenStuckInV2AmmPool = tokensStuckInV2AmmPool.find((stuckToken) => stuckToken == tokenAddress);
      const v1AToken = V1_ETH_A_TOKENS[tokenName as keyof typeof V1_ETH_A_TOKENS];
      const v2AToken = V2_ETH_A_TOKENS[tokenName as keyof typeof V2_ETH_A_TOKENS];
      const v2AmmAToken = V2AMM_ETH_A_TOKENS[tokenName as keyof typeof V2AMM_ETH_A_TOKENS];
      const v3AToken = V3_ETH_A_TOKENS[tokenName as keyof typeof V3_ETH_A_TOKENS];

      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          // underlying token sent to eth v1 aToken contract
          v1AToken ? fetchTxns(
            tokenAddress,
            v1AToken,
            ChainId.mainnet,
            `${tokenName}-v1Pool`,
            ContractType.Pool,
            AaveMarket.v1
          ): {},
          // underlying token sent to eth v2 amm aToken contract
          v2AmmAToken ? fetchTxns(
            tokenAddress,
            v2AmmAToken,
            ChainId.mainnet,
            `${tokenName}-v2amm${tokenName}`,
            ContractType.aToken,
            AaveMarket.v2Amm,
          ): {},
          // underlying token sent to eth v2 aToken contract
          v2AToken ? fetchTxns(
            tokenAddress,
            v2AToken,
            ChainId.mainnet,
            `${tokenName}-v2a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v2,
          ): {},
          // underlying token sent to eth v3 aToken contract
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.mainnet,
            `${tokenName}-v3a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v3
            // validateATokenEvents
          ): {},
          // tokens sent to eth v2 pool contract
          tokenStuckInV2Pool ? fetchTxns(
            tokenAddress,
            AaveV2Ethereum.POOL,
            ChainId.mainnet,
            `${tokenName}-v2Pool`,
            ContractType.Pool,
            AaveMarket.v2
          ): {},
          // tokens sent to eth v2 amm pool contract
          tokenStuckInV2AmmPool ? fetchTxns(
            tokenAddress,
            AaveV2EthereumAMM.POOL,
            ChainId.mainnet,
            `${tokenName}-v2AmmPool`,
            ContractType.Pool,
            AaveMarket.v2
          ): {},
          // tokens sent to eth v1 pool contract
          tokenStuckInV1Pool ? fetchTxns(
            tokenAddress,
            AAVE_V1_LENDING_POOL,
            ChainId.mainnet,
            `${tokenName}-v1Pool`,
            ContractType.Pool,
            AaveMarket.v1
          ): {},
          // tokens sent to eth v1 pool core contract
          v1AToken ? fetchTxns(
            tokenAddress,
            AAVE_V1_LENDING_POOL_CORE,
            ChainId.mainnet,
            `${tokenName}-v1Pool`,
            ContractType.PoolCore,
            AaveMarket.v1
          ): {},
        ]);
      await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'ethereum');
  });
}

async function generatePolTokensMap() {
  const tokenList = Object.entries(TOKENS_POL);
  const tokensStuckInV2Pool = [TOKENS_POL.WBTC, TOKENS_POL.USDC];

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v2AToken = V2_POL_A_TOKENS[tokenName as keyof typeof V2_POL_A_TOKENS];
      const v3AToken = V3_POL_A_TOKENS[tokenName as keyof typeof V3_POL_A_TOKENS];
      const tokenStuckInV2Pool = tokensStuckInV2Pool.find((stuckToken) => stuckToken == tokenAddress);

      // v2 aUSDC v2 aDAI tokens sent to v2 aUSDC and v2 aDAI contracts respectively
      if (tokenName == 'USDC' || tokenName == 'DAI') {
        const mappedContracts: Record<string,{ amount: string; txHash: string[] }>[] =
        await Promise.all([
          fetchTxns(
            v2AToken,
            v2AToken,
            ChainId.polygon,
            `v2a${tokenName}-v2a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v2,
          )
        ]);
        await generateAndSaveMap(mappedContracts, `v2_a${tokenName.toLocaleLowerCase()}`, 'polygon');
      }

      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          // underlying token sent to pol v2 aToken contract
          v2AToken ? fetchTxns(
            tokenAddress,
            v2AToken,
            ChainId.polygon,
            `${tokenName}-v2a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v2
          ): {},
          // underlying token sent to pol v3 aToken contract
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.polygon,
            `${tokenName}-v3a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v3
          ): {},
          // tokens sent to pol v2 pool contract
          tokenStuckInV2Pool ? fetchTxns(
            tokenAddress,
            AaveV2Polygon.POOL,
            ChainId.polygon,
            `${tokenName}-v2Pool`,
            ContractType.Pool,
            AaveMarket.v2
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'polygon');
  });
}

async function generateAvaTokensMap() {
  const tokenList = Object.entries(TOKENS_AVA);
  const tokensStuckInV2Pool = [TOKENS_AVA.USDC, TOKENS_AVA.USDT];

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v2AToken = V2_AVA_A_TOKENS[tokenName as keyof typeof V2_AVA_A_TOKENS];
      const v3AToken = V3_AVA_A_TOKENS[tokenName as keyof typeof V3_AVA_A_TOKENS];
      const tokenStuckInV2Pool = tokensStuckInV2Pool.find((stuckToken) => stuckToken == tokenAddress);

      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          // underlying token sent to ava v2 aToken contract
          v2AToken ? fetchTxns(
            tokenAddress,
            v2AToken,
            ChainId.avalanche,
            `${tokenName}-v2a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v2
          ): {},
          // underlying token sent to ava v3 aToken contract
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.avalanche,
            `${tokenName}-v3a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v3
          ): {},
          // tokens sent to ava v2 pool contract
          tokenStuckInV2Pool ? fetchTxns(
            tokenAddress,
            AaveV2Avalanche.POOL,
            ChainId.avalanche,
            `${tokenName}-v2Pool`,
            ContractType.Pool,
            AaveMarket.v2
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'avalanche');
  });
}

async function generateOptTokensMap() {
  const tokenList = Object.entries(TOKENS_OPT);

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v3AToken = V3_OPT_A_TOKENS[tokenName as keyof typeof V3_OPT_A_TOKENS];

      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          // underlying token sent to opt v3 aToken contract
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.optimism,
            `v3${tokenName}-v3a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v3
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'optimism');
  });
}

async function generateArbTokensMap() {
  const tokenList = Object.entries(TOKENS_ARB);

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v3AToken = V3_ARB_A_TOKENS[tokenName as keyof typeof V3_ARB_A_TOKENS];

      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          // underlying token sent to arb v3 aToken contract
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.arbitrum_one,
            `v3${tokenName}-v3a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v3
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'arbitrum');
  });
}

async function generateHarTokensMap() {
  const tokenList = Object.entries(TOKENS_HAR);

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v3AToken = V3_HAR_A_TOKENS[tokenName as keyof typeof V3_HAR_A_TOKENS];

      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          // underlying token sent to har v3 aToken contract
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.harmony,
            `v3${tokenName}-v3a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v3
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'harmony');
  });
}

async function generateFanTokensMap() {
  const tokenList = Object.entries(TOKENS_FAN);

  tokenList.forEach(async (token) => {
      const tokenName = token[0];
      const tokenAddress = token[1];
      const v3AToken = V3_FAN_A_TOKENS[tokenName as keyof typeof V3_FAN_A_TOKENS];

      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          // underlying token sent to fan v3 aToken contract
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.fantom,
            `v3${tokenName}-v3a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v3
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'fantom');
  });
}

// Phase 2
async function phase2() {
  fs.writeFileSync(amountsFilePath, '');
  const network = parseInt(process.env.network as string) as ChainId;
  if (network === ChainId.mainnet) await generateEthTokensMap()
  else if (network === ChainId.polygon) await generatePolTokensMap()
  else if (network === ChainId.avalanche) await generateAvaTokensMap()
  else if (network === ChainId.arbitrum_one) await generateArbTokensMap()
  else if (network === ChainId.optimism) await generateOptTokensMap()
  else if (network === ChainId.harmony) await generateHarTokensMap()
  else if (network === ChainId.fantom) await generateFanTokensMap()
}

phase2().then(() => console.log('phase 2 all finished'));
