```diff
diff --git a/etherscan/v2AmmPool/LendingPool/contracts/interfaces/ILendingPool.sol b/src/contracts/v2AmmPool/LendingPool/contracts/interfaces/ILendingPool.sol
index 64f726c..94d1799 100644
--- a/etherscan/v2AmmPool/LendingPool/contracts/interfaces/ILendingPool.sol
+++ b/src/contracts/v2AmmPool/LendingPool/contracts/interfaces/ILendingPool.sol
@@ -4,8 +4,9 @@ pragma experimental ABIEncoderV2;
 
 import {ILendingPoolAddressesProvider} from './ILendingPoolAddressesProvider.sol';
 import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';
+import {IRescue} from '../../../../interfaces/IRescue.sol';
 
-interface ILendingPool {
+interface ILendingPool is IRescue {
   /**
    * @dev Emitted on deposit()
    * @param reserve The address of the underlying asset of the reserve
diff --git a/etherscan/v2AmmPool/LendingPool/contracts/mocks/swap/MockUniswapV2Router02.sol b/src/contracts/v2AmmPool/LendingPool/contracts/mocks/swap/MockUniswapV2Router02.sol
index b7fd3f8..5560e72 100644
--- a/etherscan/v2AmmPool/LendingPool/contracts/mocks/swap/MockUniswapV2Router02.sol
+++ b/src/contracts/v2AmmPool/LendingPool/contracts/mocks/swap/MockUniswapV2Router02.sol
@@ -2,7 +2,7 @@
 pragma solidity 0.6.12;
 
 import {IUniswapV2Router02} from '../../interfaces/IUniswapV2Router02.sol';
-import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
+import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
 import {MintableERC20} from '../tokens/MintableERC20.sol';
 
 contract MockUniswapV2Router02 is IUniswapV2Router02 {
diff --git a/etherscan/v2AmmPool/LendingPool/contracts/protocol/lendingpool/DefaultReserveInterestRateStrategy.sol b/src/contracts/v2AmmPool/LendingPool/contracts/protocol/lendingpool/DefaultReserveInterestRateStrategy.sol
index af4db24..7b321d0 100644
--- a/etherscan/v2AmmPool/LendingPool/contracts/protocol/lendingpool/DefaultReserveInterestRateStrategy.sol
+++ b/src/contracts/v2AmmPool/LendingPool/contracts/protocol/lendingpool/DefaultReserveInterestRateStrategy.sol
@@ -8,7 +8,6 @@ import {PercentageMath} from '../libraries/math/PercentageMath.sol';
 import {ILendingPoolAddressesProvider} from '../../interfaces/ILendingPoolAddressesProvider.sol';
 import {ILendingRateOracle} from '../../interfaces/ILendingRateOracle.sol';
 import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
-import 'hardhat/console.sol';
 
 /**
  * @title DefaultReserveInterestRateStrategy contract
diff --git a/etherscan/v2AmmPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol b/src/contracts/v2AmmPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol
index 8e38650..e1659d9 100644
--- a/etherscan/v2AmmPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol
+++ b/src/contracts/v2AmmPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol
@@ -49,7 +49,7 @@ contract LendingPool is VersionedInitializable, ILendingPool, LendingPoolStorage
   using PercentageMath for uint256;
   using SafeERC20 for IERC20;
 
-  uint256 public constant LENDINGPOOL_REVISION = 0x2;
+  uint256 public constant LENDINGPOOL_REVISION = 0x3;
 
   modifier whenNotPaused() {
     _whenNotPaused();
@@ -61,6 +61,11 @@ contract LendingPool is VersionedInitializable, ILendingPool, LendingPoolStorage
     _;
   }
 
+  modifier onlyPoolAdmin() {
+    _onlyLendingPoolAdmin();
+    _;
+  }
+
   function _whenNotPaused() internal view {
     require(!_paused, Errors.LP_IS_PAUSED);
   }
@@ -72,6 +77,13 @@ contract LendingPool is VersionedInitializable, ILendingPool, LendingPoolStorage
     );
   }
 
+  function _onlyLendingPoolAdmin() internal view {
+    require(
+      _addressesProvider.getPoolAdmin() == msg.sender,
+      Errors.CALLER_NOT_POOL_ADMIN
+    );
+  }
+
   function getRevision() internal pure override returns (uint256) {
     return LENDINGPOOL_REVISION;
   }
@@ -563,6 +575,17 @@ contract LendingPool is VersionedInitializable, ILendingPool, LendingPoolStorage
     }
   }
 
+  /**
+   * @notice Rescue and transfer tokens locked in this contract
+   * @param token The address of the token
+   * @param to The address of the recipient
+   * @param amount The amount of token to transfer
+   **/
+  function rescueTokens(address token, address to, uint256 amount) external override onlyPoolAdmin {
+    IERC20(token).safeTransfer(to, amount);
+    emit TokensRescued(token, to, amount);
+  }
+
   /**
    * @dev Returns the state and configuration of the reserve
    * @param asset The address of the underlying asset of the reserve
```
