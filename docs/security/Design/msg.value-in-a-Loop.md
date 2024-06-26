---
title: Msg.value in a Loop
tags:
- DesignIssue
---

# Msg.value in a Loop
在循环内使用 `msg.value` 是危险的，因为这可能允许发送者“重复使用”`msg.value`。

这可能会出现在`payable`的`multiCall`中。Multicall使用户能够提交交易列表，以避免一遍又一遍地支付 `21,000 Gas` 交易费。然而，`msg.value`在循环执行函数时被“重用”，这可能使用户能够双花。
# Example-1
```solidity
contract MsgValueInLoop{

    mapping (address => uint256) balances;

    function bad(address[] memory receivers) public payable {
        for (uint256 i=0; i < receivers.length; i++) {
            balances[receivers[i]] += msg.value;
        }
    }

}
```
例子来源：`Slither`

# Example-2
```solidity
import "sce/sol/IERC20.sol";

contract MultiTokenBank {
    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    mapping(address => mapping(address => uint256)) balances;

    function depositMany(
        address[] calldata _tokens,
        uint256[] calldata _amounts
    ) public payable {
        for (uint256 i = 0; i < _tokens.length; i++) {
            deposit(_tokens[i], _amounts[i]);
        }
    }

    function deposit(address _token, uint256 _amount) public payable {
        if (_token == ETH) {
            require(_amount == msg.value, "amount != msg.value");
        } else {
            IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        }
        balances[_token][msg.sender] += _amount;
    }

    function withdraw(address _token, uint256 _amount) public {
        balances[_token][msg.sender] -= _amount;

        if (_token == ETH) {
            payable(msg.sender).transfer(_amount);
        } else {
            IERC20(_token).transfer(msg.sender, _amount);
        }
    }
}
```