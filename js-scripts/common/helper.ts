import {ChainId} from '@aave/contract-helpers';
import {AaveMarket, ContractType, JSON_RPC_PROVIDER, amountsFilePath} from '../common/constants';
import {fetchLabel} from '../label-map';
import {BigNumber as BN} from 'bignumber.js';
import {ethers, BigNumber, providers} from 'ethers';
import {getPastLogs} from '../query-logs';
import TOKENS_TO_IGNORE from '../assets/tokensToIgnore.json';
import fs from 'fs';

async function getContractCreationBlock(
  contractAddress: string,
  provider: providers.StaticJsonRpcProvider,
  network: keyof typeof JSON_RPC_PROVIDER
): Promise<number> {
  const MAX_NB_RETRY = 10;
  const RETRY_DELAY_MS = 2000;
  let retryLeft = MAX_NB_RETRY;

  while (retryLeft > 0) {
    try {
      let response: Response;
      if (network === ChainId.mainnet) {
        response = await fetch(
          `https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY_ETHEREUM}`
        );
      } else if (network === ChainId.polygon) {
        response = await fetch(
          `https://api.polygonscan.com/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY_POLYGON}`
        );
      } else if (network === ChainId.arbitrum_one) {
        response = await fetch(
          `https://api.arbiscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY_ARBITRUM}`
        );
      } else if (network === ChainId.optimism) {
        response = await fetch(
          `https://api-optimistic.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY_OPTIMISM}`
        );
      } else if (network === ChainId.fantom) {
        response = await fetch(
          `https://api.ftmscan.com/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY_FANTOM}`
        );
      } else if (network === ChainId.avalanche) {
        response = await fetch(
          `https://api.snowtrace.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY_AVALANCHE}`
        );
      } else {
        throw Error('Invalid Network');
      }

      const txHash = (await response.json()).result[0].txHash;
      if (txHash === undefined) throw Error();
      const receipt = await provider.getTransactionReceipt(txHash);
      return receipt.blockNumber;
    } catch (err) {
      await sleep(RETRY_DELAY_MS);
    } finally {
      retryLeft -= 1;
    }
  }
  return 0;
}

async function generateAndSaveMap(
  mappedContracts: Record<string, {amount: string; txHash: string[]}>[],
  name: string,
  network: string
): Promise<void> {
  const aggregatedMapping: Record<string, {amount: string; txns: string[]; label?: string}> = {};
  const labels = require('../labels/labels.json');

  for (let mappedContract of mappedContracts) {
    for (let address of Object.keys(mappedContract)) {
      if (address === ethers.constants.AddressZero) continue;
      if (aggregatedMapping[address]) {
        const aggregatedValue = BigNumber.from(mappedContract[address].amount.toString())
          .add(aggregatedMapping[address].amount)
          .toString();
        aggregatedMapping[address].amount = aggregatedValue;
        aggregatedMapping[address].txns = [
          ...aggregatedMapping[address].txns,
          ...mappedContract[address].txHash,
        ];
      } else {
        aggregatedMapping[address] = {} as any;
        aggregatedMapping[address].amount = mappedContract[address].amount.toString();
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

async function fetchTxns(
  token: string,
  to: string,
  network: keyof typeof JSON_RPC_PROVIDER,
  name: string,
  toType: ContractType,
  aaveMarket: AaveMarket
): Promise<Record<string, {amount: string; txHash: string[]}>> {
  const provider = new providers.StaticJsonRpcProvider(JSON_RPC_PROVIDER[network]);

  const fromBlockNumber = await getContractCreationBlock(to, provider, network);
  const currentBlockNumber = await provider.getBlockNumber();

  const events = await getPastLogs(
    fromBlockNumber,
    currentBlockNumber,
    token,
    to,
    network,
    provider,
    toType,
    aaveMarket
  );

  // Write events map of address value to json
  const addressValueMap: Record<string, {amount: string; txHash: string[]}> = {};
  let totalValue = BigNumber.from(0);
  let latestBlockNumber = 0;

  for (let e of events) {
    if (e) {
      let value = BigNumber.from(e.data);
      if (value.gt(0)) {
        if (e.block_number >= latestBlockNumber) {
          latestBlockNumber = e.block_number;
        }

        const txReceipt = await provider.getTransactionReceipt(e.tx_hash);
        if (txReceipt.from === ethers.constants.AddressZero) continue;
        totalValue = totalValue.add(value);
        if (addressValueMap[txReceipt.from]) {
          const aggregatedValue = value.add(addressValueMap[txReceipt.from].amount).toString();
          addressValueMap[txReceipt.from].amount = aggregatedValue;
          addressValueMap[txReceipt.from].txHash.push(e.tx_hash);
        } else {
          addressValueMap[txReceipt.from] = {
            amount: value.toString(),
            txHash: [e.tx_hash],
          };
        }
      }
    }
  }
  console.log('totalValue ', totalValue.toString());

  // write total amount on txt
  if (totalValue.gt(0)) {
    const totalValueInDecimals = await convertWeiToTokenDecimal(provider, totalValue, token);

    // tag assets where total transfers are worth less than $1000 and ignore them
    if (!TOKENS_TO_IGNORE.find((asset) => asset.name === name && asset.chainId === network)) {
      fs.appendFileSync(
        amountsFilePath,
        `total amount for ${name} chainId: ${network} in token decimals: ${totalValueInDecimals} latestBlock: ${latestBlockNumber} isBeingRescued: true \r\n`
      );
      return addressValueMap;
    }
    fs.appendFileSync(
      amountsFilePath,
      `total amount for ${name} chainId: ${network} in token decimals: ${totalValueInDecimals} latestBlock: ${latestBlockNumber} isBeingRescued: false \r\n`
    );
  }

  return {};
}

function sleep(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function getTokenDecimals(
  provider: providers.StaticJsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const tokenAbi = ['function decimals() view returns (uint256)'];
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
  const data: BigNumber = await tokenContract.decimals();
  return data.toNumber();
}

async function convertWeiToTokenDecimal(
  provider: providers.StaticJsonRpcProvider,
  tokenAmount: ethers.BigNumber,
  tokenAddress: string
): Promise<string> {
  const tokenAmountBN = new BN(tokenAmount.toString());
  const decimals = await getTokenDecimals(provider, tokenAddress);
  const tokenAmountWhole = tokenAmountBN.dividedBy(new BN(10).pow(decimals));
  return tokenAmountWhole.toString();
}

function getNetworkName(network: keyof typeof JSON_RPC_PROVIDER): string {
  if (network == ChainId.mainnet) {
    return 'ethereum';
  } else if (network == ChainId.polygon) {
    return 'polygon';
  } else if (network == ChainId.arbitrum_one) {
    return 'arbitrum';
  } else if (network == ChainId.optimism) {
    return 'optimism';
  } else if (network == ChainId.fantom) {
    return 'fantom';
  } else if (network == ChainId.avalanche) {
    return 'avalanche';
  } else {
    throw Error('Invalid network');
  }
}

export {generateAndSaveMap, fetchTxns, sleep, getTokenDecimals, getNetworkName};
