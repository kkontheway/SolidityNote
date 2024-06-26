---
title: InflationAttack
tags:
- Defi-Attack
- AMM
---

## 3.InflationAttack
---
先了解一下ERC4626.
ERC4626是Vault，但是Vault不一定符合ERC4626规范。

## **Theory**
---

最基础的份额计算公式:

```
(amountOfDeposit * totalSupplyOfVault)/balanceOfDeposit
```
那取款呢？

```
(amountOfWithDraw * balanceOfDeposit) / totalSupplyOfVault
```

## **Scenario**
---
我们来假设一个最简单的攻击场景:
- Bob: User
- Hacker
现在Bob要向一个存在通胀攻击的Vault充值1000 ETH，Hacker监控到了所以抢先运行:
1. Hacker先存入了`1 wei`, 一般的`Vault`第一次存储资产时，也就是`totalSupplyOfVault == 0` 的时候，会`mint`和存入的`amount`一样的`shares`，所以这个时候`Vault`的状态是:

```
|Deposit |Shares | TotalSupply| BalanceOfVault
----------------------------------------------------
|1 wei   |1 wei  | 1 wei      | 1 wei
```
2. 之后Hacker继续转入`1000 ETH`，但是他不是通过`Deposit`转入的，他是通过直接`transfer`转入的，所以在这个时候`Vault`的状态是
```
|Deposit |Shares | TotalSupply| BalanceOfVault
----------------------------------------------------
|1 wei   |1 wei  | 1 wei      | 1000ether + 1 wei
```
3. 这个时候Bob存入的ETH，按照我们上面的公式来看也就是:
```
(1000 ether * 1 wei) / 1000 ether +1 wei == 0
```
4. Hacker选择withdraw，他就可以把Vault所有的余额拿走，因为Hacker有全部的流动性
## **Code Example**
---
Code4rena-kelp
## **Mitigations**
---

- Using epoch system
- Bootstrapping the vault
- Adding decimals to vault tokens
- change calculation Logic
	- Do not use balanceOf()

## **Refer**
---
- https://r4bbit.vercel.app/blog/defi-inflation-attacks
- https://www.shieldify.org/post/inflation-attack