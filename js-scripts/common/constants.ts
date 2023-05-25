import { ChainId } from '@aave/contract-helpers';

export const JSON_RPC_PROVIDER = {
  [ChainId.mainnet]: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.polygon]: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.optimism]: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.arbitrum_one]: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.avalanche]: process.env.RPC_AVALANCHE,
  [ChainId.harmony]: process.env.RPC_HARMONY,
  [ChainId.fantom]: process.env.RPC_FANTOM,
};

export const AAVE_V1_LENDING_POOL = '0x398eC7346DcD622eDc5ae82352F02bE94C62d119';
export const AAVE_V1_LENDING_POOL_CORE = '0x3dfd23A6c5E8BbcFc9581d2E864a68feb6a076d3';

export enum AaveMarket { v1, v2, v2Amm, v3 };
export enum ContractType { aToken, Pool, PoolCore };

export const amountsFilePath = `./js-scripts/maps/amountsByContract.txt`;
