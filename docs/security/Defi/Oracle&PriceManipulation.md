---
title: Oracle&PriceManipulation
tags:
- Defi-Attack
---
# 5.Oracle&PriceManipulation
正如我们知道的，EVM是一个封闭的沙盒。在EVM上运行智能合约可以获取链上信息，但是无法主动和外界沟通从而获取链下信息，但是获取链下信息对于去中心化应用来说是非常重要的，所以我们有了预言机

预言机（Oracle）可以帮助我们解决这个问题，它从链下数据源获得信息，并将其添加到链上，供智能合约使用。

其中最常用的就是价格预言机（price oracle），它可以指代任何可以让你查询币价的数据源。典型用例：
- 去中心借贷平台（AAVE）使用它来确定借款人是否已达到清算阈值。
- 合成资产平台（Synthetix）使用它来确定资产最新价格，并支持 0 滑点交易。
- MakerDAO使用它来确定抵押品的价格，并铸造相应的稳定币 $DAI。

在以太坊上，一切都是智能合约，价格预言机也是如此。因此，区分价格预言机如何获取其价格信息更有用。在一种方法中，您可以简单地从价格 API 或交易所获取现有的链下价格数据并将其带到链上。另一方面，您可以通过咨询链上去中心化交易所来计算瞬时价格。
# Example
[ExampleByCyfrin](https://github.com/Cyfrin/sc-exploits-minimized)

# Twap Oracle Manipulation Risks
在看这个之前，我们需要先学习一下[Twap](https://kkweb3doc.vercel.app/solidity/Defi/UniswapV2/TWAP)是什么？

具体的攻击可能就是，破坏多个Pool的价格平衡，并且维持一段时间的区块，从而让Twap获取的价格，是恶意的。只是成功有点高，因为一旦价格被破坏，就会有套利机器人来进行搬砖，从而把价格差抹平。

# CTF
- Damnvulnerabledefi-Puppet/PuppetV2/Selfie/The Rewarder
- Ethernaut-DEX2

# Refer
- https://github.com/0xcacti/awesome-oracle-manipulation#github-repos
  
- https://www.paradigm.xyz/2020/11/so-you-want-to-use-a-price-oracle

- https://youtube.com/watch?v=Mu8ytTyStOU

- https://github.com/WTFAcademy/WTF-Solidity/tree/main/S15_OracleManipulation