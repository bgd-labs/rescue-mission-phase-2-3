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
