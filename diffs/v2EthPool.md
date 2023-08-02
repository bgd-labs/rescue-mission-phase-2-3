```diff
diff --git a/etherscan/v2EthPool/LendingPool/contracts/interfaces/ILendingPool.sol b/src/contracts/v2EthPool/LendingPool/contracts/interfaces/ILendingPool.sol
index 64f726c..94d1799 100644
--- a/etherscan/v2EthPool/LendingPool/contracts/interfaces/ILendingPool.sol
+++ b/src/contracts/v2EthPool/LendingPool/contracts/interfaces/ILendingPool.sol
@@ -4,8 +4,9 @@ pragma experimental ABIEncoderV2;
 
 import {ILendingPoolAddressesProvider} from './ILendingPoolAddressesProvider.sol';
 import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';
+import {IRescue} from '../../../../interfaces/IRescue.sol';
 
-interface ILendingPool {
+interface ILendingPool is IRescue {
   /**
    * @dev Emitted on deposit()
    * @param reserve The address of the underlying asset of the reserve
diff --git a/etherscan/v2EthPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol b/src/contracts/v2EthPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol
index ddbc433..13f9238 100644
--- a/etherscan/v2EthPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol
+++ b/src/contracts/v2EthPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol
@@ -53,7 +53,7 @@ contract LendingPool is VersionedInitializable, ILendingPool, LendingPoolStorage
   uint256 public constant MAX_STABLE_RATE_BORROW_SIZE_PERCENT = 2500;
   uint256 public constant FLASHLOAN_PREMIUM_TOTAL = 9;
   uint256 public constant MAX_NUMBER_RESERVES = 128;
-  uint256 public constant LENDINGPOOL_REVISION = 0x3;
+  uint256 public constant LENDINGPOOL_REVISION = 0x4;
 
   modifier whenNotPaused() {
     _whenNotPaused();
@@ -65,6 +65,11 @@ contract LendingPool is VersionedInitializable, ILendingPool, LendingPoolStorage
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
@@ -76,6 +81,13 @@ contract LendingPool is VersionedInitializable, ILendingPool, LendingPoolStorage
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
@@ -561,6 +573,17 @@ contract LendingPool is VersionedInitializable, ILendingPool, LendingPoolStorage
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
