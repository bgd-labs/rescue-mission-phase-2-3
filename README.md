# Aave Rescue Mission Phase 2 and 3 ⛑️

Repository containing all the code needed for phase 2 and 3 to rescue tokens sent directly to contracts of the Aave ecosystem.
This phase will affect the tokens locked on smart contracts around the liquidity pools - v1 Pool, v2 Pool, AMM pool, v3Pool, aTokens across Ethereum, Polygon, Avalanche, Optimism, Fantom, Arbitrum networks.

The following table represents the tokens to rescue from various different contracts of Aave:

| Tokens to Rescue | Contract where tokens are stuck | Amount                  | Network   |
| ---------------- | ------------------------------- | ----------------------- | --------- |
| AAVE V2 A_RAI    | AAVE V2 A_RAI                   | 1481.16074087007480402  | ETHEREUM  |
| AAVE V2 A_WBTC   | AAVE V1 POOL                    | 1.92454215              | ETHEREUM  |
| USDT             | AAVE V2 AMM_POOL                | 20600.057405            | ETHEREUM  |
| DAI              | AAVE V2 POOL                    | 22000                   | ETHEREUM  |
| GUSD             | AAVE V2 POOL                    | 19994.86                | ETHEREUM  |
| LINK             | AAVE v1 POOL                    | 4084                    | ETHEREUM  |
| USDT             | AAVE V2 A_USDT                  | 11010                   | ETHEREUM  |
| HOT              | AAVE V2 POOL                    | 1046391                 | ETHEREUM  |
| USDC             | AAVE V2 POOL                    | 1089.889717             | ETHEREUM  |
| WBTC             | AAVE V2 POOL                    | 0.22994977              | POLYGON   |
| AAVE V2 A_DAI    | AAVE V2 A_DAI                   | 4250.580268097645600939 | POLYGON   |
| AAVE V2 A_USDC   | AAVE V2 A_USDC                  | 514131.378018           | POLYGON   |
| USDC             | AAVE V2 POOL                    | 4515.242949             | POLYGON   |
| USDT.e           | AAVE V2 POOL                    | 1772.206585             | AVALANCHE |
| USDC.e           | AAVE V2 POOL                    | 2522.408895             | AVALANCHE |
| USDC             | AAVE V3 POOL                    | 44428.421035            | OPTIMISM  |

## About:

