```diff
diff --git a/./etherscan/v2PolAToken/AToken/lib/protocol-v2/contracts/interfaces/IAToken.sol b/./src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/interfaces/IAToken.sol
index cf0ea26..e942cdf 100644
--- a/./etherscan/v2PolAToken/AToken/lib/protocol-v2/contracts/interfaces/IAToken.sol
+++ b/./src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/interfaces/IAToken.sol
@@ -46,6 +46,18 @@ interface IAToken is IERC20, IScaledBalanceToken, IInitializableAToken {
    **/
   event BalanceTransfer(address indexed from, address indexed to, uint256 value, uint256 index);
 
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
    * @dev Burns aTokens from `user` and sends the equivalent amount of underlying to `receiverOfUnderlying`
    * @param user The owner of the aTokens, getting them burned
@@ -104,4 +116,12 @@ interface IAToken is IERC20, IScaledBalanceToken, IInitializableAToken {
    * @dev Returns the address of the underlying asset of this aToken (E.g. WETH for aWETH)
    **/
   function UNDERLYING_ASSET_ADDRESS() external view returns (address);
+
+  /**
+   * @notice Rescue and transfer tokens locked in this contract
+   * @param token The address of the token
+   * @param to The address of the recipient
+   * @param amount The amount of token to transfer
+   */
+  function rescueTokens(address token, address to, uint256 amount) external;
 }
diff --git a/./etherscan/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol b/./src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol
index fec453e..64f0a63 100644
--- a/./etherscan/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol
+++ b/./src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol
@@ -30,7 +30,7 @@ contract AToken is
   bytes32 public constant PERMIT_TYPEHASH =
     keccak256('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)');
 
-  uint256 public constant ATOKEN_REVISION = 0x2;
+  uint256 public constant ATOKEN_REVISION = 0x3;
 
   /// @dev owner => next valid nonce to submit with permit()
   mapping(address => uint256) public _nonces;
@@ -42,6 +42,14 @@ contract AToken is
   address internal _underlyingAsset;
   IAaveIncentivesController internal _incentivesController;
 
+  modifier onlyPoolAdmin() {
+    require(
+      _msgSender() == _pool.getAddressesProvider().getPoolAdmin(),
+      Errors.CALLER_NOT_POOL_ADMIN
+    );
+    _;
+  }
+
   modifier onlyLendingPool {
     require(_msgSender() == address(_pool), Errors.CT_CALLER_MUST_BE_LENDING_POOL);
     _;
@@ -359,6 +367,12 @@ contract AToken is
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
