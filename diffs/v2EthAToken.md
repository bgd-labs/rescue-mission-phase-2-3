```diff
diff --git a/etherscan/v2EthAToken/AToken/@aave/protocol-v2/contracts/interfaces/IAToken.sol b/src/contracts/v2EthAToken/AToken/@aave/protocol-v2/contracts/interfaces/IAToken.sol
index cbe1cbb..bff86c7 100644
--- a/etherscan/v2EthAToken/AToken/@aave/protocol-v2/contracts/interfaces/IAToken.sol
+++ b/src/contracts/v2EthAToken/AToken/@aave/protocol-v2/contracts/interfaces/IAToken.sol
@@ -4,8 +4,9 @@ pragma solidity 0.6.12;
 import {IERC20} from '../dependencies/openzeppelin/contracts/IERC20.sol';
 import {IScaledBalanceToken} from './IScaledBalanceToken.sol';
 import {IAaveIncentivesController} from './IAaveIncentivesController.sol';
+import {IRescue} from '../../../../../../interfaces/IRescue.sol';
 
-interface IAToken is IERC20, IScaledBalanceToken {
+interface IAToken is IERC20, IScaledBalanceToken, IRescue {
   /**
    * @dev Emitted after the mint action
    * @param from The address performing the mint
diff --git a/etherscan/v2EthAToken/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol b/src/contracts/v2EthAToken/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol
index 545d68b..967bc70 100644
--- a/etherscan/v2EthAToken/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol
+++ b/src/contracts/v2EthAToken/AToken/@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol
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
@@ -310,6 +318,17 @@ contract AToken is VersionedInitializable, IncentivizedERC20, IAToken {
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
