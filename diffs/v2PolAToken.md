```diff
diff --git a/etherscan/v2PolAToken/AToken/lib/protocol-v2/contracts/interfaces/IAToken.sol b/src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/interfaces/IAToken.sol
index cf0ea26..219c179 100644
--- a/etherscan/v2PolAToken/AToken/lib/protocol-v2/contracts/interfaces/IAToken.sol
+++ b/src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/interfaces/IAToken.sol
@@ -5,8 +5,9 @@ import {IERC20} from '../dependencies/openzeppelin/contracts/IERC20.sol';
 import {IScaledBalanceToken} from './IScaledBalanceToken.sol';
 import {IInitializableAToken} from './IInitializableAToken.sol';
 import {IAaveIncentivesController} from './IAaveIncentivesController.sol';
+import {IRescue} from '../../../../../../interfaces/IRescue.sol';
 
-interface IAToken is IERC20, IScaledBalanceToken, IInitializableAToken {
+interface IAToken is IERC20, IScaledBalanceToken, IInitializableAToken, IRescue {
   /**
    * @dev Emitted after the mint action
    * @param from The address performing the mint
diff --git a/etherscan/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol b/src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol
index fec453e..f747682 100644
--- a/etherscan/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol
+++ b/src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol
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
@@ -359,6 +367,17 @@ contract AToken is
     _approve(owner, spender, value);
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
    * @dev Transfers the aTokens between two users. Validates the transfer
    * (ie checks for valid HF after the transfer) if required
```
