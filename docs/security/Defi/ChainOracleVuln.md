---
title: ChainLink Attack
---

# Brief
Here are my Note from [Dacian's research](https://medium.com/cyfrin/chainlink-oracle-defi-attacks-93b6cb6541bf),Big respect!

# Content
- Not Checking For Stale Prices
- Not Checking For Down L2 Sequencer
- Same Heartbeat Used For Multiple Price Feeds
- Oracle Price Feeds Not Updated Frequently
- Request Confirmation < Depth of Chain Re-Orgs
- Assuming Oracle Price Precision
- Incorrect Oracle Price Feed Address
- Oracle Price Updates Can Be Front-Run
- Unhandled Oracle Revert Denial Of Service
- Unhandled Depeg Of Bridged Assets
- Oracle Returns Incorrect Price During Flash Crashes
- Placing Bets After Randomness Request
- Re-requesting Randomness

# Not Checking For Stale Prices
---
很多智能合约使用Chainlink来请求链下数据，但如果合约不检查是否是最新数据的时候，就会出现错误。

```solidity
// @audit no check for stale price data
(, int256 price, , , ) = priceFeedDAIETH.latestRoundData();

return
    (wethPriceUSD * 1e18) /
    ((DAIWethPrice + uint256(price) * 1e10) / 2);
```
应该始终检查从 latestRoundData() 返回的 updatedAt 参数并将其与过时阈值进行比较：
```solidity
// @audit fixed to check for stale price data
(, int256 price, , uint256 updatedAt, ) = priceFeedDAIETH.latestRoundData();

if (updatedAt < block.timestamp - 60 * 60 /* 1 hour */) {
   revert("stale price feed");
}

return
    (wethPriceUSD * 1e18) /
    ((DAIWethPrice + uint256(price) * 1e10) / 2);
```

# Incorrect Oracle Price Feed Address
---
有些项目会对预言机喂价地址进行硬编码。其他人将在合约部署期间在部署脚本中设置地址。无论地址位于何处，审计人员都应检查它们是否指向正确的预言机价格。检查 Sherlock 的 USSD 竞赛中的这段代码：
```solidity
// @audit correct address here, but wrong address in constructor
// chainlink btc/usd priceFeed 0xf4030086522a5beea4988f8ca5b36dbc97bee88c;
contract StableOracleWBTC is IStableOracle {
    AggregatorV3Interface priceFeed;

    constructor() {
        priceFeed = AggregatorV3Interface(
            // @audit wrong address; this is ETH/USD not BTC/USD !
            0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
        );
    
```

# Refer
https://33audits.hashnode.dev/twap-oracles-for-auditors
https://medium.com/cyfrin/chainlink-oracle-defi-attacks-93b6cb6541bf