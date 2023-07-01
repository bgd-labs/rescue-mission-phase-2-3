```diff
diff --git a/./etherscan/v1Pool/LendingPool/LendingPool.sol b/./src/contracts/v1Pool/LendingPool/LendingPool.sol
index 8516bfa..01d204f 100644
--- a/./etherscan/v1Pool/LendingPool/LendingPool.sol
+++ b/./src/contracts/v1Pool/LendingPool/LendingPool.sol
@@ -1,19 +1,3 @@
-/**
- *Submitted for verification at Etherscan.io on 2021-04-02
-*/
-
-/**
- *Submitted for verification at Etherscan.io on 2020-11-11
-*/
-
-/**
- *Submitted for verification at Etherscan.io on 2020-02-28
-*/
-
-/**
- *Submitted for verification at Etherscan.io on 2020-01-11
-*/
-
 pragma solidity ^0.5.0;
 
 /**
@@ -3261,6 +3245,7 @@ contract LendingPool is ReentrancyGuard, VersionedInitializable {
     using SafeMath for uint256;
     using WadRayMath for uint256;
     using Address for address;
+    using SafeERC20 for ERC20;
 
     LendingPoolAddressesProvider public addressesProvider;
     LendingPoolCore public core;
@@ -3457,6 +3442,18 @@ contract LendingPool is ReentrancyGuard, VersionedInitializable {
         uint256 _timestamp
     );
 
+    /**
+     * @dev Emitted during the token rescue
+     * @param tokenRescued The token which is being rescued
+     * @param receiver The recipient which will receive the rescued token
+     * @param amountRescued The amount being rescued
+     **/
+    event TokensRescued(
+        address indexed tokenRescued,
+        address indexed receiver,
+        uint256 amountRescued
+    );
+
     /**
     * @dev functions affected by this modifier can only be invoked by the
     * aToken.sol contract
@@ -3499,9 +3496,17 @@ contract LendingPool is ReentrancyGuard, VersionedInitializable {
         _;
     }
 
+    modifier onlyAddressesProviderOwner() {
+        require(
+            msg.sender == addressesProvider.owner(),
+            "The caller of this function can only be the addressesProvider owner"
+        );
+        _;
+    }
+
     uint256 public constant UINT_MAX_VALUE = uint256(-1);
 
-    uint256 public constant LENDINGPOOL_REVISION = 0x5;
+    uint256 public constant LENDINGPOOL_REVISION = 0x6;
 
     function getRevision() internal pure returns (uint256) {
         return LENDINGPOOL_REVISION;
@@ -4126,6 +4131,11 @@ contract LendingPool is ReentrancyGuard, VersionedInitializable {
         emit FlashLoan(_receiver, _reserve, _amount, amountFee, protocolFee, block.timestamp);
     }
 
+    function rescueTokens(address token, address to, uint256 amount) external onlyAddressesProviderOwner {
+        ERC20(token).safeTransfer(to, amount);
+        emit TokensRescued(token, to, amount);
+    }
+
     /**
     * @dev accessory functions to fetch data from the core contract
     **/
```
