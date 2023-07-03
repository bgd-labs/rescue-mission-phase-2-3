```diff
diff --git a/./etherscan/v2AUsdt/AToken/@aave/protocol-v2/contracts/interfaces/IAToken.sol b/./src/contracts/v2AUsdt/AToken/@aave/protocol-v2/contracts/interfaces/IAToken.sol
index cbe1cbb..bbeaf10 100644
--- a/./etherscan/v2AUsdt/AToken/@aave/protocol-v2/contracts/interfaces/IAToken.sol
+++ b/./src/contracts/v2AUsdt/AToken/@aave/protocol-v2/contracts/interfaces/IAToken.sol
@@ -36,6 +36,18 @@ interface IAToken is IERC20, IScaledBalanceToken {
     bytes params
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
    * @dev Mints `amount` aTokens to `user`
    * @param user The address receiving the minted tokens
@@ -113,4 +125,12 @@ interface IAToken is IERC20, IScaledBalanceToken {
    * @dev Returns the address of the incentives controller contract
    **/
   function getIncentivesController() external view returns (IAaveIncentivesController);
+
+  /**
+   * @notice Rescue and transfer tokens locked in this contract
+   * @param token The address of the token
+   * @param to The address of the recipient
+   * @param amount The amount of token to transfer
+   */
+  function rescueTokens(address token, address to, uint256 amount) external;
 }
diff --git a/./etherscan/v2AUsdt/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol b/./src/contracts/v2AUsdt/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol
index 545d68b..e4c4989 100644
--- a/./etherscan/v2AUsdt/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol
+++ b/./src/contracts/v2AUsdt/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol
@@ -27,7 +27,7 @@ contract AToken is VersionedInitializable, IncentivizedERC20, IAToken {
     keccak256('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)');
 
   uint256 public constant UINT_MAX_VALUE = uint256(-1);
-  uint256 public constant ATOKEN_REVISION = 0x2;
+  uint256 public constant ATOKEN_REVISION = 0x3;
   address public immutable UNDERLYING_ASSET_ADDRESS;
   address public immutable RESERVE_TREASURY_ADDRESS;
   ILendingPool public immutable POOL;
@@ -42,6 +42,14 @@ contract AToken is VersionedInitializable, IncentivizedERC20, IAToken {
     _;
   }
 
+  modifier onlyPoolAdmin() {
+    require(
+      _msgSender() == POOL.getAddressesProvider().getPoolAdmin(),
+      Errors.CALLER_NOT_POOL_ADMIN
+    );
+    _;
+  }
+
   constructor(
     ILendingPool pool,
     address underlyingAssetAddress,
@@ -310,6 +318,12 @@ contract AToken is VersionedInitializable, IncentivizedERC20, IAToken {
     _approve(owner, spender, value);
   }
 
+  /// @inheritdoc IAToken
+  function rescueTokens(address token, address to, uint256 amount) external override onlyPoolAdmin {
+    IERC20(token).safeTransfer(to, amount);
+    emit TokensRescued(token, to, amount);
+  }
+
   /**
    * @dev Transfers the aTokens between two users. Validates the transfer
    * (ie checks for valid HF after the transfer) if required
```
