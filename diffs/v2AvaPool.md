```diff
diff --git a/etherscan/v2AvaPool/LendingPool/contracts/interfaces/ILendingPool.sol b/src/contracts/v2AvaPool/LendingPool/contracts/interfaces/ILendingPool.sol
index 64f726c..94d1799 100644
--- a/etherscan/v2AvaPool/LendingPool/contracts/interfaces/ILendingPool.sol
+++ b/src/contracts/v2AvaPool/LendingPool/contracts/interfaces/ILendingPool.sol
@@ -4,8 +4,9 @@ pragma experimental ABIEncoderV2;
 
 import {ILendingPoolAddressesProvider} from './ILendingPoolAddressesProvider.sol';
 import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';
+import {IRescue} from '../../../../interfaces/IRescue.sol';
 
-interface ILendingPool {
+interface ILendingPool is IRescue {
   /**
    * @dev Emitted on deposit()
    * @param reserve The address of the underlying asset of the reserve
diff --git a/etherscan/v2AvaPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol b/src/contracts/v2AvaPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol
index 8e38650..df1bdb8 100644
--- a/etherscan/v2AvaPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol
+++ b/src/contracts/v2AvaPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol
@@ -49,7 +49,7 @@ contract LendingPool is VersionedInitializable, ILendingPool, LendingPoolStorage
   using PercentageMath for uint256;
   using SafeERC20 for IERC20;
 
-  uint256 public constant LENDINGPOOL_REVISION = 0x2;
+  uint256 public constant LENDINGPOOL_REVISION = 0x3;
 
   modifier whenNotPaused() {
     _whenNotPaused();
@@ -65,6 +65,11 @@ contract LendingPool is VersionedInitializable, ILendingPool, LendingPoolStorage
     require(!_paused, Errors.LP_IS_PAUSED);
   }
 
+  modifier onlyPoolAdmin() {
+    _onlyLendingPoolAdmin();
+    _;
+  }
+
   function _onlyLendingPoolConfigurator() internal view {
     require(
       _addressesProvider.getLendingPoolConfigurator() == msg.sender,
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
