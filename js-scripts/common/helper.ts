import {ChainId} from '@aave/contract-helpers';
import {JSON_RPC_PROVIDER} from '../common/constants';
import {providers} from 'ethers';

export async function getContractCreationBlock(contractAddress: string, provider: providers.StaticJsonRpcProvider, network: keyof typeof JSON_RPC_PROVIDER): Promise<number> {
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
          `https://api.polygonscan.com/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}`
        );
      } else if (network === ChainId.arbitrum_one) {
        response = await fetch(
          `https://api.arbiscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}`
        );
      } else if (network === ChainId.optimism) {
        response = await fetch(
          `https://api-optimistic.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}`
        );
      } else if (network === ChainId.fantom) {
        response = await fetch(
          `https://api.ftmscan.com/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}`
        );
      } else if (network === ChainId.avalanche) {
        response = await fetch(
          `https://api.snowtrace.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}`
        );
      } else if (network === ChainId.harmony) {
        return 0;
      } else {
        throw Error('Invalid Network');
      }

      const txHash = (await response.json()).result[0].txHash;
      if (txHash === undefined) throw Error();
      const receipt = await provider.getTransactionReceipt(txHash);
      return receipt.blockNumber;
    }
    catch (err) {
      await sleep(RETRY_DELAY_MS)
    }
    finally {
      retryLeft -= 1;
    }
  }
  return 0;
}

function sleep(delay: number){
  return new Promise((resolve) => setTimeout(resolve, delay));
}
