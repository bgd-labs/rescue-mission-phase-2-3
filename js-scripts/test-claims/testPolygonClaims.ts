import 'dotenv';
import fs from 'fs';
import {PolBridgeExecutorAbi} from './abis/PolygonBridgeExecutor.json';
import {BigNumber, ethers, providers} from 'ethers';
import V2AToken from '../../out/protocol-v2/contracts/protocol/tokenization/AToken.sol/AToken.json';
import V2LendingPool from '../../out/lendingpool/contracts/protocol/lendingpool/LendingPool.sol/LendingPool.json';
import PolRescueMissionPayload from '../../out/PolRescueMissionPayload.sol/PolRescueMissionPayload.json';
import AaveMerkleDistributor from '../../out/AaveMerkleDistributor.sol/AaveMerkleDistributor.json';

const TENDERLY_FORK_URL = process.env.TENDERLY_FORK_URL_POLYGON;
if (!TENDERLY_FORK_URL) throw new Error('missing TENDERLY_FORK_URL_POLYGON');

type Info = {
  tokenAmount: string;
  tokenAmountInWei: string;
  proof: string[];
  index: number;
  distributionId: number;
};

type TokenClaim = {
  index: number;
  account: string;
  amount: string;
  merkleProof: string[];
  distributionId: number;
};

type UsersMerkleTrees = Record<string, Info[]>;

const getMerkleTreeJson = (path: string): UsersMerkleTrees => {
  try {
    const file = fs.readFileSync(path);
    // @ts-ignore
    return JSON.parse(file);
  } catch (error) {
    console.error(new Error(`unable to fetch ${path} with error: ${error}`));
    return {} as UsersMerkleTrees;
  }
};

function linkLibraries(
  {
    bytecode,
    linkReferences,
  }: {
    bytecode: string;
    linkReferences: {
      [fileName: string]: {[contractName: string]: {length: number; start: number}[]};
    };
  },
  libraries: {[libraryName: string]: string}
): string {
  Object.keys(linkReferences).forEach((fileName) => {
    Object.keys(linkReferences[fileName]).forEach((contractName) => {
      if (!libraries.hasOwnProperty(contractName)) {
        throw new Error(`Missing link library name ${contractName}`);
      }
      const address = ethers.utils.getAddress(libraries[contractName]).toLowerCase().slice(2);
      linkReferences[fileName][contractName].forEach(({start: byteStart, length: byteLength}) => {
        const start = 2 + byteStart * 2;
        const length = byteLength * 2;
        bytecode = bytecode
          .slice(0, start)
          .concat(address)
          .concat(bytecode.slice(start + length, bytecode.length));
      });
    });
  });
  return bytecode;
}

const provider = new providers.StaticJsonRpcProvider(TENDERLY_FORK_URL);

const DEPLOYER = '0x25F2226B597E8F9514B3F68F00f494cF4f286491';
const BRIDGE_EXECUTOR = '0xdc9A35B16DB4e126cFeDC41322b3a36454B1F772';

const giveEth = async (addresses: string[]) => {
  await provider.send('tenderly_addBalance', [
    addresses,
    //amount in wei will be added for all wallets
    ethers.utils.hexValue(ethers.utils.parseUnits('1000', 'ether').toHexString()),
  ]);
};