This repository compliments the [rescue mission phase 1](https://github.com/bgd-labs/rescue-mission-phase-1) and is divided into three parts:

- Scripts to fetch tokens to rescue off-chain using dune, generating address value maps and merkle trees for each tokens.
- Implementation contracts of Aave where funds are stuck with added rescue function.
- Proposal payloads.

<img width="1083" alt="Screenshot 2023-08-02 at 5 16 56 PM" src="https://github.com/bgd-labs/rescue-mission-phase-2-3/assets/22850280/5397ffe2-cbb6-4d2b-9cfe-74762f1371ed">

## Setup:

To setup the project locally you will need to do:

`npm install`: You need to install all NodeJs dependencies in order to generate merkle trees.

`forge install`: The project uses [Foundry](https://github.com/foundry-rs/foundry) - so you will need to have it installed, and then install all its dependency.

Make sure to have the following in your `.env` file

```
# Tenderly forks
TENDERLY_FORK_URL_MAINNET= // to test all the claims on ethereum
TENDERLY_FORK_URL_POLYGON= // to test all the claims on polygon
TENDERLY_FORK_URL_AVALANCHE= // to test all the claims on avalanche
TENDERLY_FORK_URL_OPTIMISM= // to test all the claims on optimism

# Dune Api Key
DUNE_API_KEY= // to query data needed for rescue from dune
```

## Scripts:

`generate-address-value-map`: This script will query all token transfer events to aave contracts using the [dune](https://dune.com/) api. For checking transactions when user has sent underlying token to the aToken contract we filter out the transfer transactions - by removing the transfer transactions which has been caused when user has performed operations such as Deposit, Repay, Liquidation, Flashloan on the pool contract. For checking transactions when user has sent tokens to aave v1 pool core, we also filter out the transfer transactions cause by Deposit, Repay, Liquidation, Flashloan operations.

This script also generates a [resume](https://github.com/bgd-labs/rescue-mission-phase-2-3/blob/main/js-scripts/maps/amountsByContract.txt) indicating the amount to rescue for every token sent on the contracts. Tokens with value less than $1000 are ignored.

```
npm run generate-json-mainnet
npm run generate-json-l2
```

This will generate the json for each token as: address - amounts - transactions.

Example of a generated file from this command - [usdtRescueMap.json](https://github.com/bgd-labs/rescue-mission-phase-2-3/blob/main/js-scripts/maps/ethereum/usdtRescueMap.json)

`generate-merkle-roots`: This script will take the above generated address value map json as input and generate a merkle tree for each token on each network.

```
npm run generate-tree
```

Example of a generate file from this command: [usdtRescueMerkleTree.json](https://github.com/bgd-labs/rescue-mission-phase-2-3/blob/main/js-scripts/maps/ethereum/merkleTree/usdtRescueMerkleTree.json)

`generate-json-formatted`: To format the address value map generated we can run the following command to format the json map in the token decimals.

```
npm run generate-json-formatted
```

Example of a generated file from this command: [usdtRescueMapFormatted.json](https://github.com/bgd-labs/rescue-mission-phase-2-3/blob/main/js-scripts/maps/ethereum/formatted/usdtRescueMapFormatted.json)

`generate:users-json`: Script to generate user resume - which will include the proofs for the users in order to claim the tokens from the distributor contract. There will be one file generated for each network containing all the user resume.

```
npm run generate:users-json
```

Example of a generated file from this command: [usersMerkleTrees.json](https://github.com/bgd-labs/rescue-mission-phase-2-3/blob/main/js-scripts/maps/ethereum/usersMerkleTrees.json)

## Contracts:

The following Aave contracts are updated by adding a rescue function which can transfer the stuck funds to the merkle distributor contract.

- Aave v1 pool
- Aave v2 amm pool
- Aave v2 ethereum pool
- Aave v2 polygon pool
- Aave v2 avalanche pool
- Aave v2 aRai contract on ethereum
- Aave v2 aUsdt contract on ethereum
- Aave v2 aDai contract on polygon
- Aave v2 aUsdc contract on polygon

This is different than the previous approach in phase 1, where we were rescuing funds on the initialize method, now we have a seperate method `rescueTokens()` to rescue funds.

We have a merkle distributor on each network which will distribute the tokens to the users.

On ethereum we will use the same merkle distributor as in phase one while deploy new merkle distributors on the other networks.

## Payloads:

- [Ethereum Payload](https://github.com/bgd-labs/rescue-mission-phase-2-3/blob/main/src/contracts/EthRescueMissionPayload.sol):
  - Updates v1 pool with rescue function
  - Updates v2 pool with rescue function
  - Updates v2 amm pool with rescue function
  - Updates v2 aRai contract with rescue function
  - Updates v2 aUsdt contract with rescue function
  - Registers MerkleRoot for each token on the merkle distributor contract.
  - Transfers aRai, aBtc, Usdt, Usdc, Dai, Gusd, Link, Hot tokens to the merkle distributor from the aave contracts where funds were stuck
- [Polygon Payload](https://github.com/bgd-labs/rescue-mission-phase-2-3/blob/main/src/contracts/PolRescueMissionPayload.sol):
  - Updates v2 pool with rescue function
  - Updates v2 aDai contract with rescue function
  - Updates v2 aUdsc contract with rescue function
  - Registers MerkleRoot for each token on the merkle distributor contract.
  - Transfers Wbtc, aDai, aUsdc, Usdc tokens to the merkle distributor contract.
- [Optimism Payload](https://github.com/bgd-labs/rescue-mission-phase-2-3/blob/main/src/contracts/OptRescueMissionPayload.sol)
  - Registers MerkleRoot for token on the merkle distributor contract.
  - Transfers Usdc token to the merkle distributor contract.
- [Avalanche Payload 1](https://github.com/bgd-labs/rescue-mission-phase-2-3/blob/main/src/contracts/AvaRescueMissionPayload_Guardian_1.sol):
  - This payload should be called by the owner of addresses provider (guardian).
  - Updates v2 pool with rescue function
  - Registers MerkleRoot for each token on the merkle distributor contract.
- [Avalanche Payload 2](https://github.com/bgd-labs/rescue-mission-phase-2-3/blob/main/src/contracts/AvaRescueMissionPayload_Guardian_2.sol):
  - This payload should be called by the pool admin (guardian).
  - Transfers Usdc.e Usdt.e to the merkle distributor contract.

## Tests:

To run the tests on foundry:

```
forge test
```

To test all the claims on tenderly for all the users:

```
npm run test-eth-claims
npm run test-pol-claims
npm run test-ava-claims
npm run test-opt-claims
```

## License

Copyright © 2023, [BGD Labs](https://bgdlabs.com/). Released under the [MIT License](./LICENSE).
