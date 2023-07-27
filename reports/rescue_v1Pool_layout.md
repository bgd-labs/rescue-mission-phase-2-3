| Name                    | Type                                   | Slot | Offset | Bytes | Contract                                                     |
|-------------------------|----------------------------------------|------|--------|-------|--------------------------------------------------------------|
| _guardCounter           | uint256                                | 0    | 0      | 32    | src/contracts/v1Pool/LendingPool/LendingPool.sol:LendingPool |
| lastInitializedRevision | uint256                                | 1    | 0      | 32    | src/contracts/v1Pool/LendingPool/LendingPool.sol:LendingPool |
| initializing            | bool                                   | 2    | 0      | 1     | src/contracts/v1Pool/LendingPool/LendingPool.sol:LendingPool |
| ______gap               | uint256[50]                            | 3    | 0      | 1600  | src/contracts/v1Pool/LendingPool/LendingPool.sol:LendingPool |
| addressesProvider       | contract LendingPoolAddressesProvider  | 53   | 0      | 20    | src/contracts/v1Pool/LendingPool/LendingPool.sol:LendingPool |
| core                    | contract LendingPoolCore               | 54   | 0      | 20    | src/contracts/v1Pool/LendingPool/LendingPool.sol:LendingPool |
| dataProvider            | contract LendingPoolDataProvider       | 55   | 0      | 20    | src/contracts/v1Pool/LendingPool/LendingPool.sol:LendingPool |
| parametersProvider      | contract LendingPoolParametersProvider | 56   | 0      | 20    | src/contracts/v1Pool/LendingPool/LendingPool.sol:LendingPool |
| feeProvider             | contract IFeeProvider                  | 57   | 0      | 20    | src/contracts/v1Pool/LendingPool/LendingPool.sol:LendingPool |
