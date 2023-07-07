import fs from 'fs';

type LightUserInfo = Record<string, Record<string, string>>;

type UserInfo = {
  tokenAmountInWei: string;
  proof: string[];
  index: number;
  distributionId: number;
  tokenAmount: string;
};

type FoundryJson = {
  account: string;
  tokens: {
    proof: string[];
    merkleTreeIndex: number;
    distributionId: number;
    amount: string;
  }[];
};

type Claim = {
  index: number;
  amountInWei: string;
  amount: string;
  proof: string[];
};

type MerkleTree = {
  merkleRoot: string;
  tokenTotal: string;
  tokenTotalInWei: string;
  claims: Record<string, Claim>;
};

type UsersJson = Record<string, UserInfo[]>;

const ethMerkleTree: Record<string, string> = {
  V2_ETH_A_RAI: './js-scripts/maps/ethereum/merkleTree/v2_araiRescueMerkleTree.json',
  V1_ETH_A_BTC: './js-scripts/maps/ethereum/merkleTree/v1_awbtcRescueMerkleTree.json',
  ETH_USDT: './js-scripts/maps/ethereum/merkleTree/usdtRescueMerkleTree.json',
  ETH_DAI: './js-scripts/maps/ethereum/merkleTree/daiRescueMerkleTree.json',
  ETH_GUSD: './js-scripts/maps/ethereum/merkleTree/gusdRescueMerkleTree.json',
  ETH_LINK: './js-scripts/maps/ethereum/merkleTree/linkRescueMerkleTree.json',
  ETH_HOT: './js-scripts/maps/ethereum/merkleTree/hotRescueMerkleTree.json',
  ETH_USDC: './js-scripts/maps/ethereum/merkleTree/usdcRescueMerkleTree.json',
};

const polMerkleTree: Record<string, string> = {
  POL_WBTC: './js-scripts/maps/polygon/merkleTree/wbtcRescueMerkleTree.json',
  V2_POL_A_DAI: './js-scripts/maps/polygon/merkleTree/v2_adaiRescueMerkleTree.json',
  V2_POL_A_USDC: './js-scripts/maps/polygon/merkleTree/v2_ausdcRescueMerkleTree.json',
  POL_USDC: './js-scripts/maps/polygon/merkleTree/usdcRescueMerkleTree.json',
};

const avaMerkleTree: Record<string, string> = {
  AVA_USDT_E: './js-scripts/maps/avalanche/merkleTree/usdt.eRescueMerkleTree.json',
  AVA_USDC_E: './js-scripts/maps/avalanche/merkleTree/usdc.eRescueMerkleTree.json',
};

const distributionIds: Record<string, number> = {
  // ethereum
  V2_ETH_A_RAI: 4,
  V1_ETH_A_BTC: 5,
  ETH_USDT: 6,
  ETH_DAI: 7,
  ETH_GUSD: 8,
  ETH_LINK: 9,
  ETH_HOT: 10,
  ETH_USDC: 11,
  // polygon
  POL_WBTC: 1,
  V2_POL_A_DAI: 2,
  V2_POL_A_USDC: 3,
  POL_USDC: 4,
  // avalanche
  AVA_USDT_E: 1,
  AVA_USDC_E: 2,
};

const getMerkleTreeJson = (path: string): MerkleTree => {
  try {
    const file = fs.readFileSync(path);
    // @ts-ignore
    return JSON.parse(file);
  } catch (error) {
    console.error(new Error(`unable to fetch ${path} with error: ${error}`));
    return {} as MerkleTree;
  }
};

const generateUsersJson = (network: string): void => {
  const usersJson: UsersJson = {};
  const lightUsersJson: LightUserInfo = {};
  let merkleTree: Record<string, string>;

  if (network === 'ethereum') {
    merkleTree = ethMerkleTree;
  } else if (network === 'polygon') {
    merkleTree = polMerkleTree;
  } else if (network === 'avalanche') {
    merkleTree = avaMerkleTree;
  } else {
    throw Error('Invalid network');
  }

  for (const token of Object.keys(merkleTree)) {
    const merkleTreeJson = getMerkleTreeJson(merkleTree[token]);
    for (const claimer of Object.keys(merkleTreeJson.claims)) {
      if (!usersJson[claimer]) {
        usersJson[claimer] = [];
      }

      if (!lightUsersJson[claimer]) {
        lightUsersJson[claimer] = {};
      }

      const claimerInfo = merkleTreeJson.claims[claimer];

      lightUsersJson[claimer][token] = claimerInfo.amount;

      usersJson[claimer].push({
        tokenAmount: claimerInfo.amount,
        tokenAmountInWei: claimerInfo.amountInWei,
        proof: claimerInfo.proof,
        index: claimerInfo.index,
        distributionId: distributionIds[token],
      });
    }
  }

  fs.writeFileSync(`./js-scripts/maps/${network}/usersMerkleTrees.json`, JSON.stringify(usersJson));
  fs.writeFileSync(
    `./js-scripts/maps/${network}/usersAmounts.json`,
    JSON.stringify(lightUsersJson)
  );
};

generateUsersJson('ethereum');
generateUsersJson('polygon');
generateUsersJson('avalanche');
