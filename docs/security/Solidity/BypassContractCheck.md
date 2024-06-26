---
title: BypassContractCheck
tags:
- Solidity
---

# BypassContractCheck
有时候合约通过查看地址的字节码大小来“检查”地址是否是智能合约。外部拥有的帐户（常规钱包）没有任何字节码,比如：

```solidity
import "@openzeppelin/contracts/utils/Address.sol"
contract CheckIfContract {

    using Address for address;

    function addressIsContractV1(address _a) {
        return _a.code.length != 0;
    }

    function addressIsContractV2(address _a) {

        // use the openzeppelin libraryreturn _a.isContract();
    }
```

如果合约从构造函数进行外部调用，则明显的字节码大小将为零，因为智能合约部署代码尚未返回运行时代码。或者该空间现在可能是空的，但攻击者可能知道他们将来可以使用 create2 在那里部署智能合约。