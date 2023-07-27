```diff
diff --git a/etherscan/v2EthPool/LendingPool/contracts/interfaces/ILendingPool.sol b/src/contracts/v2EthPool/LendingPool/contracts/interfaces/ILendingPool.sol
index 64f726c..5be5521 100644
--- a/etherscan/v2EthPool/LendingPool/contracts/interfaces/ILendingPool.sol
+++ b/src/contracts/v2EthPool/LendingPool/contracts/interfaces/ILendingPool.sol
@@ -167,6 +167,18 @@ interface ILendingPool {
     uint256 variableBorrowIndex
   );
 
+  /**
+   * @dev Emitted during the token rescue
+   * @param tokenRescued The token which is being rescued
+   * @param receiver The recipient which will receive the rescued token
+   * @param amountRescued The amount being rescued
+   **/
+  event TokensRescued(
+    address indexed tokenRescued,
+    address indexed receiver,
+    uint256 amountRescued
+  );
+
   /**
    * @dev Deposits an `amount` of underlying asset into the reserve, receiving in return overlying aTokens.
    * - E.g. User deposits 100 USDC and gets in return 100 aUSDC
@@ -315,6 +327,14 @@ interface ILendingPool {
     uint16 referralCode
   ) external;
 
+  /**
+   * @notice Rescue and transfer tokens locked in this contract
+   * @param token The address of the token
+   * @param to The address of the recipient
+   * @param amount The amount of token to transfer
+   **/
+  function rescueTokens(address token, address to, uint256 amount) external;
+
   /**
    * @dev Returns the user account data across all the reserves
    * @param user The address of the user
diff --git a/etherscan/v2EthPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol b/src/contracts/v2EthPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol
index ddbc433..5eeef1b 100644
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
@@ -561,6 +573,12 @@ contract LendingPool is VersionedInitializable, ILendingPool, LendingPoolStorage
     }
   }
 
+  /// @inheritdoc ILendingPool
+  function rescueTokens(address token, address to, uint256 amount) external override onlyPoolAdmin {
+    IERC20(token).safeTransfer(to, amount);
+    emit TokensRescued(token, to, amount);
+  }
+
   /**
    * @dev Returns the state and configuration of the reserve
    * @param asset The address of the underlying asset of the reserve
```
