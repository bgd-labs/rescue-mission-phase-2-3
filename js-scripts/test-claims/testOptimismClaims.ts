import 'dotenv';
import fs from 'fs';
import {OptBridgeExecutorAbi} from './abis/OptimismBridgeExecutor.json';
import {L2CrossDomainMessengerAbi} from './abis/L2CrossDomainMessenger.json';
import {BigNumber, ethers, providers} from 'ethers';
import OptRescueMissionPayload from '../../out/OptRescueMissionPayload.sol/OptRescueMissionPayload.json';
import AaveMerkleDistributor from '../../out/AaveMerkleDistributor.sol/AaveMerkleDistributor.json';

const TENDERLY_FORK_URL = process.env.TENDERLY_FORK_URL_OPTIMISM;
if (!TENDERLY_FORK_URL) throw new Error('missing TENDERLY_FORK_URL_OPTIMISM');

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

const provider = new providers.StaticJsonRpcProvider(TENDERLY_FORK_URL);

const DEPLOYER = '0x25F2226B597E8F9514B3F68F00f494cF4f286491';
const BRIDGE_EXECUTOR = '0x7d9103572bE58FfE99dc390E8246f02dcAe6f611';

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
  //                                  DEPLOY DEPENDENCY CONTRACTS: MERKLE DISTRIBUTOR
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

  //---------------------------------------------------------------------------------------------------------------------------------
  //                                                   DEPLOY PAYLOAD
  //---------------------------------------------------------------------------------------------------------------------------------

  const payloadFactory = new ethers.ContractFactory(
    OptRescueMissionPayload.abi,
    OptRescueMissionPayload.bytecode,
    provider.getSigner(DEPLOYER)
  );

  const payloadContract = await payloadFactory.deploy(merkleDistributorContract.address);
  console.log(`[Payload]: ${payloadContract.address}`);

  //---------------------------------------------------------------------------------------------------------------------------------
  //                                                    QUEUE PAYLOAD
  //---------------------------------------------------------------------------------------------------------------------------------

  const L2_CROSS_DOMAIN_MESSENGER = '0x4200000000000000000000000000000000000007';
  const ALIASED_L1_CROSS_DOMAIN_MESSENGER = '0x36bde71c97b33cc4729cf772ae268934f7ab70b2';
  const SHORT_EXECUTOR = '0xEE56e2B3D491590B5b31738cC34d5232F378a8D5';

  const targets = [payloadContract.address];
  const values = [0];
  const signatures = ['execute()'];
  const calldatas = ['0x'];
  const withDelegateCalls = [true];

  const bridgeExecutorInterface = new ethers.utils.Interface(OptBridgeExecutorAbi);
  const encodedData = bridgeExecutorInterface.encodeFunctionData('queue', [
    targets,
    values,
    signatures,
    calldatas,
    withDelegateCalls,
  ]);

  const l2CrossDomainMessengerContract = new ethers.Contract(
    L2_CROSS_DOMAIN_MESSENGER,
    L2CrossDomainMessengerAbi,
    provider.getSigner(ALIASED_L1_CROSS_DOMAIN_MESSENGER)
  );

  const nonce = await l2CrossDomainMessengerContract.messageNonce();
  await l2CrossDomainMessengerContract.relayMessage(
    nonce,
    SHORT_EXECUTOR, // sender
    BRIDGE_EXECUTOR, // target
    0, // value
    1920000, // minGasLimit
    encodedData // message
  );
  console.log('Payload queued');

  //---------------------------------------------------------------------------------------------------------------------------------
  //                                                    EXECUTE PAYLOAD
  //---------------------------------------------------------------------------------------------------------------------------------

  const bridgeExecutorContract = new ethers.Contract(
    BRIDGE_EXECUTOR,
    OptBridgeExecutorAbi,
    provider.getSigner(DEPLOYER)
  );
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

const testOptimismClaims = async () => {
  const {provider, merkleDistributor} = await deploy();
  const claims = getMerkleTreeJson('./js-scripts/maps/optimism/usersMerkleTrees.json');

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

testOptimismClaims().then().catch();
