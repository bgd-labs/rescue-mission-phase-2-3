import {ChainId} from '@aave/contract-helpers';
import {AaveV2Avalanche, AaveV2Polygon, AaveV3Arbitrum, AaveV3Avalanche, AaveV3Fantom, AaveV3Optimism, AaveV3Polygon} from '@bgd-labs/aave-address-book';
import {AaveMarket, ContractType} from '../js-scripts/common/constants';
import {fetchTxns, generateAndSaveMap} from './common/helper';
import TOKENS_POL from './assets/polTokens.json';
import TOKENS_AVA from './assets/avaTokens.json';
import TOKENS_OPT from './assets/optTokens.json';
import TOKENS_ARB from './assets/arbTokens.json';
import TOKENS_FAN from './assets/fanTokens.json';
import V2_POL_A_TOKENS from './assets/v2PolATokens.json';
import V2_AVA_A_TOKENS from './assets/v2AvaATokens.json';
import V3_POL_A_TOKENS from './assets/v3PolATokens.json';
import V3_AVA_A_TOKENS from './assets/v3AvaATokens.json';
import V3_OPT_A_TOKENS from './assets/v3OptATokens.json';
import V3_ARB_A_TOKENS from './assets/v3ArbATokens.json';
import V3_FAN_A_TOKENS from './assets/v3FanATokens.json';

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
      const mappedContracts: Record<string, {amount: string; txHash: string[]}>[] =
        await Promise.all([
          fetchTxns(
            v2AToken,
            v2AToken,
            ChainId.polygon,
            `v2a${tokenName}-v2a${tokenName}`,
            ContractType.aToken,
            AaveMarket.v2
          ),
        ]);
      await generateAndSaveMap(mappedContracts, `v2_a${tokenName.toLocaleLowerCase()}`, 'polygon');
    }

    const mappedContracts: Record<string, {amount: string; txHash: string[]}>[] = await Promise.all(
      [
        // underlying token sent to pol v2 aToken contract
        v2AToken
          ? fetchTxns(
              tokenAddress,
              v2AToken,
              ChainId.polygon,
              `${tokenName}-v2a${tokenName}`,
              ContractType.aToken,
              AaveMarket.v2
            )
          : {},
        // underlying token sent to pol v3 aToken contract
        v3AToken
          ? fetchTxns(
              tokenAddress,
              v3AToken,
              ChainId.polygon,
              `${tokenName}-v3a${tokenName}`,
              ContractType.aToken,
              AaveMarket.v3
            )
          : {},
        // tokens sent to pol v2 pool contract
        tokenStuckInV2Pool
          ? fetchTxns(
              tokenAddress,
              AaveV2Polygon.POOL,
              ChainId.polygon,
              `${tokenName}-v2Pool`,
              ContractType.Pool,
              AaveMarket.v2
            )
          : {},
        // tokens sent to pol v3 pool contract
        tokenAddress
          ? fetchTxns(
              tokenAddress,
              AaveV3Polygon.POOL,
              ChainId.polygon,
              `${tokenName}-v3Pool`,
              ContractType.Pool,
              AaveMarket.v3
            )
          : {},
      ]
    );
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

    const mappedContracts: Record<string, {amount: string; txHash: string[]}>[] = await Promise.all(
      [
        // underlying token sent to ava v2 aToken contract
        v2AToken
          ? fetchTxns(
              tokenAddress,
              v2AToken,
              ChainId.avalanche,
              `${tokenName}-v2a${tokenName}`,
              ContractType.aToken,
              AaveMarket.v2
            )
          : {},
        // underlying token sent to ava v3 aToken contract
        v3AToken
          ? fetchTxns(
              tokenAddress,
              v3AToken,
              ChainId.avalanche,
              `${tokenName}-v3a${tokenName}`,
              ContractType.aToken,
              AaveMarket.v3
            )
          : {},
        // token sent to ava v3 pool contract
        tokenAddress
          ? fetchTxns(
              tokenAddress,
              AaveV3Avalanche.POOL,
              ChainId.avalanche,
              `v3${tokenName}-v3Pool`,
              ContractType.Pool,
              AaveMarket.v3
            )
          : {},
        // tokens sent to ava v2 pool contract
        tokenStuckInV2Pool
          ? fetchTxns(
              tokenAddress,
              AaveV2Avalanche.POOL,
              ChainId.avalanche,
              `${tokenName}-v2Pool`,
              ContractType.Pool,
              AaveMarket.v2
            )
          : {},
      ]
    );
    await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'avalanche');
  });
}