const deploy = async () => {
  await giveEth([DEPLOYER]);
  //---------------------------------------------------------------------------------------------------------------------------------
  //      DEPLOY DEPENDENCY CONTRACTS: MERKLE DISTRIBUTOR, V2_POOL, V2_A_TOKEN
  //---------------------------------------------------------------------------------------------------------------------------------

  // deploy merkle distributor
  const merkleDistributorFactory = new ethers.ContractFactory(
    AaveMerkleDistributor.abi,
    AaveMerkleDistributor.bytecode,
    provider.getSigner(DEPLOYER)
  );
  const merkleDistributorContract = await merkleDistributorFactory.deploy();
  const transferTx = await merkleDistributorContract.transferOwnership(BRIDGE_EXECUTOR);
  await transferTx.wait();
  console.log(`[MerkleDistributor]: ${merkleDistributorContract.address}`);

  // deploy v2 pool and manually link the libraries
  const reserveLogic = '0x6aced14510ECD3bb36d13FA93D445e0D53c32A4d';
  const validationLogic = '0xCC7dF14A5dE0145cE3438CBf29dF1cA84e56a9B5';
  const v2PoolFactory = new ethers.ContractFactory(
    V2LendingPool.abi,
    linkLibraries(
      {
        bytecode: V2LendingPool.bytecode.object,
        linkReferences: V2LendingPool.bytecode.linkReferences,
      },
      {
        ReserveLogic: reserveLogic,
        ValidationLogic: validationLogic,
      }
    ),
    provider.getSigner(DEPLOYER)
  );
  const v2PoolContract = await v2PoolFactory.deploy();
  console.log(`[AaveV2LendingPoolImpl]: ${v2PoolContract.address}`);

  // deploy aToken
  const v2ATokenFactory = new ethers.ContractFactory(
    V2AToken.abi,
    V2AToken.bytecode,
    provider.getSigner(DEPLOYER)
  );
  const v2ATokenContract = await v2ATokenFactory.deploy();
  console.log(`[V2AToken]: ${v2ATokenContract.address}`);

  //---------------------------------------------------------------------------------------------------------------------------------
  //                                            DEPLOY PAYLOAD
  //---------------------------------------------------------------------------------------------------------------------------------

  const payloadFactory = new ethers.ContractFactory(
    PolRescueMissionPayload.abi,
    PolRescueMissionPayload.bytecode,
    provider.getSigner(DEPLOYER)
  );

  const payloadContract = await payloadFactory.deploy(
    merkleDistributorContract.address,
    v2PoolContract.address,
    v2ATokenContract.address
  );
  console.log(`[Payload]: ${payloadContract.address}`);

  //---------------------------------------------------------------------------------------------------------------------------------
  //                                            QUEUE PAYLOAD
  //---------------------------------------------------------------------------------------------------------------------------------

  const FX_CHILD = '0x8397259c983751daf40400790063935a11afa28a';
  const FX_ROOT_SENDER = '0xee56e2b3d491590b5b31738cc34d5232f378a8d5';

  const abiCoder = new ethers.utils.AbiCoder();
  const targets = [payloadContract.address];
  const values = [0];
  const signatures = ['execute()'];
  const calldatas = ['0x'];
  const withDelegateCalls = [true];
  const encodedParams = abiCoder.encode(
    ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
    [targets, values, signatures, calldatas, withDelegateCalls]
  );

  const bridgeExecutorContract = new ethers.Contract(
    BRIDGE_EXECUTOR,
    PolBridgeExecutorAbi,
    provider.getSigner(FX_CHILD)
  );
  const queueTx = await bridgeExecutorContract.processMessageFromRoot(
    11,
    FX_ROOT_SENDER,
    encodedParams
  );
  await queueTx.wait();
  console.log('Payload queued');

  //---------------------------------------------------------------------------------------------------------------------------------
  //                                            EXECUTE PAYLOAD
  //---------------------------------------------------------------------------------------------------------------------------------

  const actionsSetId = (await bridgeExecutorContract.getActionsSetCount()) - 1;
  const actionsSet = await bridgeExecutorContract.getActionsSetById(actionsSetId);

  // forward time for proposal execution
  const currentBlockNumber = await provider.getBlockNumber();
  const currentBlock = await provider.getBlock(currentBlockNumber);
  await provider.send('evm_increaseTime', [
    BigNumber.from(actionsSet.executionTime).sub(currentBlock.timestamp).add(1).toNumber(),
  ]);

  // execute proposal
  const executeTx = await bridgeExecutorContract.execute(actionsSetId);
  await executeTx.wait();
  console.log('Payload executed');

  return {
    provider,
    merkleDistributor: merkleDistributorContract.address,
  };
};

const testPolygonClaims = async () => {
  const {provider, merkleDistributor} = await deploy();
  const claims = getMerkleTreeJson('./js-scripts/maps/polygon/usersMerkleTrees.json');

  for (const account of Object.keys(claims)) {
    const merkleDistributorContract = new ethers.Contract(
      merkleDistributor,
      AaveMerkleDistributor.abi,
      provider.getSigner(account)
    );

    await giveEth([account]);

    const tokensToClaim: TokenClaim[] = [];
    claims[account].forEach((tokenInfo: Info) => {
      tokensToClaim.push({
        index: tokenInfo.index,
        account,
        amount: tokenInfo.tokenAmountInWei,
        merkleProof: tokenInfo.proof,
        distributionId: tokenInfo.distributionId,
      });
    });

    const claimTx = await merkleDistributorContract.claim(tokensToClaim);
    await claimTx.wait();

    console.log(`claimed account: ${account}`);
  }
};

testPolygonClaims().then().catch();
