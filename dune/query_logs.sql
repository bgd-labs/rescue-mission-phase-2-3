SELECT topic1, block_number, tx_hash, data FROM {{networkTable}}
WHERE
    contract_address = {{tokenAddress}} AND
    topic0 = {{topic0}} AND -- transfer signature
    topic2 = {{topic2}} AND
    block_number >= {{fromBlock}} AND
    block_number <= {{toBlock}}
AND tx_hash NOT IN
(
    -- supply, repay, liqudation, flashloan events to filter out
    -- supply
    SELECT tx_hash FROM ({{networkTable}})
    WHERE
        contract_address = {{poolContract}} AND
        topic0 = {{supplyTopic0}} AND
        topic1 = {{supplyTopic1}} AND
        block_number >= {{fromBlock}} AND
        block_number <= {{toBlock}}
    UNION
    -- repay
    SELECT tx_hash FROM ({{networkTable}})
    WHERE
        contract_address = {{poolContract}} AND
        topic0 = {{repayTopic0}} AND
        topic1 = {{repayTopic1}} AND
        block_number >= {{fromBlock}} AND
        block_number <= {{toBlock}}
    UNION
    -- liquidation
    SELECT tx_hash FROM ({{networkTable}})
    WHERE
        contract_address = {{poolContract}} AND
        topic0 = {{liquidationTopic0}} AND
        topic2 = {{liquidationTopic2}} AND
        block_number >= {{fromBlock}} AND
        block_number <= {{toBlock}}
    UNION
    -- flashloan
    SELECT tx_hash FROM ({{networkTable}})
    WHERE
        contract_address = {{poolContract}} AND
        topic0 = {{flashloanTopic0}} AND
        ({{flashloanTopic2}} = 0x OR topic2 = {{flashloanTopic2}}) AND
        ({{flashloanTopic3}} = 0x OR topic3 = {{flashloanTopic3}}) AND
        block_number >= {{fromBlock}} AND
        block_number <= {{toBlock}}
)
