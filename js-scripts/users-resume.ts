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

const merkleTree: Record<string, string> = {
  V2_POL_A_USDC: './js-scripts/maps/polygon/v2_ausdcRescueMerkleTree.json',
};

const distributionIds: Record<string, number> = {
  V2_POL_A_USDC: 1,
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

const generateUsersJson = (): void => {
  const usersJson: UsersJson = {};
  const lightUsersJson: LightUserInfo = {};

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

  fs.writeFileSync(
    './js-scripts/maps/usersMerkleTrees.json',
    JSON.stringify(usersJson),
  );
  fs.writeFileSync(
    './js-scripts/maps/usersAmounts.json',
    JSON.stringify(lightUsersJson),
  );
};

generateUsersJson();