async function generateOptTokensMap() {
  const tokenList = Object.entries(TOKENS_OPT);

  tokenList.forEach(async (token) => {
    const tokenName = token[0];
    const tokenAddress = token[1];
    const v3AToken = V3_OPT_A_TOKENS[tokenName as keyof typeof V3_OPT_A_TOKENS];

    const mappedContracts: Record<string, {amount: string; txHash: string[]}>[] = await Promise.all(
      [
        // underlying token sent to opt v3 aToken contract
        v3AToken
          ? fetchTxns(
              tokenAddress,
              v3AToken,
              ChainId.optimism,
              `v3${tokenName}-v3a${tokenName}`,
              ContractType.aToken,
              AaveMarket.v3
            )
          : {},
        // token sent to opt v3 pool contract
        tokenAddress
          ? fetchTxns(
              tokenAddress,
              AaveV3Optimism.POOL,
              ChainId.optimism,
              `v3${tokenName}-v3Pool`,
              ContractType.Pool,
              AaveMarket.v3
            )
          : {},
      ]
    );
    await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'optimism');
  });
}

async function generateArbTokensMap() {
  const tokenList = Object.entries(TOKENS_ARB);

  tokenList.forEach(async (token) => {
    const tokenName = token[0];
    const tokenAddress = token[1];
    const v3AToken = V3_ARB_A_TOKENS[tokenName as keyof typeof V3_ARB_A_TOKENS];

    const mappedContracts: Record<string, {amount: string; txHash: string[]}>[] = await Promise.all(
      [
        // underlying token sent to arb v3 aToken contract
        v3AToken
          ? fetchTxns(
              tokenAddress,
              v3AToken,
              ChainId.arbitrum_one,
              `v3${tokenName}-v3a${tokenName}`,
              ContractType.aToken,
              AaveMarket.v3
            )
          : {},
        // token sent to arb v3 pool contract
        tokenAddress
          ? fetchTxns(
              tokenAddress,
              AaveV3Arbitrum.POOL,
              ChainId.arbitrum_one,
              `v3${tokenName}-v3Pool`,
              ContractType.Pool,
              AaveMarket.v3
            )
          : {},
      ]
    );
    await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'arbitrum');
  });
}

async function generateFanTokensMap() {
  const tokenList = Object.entries(TOKENS_FAN);

  tokenList.forEach(async (token) => {
    const tokenName = token[0];
    const tokenAddress = token[1];
    const v3AToken = V3_FAN_A_TOKENS[tokenName as keyof typeof V3_FAN_A_TOKENS];

    const mappedContracts: Record<string, {amount: string; txHash: string[]}>[] = await Promise.all(
      [
        // underlying token sent to fan v3 aToken contract
        v3AToken
          ? fetchTxns(
              tokenAddress,
              v3AToken,
              ChainId.fantom,
              `v3${tokenName}-v3a${tokenName}`,
              ContractType.aToken,
              AaveMarket.v3
            )
          : {},
          // token sent to fan v3 pool contract
          tokenAddress
          ? fetchTxns(
              tokenAddress,
              AaveV3Fantom.POOL,
              ChainId.fantom,
              `v3${tokenName}-v3Pool`,
              ContractType.Pool,
              AaveMarket.v3
            )
          : {},
      ]
    );
    await generateAndSaveMap(mappedContracts, tokenName.toLocaleLowerCase(), 'fantom');
  });
}

export {
  generatePolTokensMap,
  generateAvaTokensMap,
  generateOptTokensMap,
  generateArbTokensMap,
  generateFanTokensMap,
};
