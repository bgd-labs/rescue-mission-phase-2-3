import {ChainId} from '@aave/contract-helpers';
import {AaveV2Ethereum, AaveV2EthereumAMM} from '@bgd-labs/aave-address-book';
import {
  AAVE_V1_LENDING_POOL,
  AAVE_V1_LENDING_POOL_CORE,
  AaveMarket,
  ContractType,
} from '../js-scripts/common/constants';
import TOKENS_ETH from './assets/ethTokens.json';
import V1_ETH_A_TOKENS from './assets/v1EthATokens.json';
import V2_ETH_A_TOKENS from './assets/v2EthATokens.json';
import V2AMM_ETH_A_TOKENS from './assets/v2AmmATokens.json';
import V3_ETH_A_TOKENS from './assets/v3EthATokens.json';
import {fetchTxns, generateAndSaveMap} from './common/helper';

async function generateMainnetTokensMap() {
  const tokenList = Object.entries(TOKENS_ETH);
  const tokensStuckInV2Pool = [TOKENS_ETH.DAI, TOKENS_ETH.GUSD, TOKENS_ETH.USDC, TOKENS_ETH.HOT];
  const tokensStuckInV2AmmPool = [TOKENS_ETH.USDT];
  const tokensStuckInV1Pool = [TOKENS_ETH.LINK, V1_ETH_A_TOKENS.WBTC];

  // v2 aRAI token sent to v2 aRAI contract
  const aRaiMappedContracts: Record<string, {amount: string; txHash: string[]}>[] =
    await Promise.all([
      fetchTxns(
        V2_ETH_A_TOKENS.RAI,
        V2_ETH_A_TOKENS.RAI,
        ChainId.mainnet,
        `v2aRAI-v2aRAI`,
        ContractType.aToken,
        AaveMarket.v2
      ),
    ]);
  await generateAndSaveMap(aRaiMappedContracts, `v2_aRai`, 'ethereum');

  // v1 aWBTC token sent to v1 Pool contract
  const aWbtcMappedContracts: Record<string, {amount: string; txHash: string[]}>[] =
    await Promise.all([
      fetchTxns(
        V1_ETH_A_TOKENS.WBTC,
        AAVE_V1_LENDING_POOL,
        ChainId.mainnet,
        `v1aWBTC-v1Pool`,
        ContractType.Pool,
        AaveMarket.v1
      ),
    ]);
  await generateAndSaveMap(aWbtcMappedContracts, `v1_aWbtc`, 'ethereum');

  tokenList.forEach(async (token) => {
    const tokenName = token[0];
    const tokenAddress = token[1];
    const tokenStuckInV1Pool = tokensStuckInV1Pool.find((stuckToken) => stuckToken == tokenAddress);
    const tokenStuckInV2Pool = tokensStuckInV2Pool.find((stuckToken) => stuckToken == tokenAddress);
    const tokenStuckInV2AmmPool = tokensStuckInV2AmmPool.find(
      (stuckToken) => stuckToken == tokenAddress
    );
    const v1AToken = V1_ETH_A_TOKENS[tokenName as keyof typeof V1_ETH_A_TOKENS];
    const v2AToken = V2_ETH_A_TOKENS[tokenName as keyof typeof V2_ETH_A_TOKENS];
    const v2AmmAToken = V2AMM_ETH_A_TOKENS[tokenName as keyof typeof V2AMM_ETH_A_TOKENS];
    const v3AToken = V3_ETH_A_TOKENS[tokenName as keyof typeof V3_ETH_A_TOKENS];

    const mappedContracts: Record<string, {amount: string; txHash: string[]}>[] = await Promise.all(
      [
        // underlying token sent to eth v2 amm aToken contract
        v2AmmAToken
          ? fetchTxns(
              tokenAddress,
              v2AmmAToken,
              ChainId.mainnet,
              `${tokenName}-v2amm-a${tokenName}`,
              ContractType.aToken,
              AaveMarket.v2Amm
            )
          : {},
        // underlying token sent to eth v2 aToken contract
        v2AToken
          ? fetchTxns(
              tokenAddress,
              v2AToken,
              ChainId.mainnet,
              `${tokenName}-v2a${tokenName}`,
              ContractType.aToken,
              AaveMarket.v2
            )
          : {},
        // underlying token sent to eth v3 aToken contract
        v3AToken
          ? fetchTxns(
              tokenAddress,
              v3AToken,
              ChainId.mainnet,
              `${tokenName}-v3a${tokenName}`,
              ContractType.aToken,
              AaveMarket.v3
              // validateATokenEvents
            )
          : {},
        // tokens sent to eth v2 pool contract
        tokenStuckInV2Pool
          ? fetchTxns(
              tokenAddress,
              AaveV2Ethereum.POOL,
              ChainId.mainnet,
              `${tokenName}-v2Pool`,
              ContractType.Pool,
              AaveMarket.v2
            )
          : {},
        // tokens sent to eth v2 amm pool contract
        tokenStuckInV2AmmPool
          ? fetchTxns(
              tokenAddress,
              AaveV2EthereumAMM.POOL,
              ChainId.mainnet,
              `${tokenName}-v2AmmPool`,
              ContractType.Pool,
              AaveMarket.v2
            )
          : {},
        // tokens sent to eth v1 pool contract
        tokenStuckInV1Pool
          ? fetchTxns(
              tokenAddress,
              AAVE_V1_LENDING_POOL,
              ChainId.mainnet,
              `${tokenName}-v1Pool`,
              ContractType.Pool,
              AaveMarket.v1
            )
          : {},
        // tokens sent to eth v1 pool core contract
        v1AToken
          ? fetchTxns(
              tokenAddress,
              AAVE_V1_LENDING_POOL_CORE,
              ChainId.mainnet,
              `${tokenName}-v1PoolCore`,
              ContractType.PoolCore,
              AaveMarket.v1
            )
          : {},
      ]
    );
    await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'ethereum');
  });
}

export {generateMainnetTokensMap};
