|Name|Type|Slot|Offset|Bytes|Contract|
|-|-|-|-|-|-|
| lastInitializedRevision         | uint256                                                   | 0    | 0      | 32    |LendingPool.sol:LendingPool|
| initializing                    | bool                                                      | 1    | 0      | 1     |LendingPool.sol:LendingPool|
| ______gap                       | uint256[50]                                               | 2    | 0      | 1600  |LendingPool.sol:LendingPool|
| _addressesProvider              | contract ILendingPoolAddressesProvider                    | 52   | 0      | 20    |LendingPool.sol:LendingPool|
| _reserves                       | mapping(address => struct DataTypes.ReserveData)          | 53   | 0      | 32    |LendingPool.sol:LendingPool|
| _usersConfig                    | mapping(address => struct DataTypes.UserConfigurationMap) | 54   | 0      | 32    |LendingPool.sol:LendingPool|
| _reservesList                   | mapping(uint256 => address)                               | 55   | 0      | 32    |LendingPool.sol:LendingPool|
| _reservesCount                  | uint256                                                   | 56   | 0      | 32    |LendingPool.sol:LendingPool|
| _paused                         | bool                                                      | 57   | 0      | 1     |LendingPool.sol:LendingPool|
| _maxStableRateBorrowSizePercent | uint256                                                   | 58   | 0      | 32    |LendingPool.sol:LendingPool|
| _flashLoanPremiumTotal          | uint256                                                   | 59   | 0      | 32    |LendingPool.sol:LendingPool|
| _maxNumberOfReserves            | uint256                                                   | 60   | 0      | 32    |LendingPool.sol:LendingPool|