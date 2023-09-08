import {ChainId} from '@aave/contract-helpers';
import {EventFilter} from 'ethers';

const JSON_RPC_PROVIDER = {
  [ChainId.mainnet]: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.polygon]: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.optimism]: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.arbitrum_one]: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  [ChainId.avalanche]: process.env.RPC_AVALANCHE,
  [ChainId.fantom]: process.env.RPC_FANTOM,
};

const AAVE_V1_LENDING_POOL = '0x398eC7346DcD622eDc5ae82352F02bE94C62d119';
const AAVE_V1_LENDING_POOL_CORE = '0x3dfd23A6c5E8BbcFc9581d2E864a68feb6a076d3';
const AAVE_V2_AVA_WETH_GATEWAY = '0x8a47F74d1eE0e2edEB4F3A7e64EF3bD8e11D27C8';
const AAVE_V2_ETH_POOL = '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9';
const AAVE_V2_AMM_POOL = '0x7937D4799803FbBe595ed57278Bc4cA21f3bFfCB';
const AAVE_V2_POL_POOL = '0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf';
const AAVE_V2_AVA_POOL = '0x4F01AeD16D97E3aB5ab2B501154DC9bb0F1A5A2C';
const AAVE_V3_ETH_POOL = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';
const AAVE_V3_POL_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const AAVE_V3_OPT_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const AAVE_V3_AVA_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const AAVE_V3_ARB_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const AAVE_V3_FAN_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';

enum AaveMarket {
  v1,
  v2,
  v2Amm,
  v3,
}

enum ContractType {
  aToken,
  Pool,
  PoolCore,
}

interface PoolEvents {
  supplyEvent: EventFilter;
  repayEvent: EventFilter;
  liqCallEvent: EventFilter;
  flashloanEvent: EventFilter;
}

const amountsFilePath = `./js-scripts/maps/amountsByContract.txt`;

export {
  JSON_RPC_PROVIDER,
  AAVE_V1_LENDING_POOL,
  AAVE_V1_LENDING_POOL_CORE,
  AAVE_V2_AVA_WETH_GATEWAY,
  AaveMarket,
  ContractType,
  PoolEvents,
  amountsFilePath,
  AAVE_V2_ETH_POOL,
  AAVE_V2_AMM_POOL,
  AAVE_V2_POL_POOL,
  AAVE_V2_AVA_POOL,
  AAVE_V3_ETH_POOL,
  AAVE_V3_POL_POOL,
  AAVE_V3_OPT_POOL,
  AAVE_V3_AVA_POOL,
  AAVE_V3_ARB_POOL,
  AAVE_V3_FAN_POOL,
};
