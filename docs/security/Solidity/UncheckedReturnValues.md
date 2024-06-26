---
title: UncheckedReturnValues
tags:
- Solidity
---

# UncheckedReturnValues
调用外部智能合约有两种方式：1）通过接口定义调用函数； 2）使用.call方法。如下图所示

```solidity
contract A {
    uint256 public x;

    function setx(uint256 _x) external {
        require(_x > 10, "x must be bigger than 10");
        x = _x;
    }
}

interface IA {
    function setx(uint256 _x) external;
}

contract B {
    function setXV1(IA a, uint256 _x) external {
        a.setx(_x);
    }

    function setXV2(address a, uint256 _x) external {
        (bool success, ) =
            a.call(abi.encodeWithSignature("setx(uint256)", _x));
        // success is not checked!
    }
}
```
在合约 `B` 中，如果 `_x` 小于 `10`，`setXV2` 可能会默默失败。当通过 `.call` 方法调用函数时，被调用方可以恢复，但父级不会恢复。必须检查成功的值，并且代码行为必须相应地分支。