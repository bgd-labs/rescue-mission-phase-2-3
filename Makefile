# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

# deps
update:; forge update

# Build & test
build  :; forge build --sizes
test   :; forge test -vvv

# Utilities
download :; cast etherscan-source --chain ${chain} -d src/etherscan/${chain}_${address} ${address}
git-diff :
	@mkdir -p diffs
	@printf '%s\n%s\n%s\n' "\`\`\`diff" "$$(git diff --no-index --diff-algorithm=patience --ignore-space-at-eol ${before} ${after})" "\`\`\`" > diffs/${out}.md

diff-contracts :;
	make git-diff before=etherscan/v1Pool after=src/contracts/v1Pool out=v1Pool
	make git-diff before=etherscan/v2AmmPool after=src/contracts/v2AmmPool out=v2AmmPool
	make git-diff before=etherscan/v2EthPool after=src/contracts/v2EthPool out=v2EthPool
	make git-diff before=etherscan/v2PolPool after=src/contracts/v2PolPool out=v2PolPool
	make git-diff before=etherscan/v2AvaPool after=src/contracts/v2AvaPool out=v2AvaPool
	make git-diff before=etherscan/v2EthAToken after=src/contracts/v2EthAToken out=v2EthAToken
	make git-diff before=etherscan/v2PolAToken after=src/contracts/v2PolAToken out=v2PolAToken

storage-diff:
	forge inspect etherscan/v1Pool/LendingPool/LendingPool.sol:LendingPool storage-layout --pretty > reports/v1Pool_layout.md
	forge inspect src/contracts/v1Pool/LendingPool/LendingPool.sol:LendingPool storage-layout --pretty > reports/rescue_v1Pool_layout.md
	make git-diff before=reports/v1Pool_layout.md after=reports/rescue_v1Pool_layout.md out=v1Pool_layout_diff
	forge inspect etherscan/v2AmmPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol:LendingPool storage-layout --pretty > reports/v2AmmPool_layout.md
	forge inspect src/contracts/v2AmmPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol:LendingPool storage-layout --pretty > reports/rescue_v2AmmPool_layout.md
	make git-diff before=reports/v2AmmPool_layout.md after=reports/rescue_v2AmmPool_layout.md out=v2AmmPool_layout_diff
	forge inspect etherscan/v2EthPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol:LendingPool storage-layout --pretty > reports/v2EthPool_layout.md
	forge inspect src/contracts/v2EthPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol:LendingPool storage-layout --pretty > reports/rescue_v2EthPool_layout.md
	make git-diff before=reports/v2EthPool_layout.md after=reports/rescue_v2EthPool_layout.md out=v2EthPool_layout_diff
	forge inspect etherscan/v2PolPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol:LendingPool storage-layout --pretty > reports/v2PolPool_layout.md
	forge inspect src/contracts/v2PolPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol:LendingPool storage-layout --pretty > reports/rescue_v2PolPool_layout.md
	make git-diff before=reports/v2PolPool_layout.md after=reports/rescue_v2PolPool_layout.md out=v2PolPool_layout_diff
	forge inspect etherscan/v2AvaPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol:LendingPool storage-layout --pretty > reports/v2AvaPool_layout.md
	forge inspect src/contracts/v2AvaPool/LendingPool/contracts/protocol/lendingpool/LendingPool.sol:LendingPool storage-layout --pretty > reports/rescue_v2AvaPool_layout.md
	make git-diff before=reports/v2AvaPool_layout.md after=reports/rescue_v2AvaPool_layout.md out=v2AvaPool_layout_diff
	forge inspect etherscan/v2EthAToken/AToken/\@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol:AToken storage-layout --pretty > reports/v2EthAToken_layout.md
	forge inspect src/contracts/v2EthAToken/AToken/\@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol:AToken storage-layout --pretty > reports/rescue_v2EthAToken_layout.md
	make git-diff before=reports/v2EthAToken_layout.md after=reports/rescue_v2EthAToken_layout.md out=v2EthAToken_layout_diff
	forge inspect etherscan/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol:AToken storage-layout --pretty > reports/v2PolAToken_layout.md
	forge inspect src/contracts/v2PolAToken/AToken/lib/protocol-v2/contracts/protocol/tokenization/AToken.sol:AToken storage-layout --pretty > reports/rescue_v2PolAToken_layout.md
	make git-diff before=reports/v2PolAToken_layout.md after=reports/rescue_v2PolAToken_layout.md out=v2PolAToken_layout_diff

deploy-eth-contracts :; forge script scripts/EthDeploy.s.sol:EthDeploy --rpc-url ${RPC_MAINNET} --broadcast --legacy --ledger --mnemonic-indexes ${MNEMONIC_INDEX} --sender ${LEDGER_SENDER} --etherscan-api-key ${ETHERSCAN_API_KEY_MAINNET} --gas-estimate-multiplier 100 --verify -vvvv
deploy-pol-contracts :; forge script scripts/PolDeploy.s.sol:PolDeploy --rpc-url ${RPC_POLYGON} --broadcast --legacy --ledger --mnemonic-indexes ${MNEMONIC_INDEX} --sender ${LEDGER_SENDER} --etherscan-api-key ${ETHERSCAN_API_KEY_POLYGON} --gas-estimate-multiplier 100 --verify -vvvv
