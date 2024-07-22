---
title: Permit2
---

## 什么是Permit2
---
Permit2是Uniswap想出来的新鲜事物：
Permit就相当于一个取款条子，从Approve进化过来的。
Permit2就是为了不需要先approve然后在取钱，付两笔Gas，而是直接给Uniswap无限的授权，这样只需要每次转账的时候签一次名即可。

Permit是ERC-20的一个授权扩展功能，Permit2是Uniswap推出的一个新功能。

## 工作原理
用户不是向单个智能合约批准特定的代币数量，而是向中央 Permit2 合约授予权限。
可以向特定的智能合约或任何支持 Permit2 的合约授予权限。

`Permit2`合约获得批准后，可用于向其他智能合约授予子批准。这可以通过`Permit2.approve()`函数来完成，该函数的工作方式与`ERC20`代币上的`approve()`函数类似。但也可以通过 `Permit2.permit()`函数来完成，其工作原理类似于`EIP2612 permit()`函数。

基于签名的审批：当用户想要与需要代币支出的智能合约进行交互时，他们不需要进行单独的审批交易。

取而代之的是，用户使用他们的私钥在链下签署一条消息，授予智能合约代表他们花费特定数量的代币的权限。

签名消息包括令牌地址、要花费的金额和智能合约地址等详细信息。
智能合约交互：当智能合约想要代表用户花费代币时，它会调用带有用户签名消息的 Permit2 合约。
