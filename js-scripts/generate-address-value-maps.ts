import { BigNumber, Event, providers } from 'ethers';
import { IERC20__factory } from './typechain/IERC20__factory';
import fs from 'fs';
import { ChainId } from '@aave/contract-helpers';
import { PromisePool } from '@supercharge/promise-pool';
import { fetchLabel, wait } from './label-map';
import TOKENS_ETH from './assets/ethTokens.json';
import V2_A_TOKENS from './assets/v2ATokens.json';
import V3_A_TOKENS from './assets/v3ATokens.json';
const amountsFilePath = `./js-scripts/maps/amountsByContract.txt`;

const JSON_RPC_PROVIDER = {
  [ChainId.mainnet]: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
};

async function fetchTxns(
  token: string,
  to: string,
  network: keyof typeof JSON_RPC_PROVIDER,
  name: string,
  validateEvent?: (events: Event[]) => Promise<Event[]>,
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
        return events;
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

  const currentBlockNumber = await provider.getBlockNumber();
  let events = await getPastLogs(0, currentBlockNumber);
  if (validateEvent) events = await validateEvent(events);

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
        // if we are looking at LEND token rescue
        // we need to divide by 100 as users will get the rescue amount
        // in AAVE tokens
        if (token === TOKENS_ETH['LEND']) {
          value = BigNumber.from(e.args.value.toString()).div(100);
        }
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
      `total amount for ${name} in wei: ${totalValue} for token ${token} latestBlock: ${latestBlockNumber}\r\n`,
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

async function validateATokenEvents(events: Event[]): Promise<Event[]> {
  console.log('validate aToken events: ', events.length);
  async function validate(event: Event) {
    const txHash = event.transactionHash;
    const receipt = await provider.getTransactionReceipt(txHash);
    if (
      !receipt.logs.some((log) =>
        log.topics.includes(
          '0x4cdde6e09bb755c9a5589ebaec640bbfedff1362d4b255ebf8339782b9942faa', // v2 Repay topic
        ) ||
        log.topics.includes(
          '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f', // v2 Mint topic (we can keep supply topic as well)
        ) ||
        log.topics.includes(
          '0xe413a321e8681d831f4dbccbca790d2952b56f977908e45be37335533e005286', // v2 LiquidationCall topic
        ) ||
        log.topics.includes(
          '0x631042c832b07452973831137f2d73e395028b44b250dedc5abb0ee766e168ac', // v2 Flashloan topic
        ) ||
        log.topics.includes(
          '0xa534c8dbe71f871f9f3530e97a74601fea17b426cae02e1c5aee42c96c784051', // v3 Repay topic
        ) ||
        log.topics.includes(
          '0x2b627736bca15cd5381dcf80b0bf11fd197d01a037c52b927a881a10fb73ba61', // v3 Supply topic
        ) ||
        log.topics.includes(
          '0xefefaba5e921573100900a3ad9cf29f222d995fb3b6045797eaea7521bd8d6f0', // v3 Flashloan topic
        )
      )
    ) {
      return event;
    }
  }

  const provider = new providers.StaticJsonRpcProvider(process.env.RPC_MAINNET);
  const { results, errors } = await PromisePool.for(events)
    .withConcurrency(15)
    .process(async (event, ix) => {
      console.log(`validating ${ix}`);
      return retryTillSuccess(provider, event, validate);
    });

  const validTxns: Event[] = results.filter((r) => r !== undefined) as Event[];
  console.log('valid aToken tx: ', validTxns.length);
  return validTxns;
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
      const v2AToken = V2_A_TOKENS[tokenName as keyof typeof V2_A_TOKENS];
      const v3AToken = V3_A_TOKENS[tokenName as keyof typeof V3_A_TOKENS];

      if (tokenName == 'RAI') {
        const mappedContracts: Record<string,{ amount: string; txHash: string[] }>[] =
        await Promise.all([
          fetchTxns(
            v2AToken,
            v2AToken,
            ChainId.mainnet,
            'aRAI-aRAI',
            validateATokenEvents
          )
        ]);
        await generateAndSaveMap(mappedContracts, 'aRAI');
      }

      const mappedContracts: (Record<string,{ amount: string; txHash: string[] }>)[] =
        await Promise.all([
          v2AToken ? fetchTxns(
            tokenAddress,
            v2AToken,
            ChainId.mainnet,
            `v2${tokenName}-v2a${tokenName}`,
            validateATokenEvents
          ): {},
          v3AToken ? fetchTxns(
            tokenAddress,
            v3AToken,
            ChainId.mainnet,
            `v3${tokenName}-v3a${tokenName}`,
            validateATokenEvents
          ): {}
        ]);
      await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase());
  });
}

// Phase 2
async function phase2() {
  fs.writeFileSync(amountsFilePath, '');
  await generateEthTokensMap();
}

phase2().then(() => console.log('phase 2 all finished'));
