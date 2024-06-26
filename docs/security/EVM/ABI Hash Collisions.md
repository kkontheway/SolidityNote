---
title: ABI Hash Collisions
tags:
- ABI
- EVM
---
# ABI Hash Collisions
`ABI Hash Collisions`是指 `ABI` 编码格式的漏洞类型，智能合约使用该格式对发送到函数的调用数据进行编码和解码。然而，智能合约开发人员也可以使用它来编码和解码自定义参数。

一般使用这两种：`abi.encode` 和 `abi.encodePacked` 。虽然`abi.encode`更安全，但`abi.encode`会导致结果数据大小显着增大，从而提高了 Gas 成本，尤其是在存储时。因此，后者 `abi.encodePacked` 得到了更广泛的使用，尽管由于动态变量打包在一起时发生哈希冲突的可能性更高，风险也增加了

# Example
```solidity
pragma solidity ^0.8.17;


contract RoyaltyRegistry {
    uint256 constant regularPayout = 0.1 ether;
    uint256 constant premiumPayout = 1 ether;
    mapping (bytes32 => bool) allowedPayouts;

    function claimRewards(address[] calldata privileged, address[] calldata regular) external {
        bytes32 payoutKey = keccak256(abi.encodePacked(privileged, regular));
        require(allowedPayouts[payoutKey], "Unauthorized claim");
        allowedPayouts[payoutKey] = false;
        _payout(privileged, premiumPayout);
        _payout(regular, regularPayout);
    }

    function _payout(address[] calldata users, uint256 reward) internal {
        for(uint i = 0; i < users.length;) {
            (bool success, ) = users[i].call{value: reward}("");
            if (!success) {
                // more code handling pull payment
            }
            unchecked {
                ++i;
            }
        }
    }
}
```
该合约通过区分了特权用户和普通用户，并且各自的payout奖金各不相同:
```
bytes32 payoutKey = keccak256(abi.encodePacked(privileged, regular));
```
但是因为有ABI Hash Collisions冲突所以:
```solidity
hash1 = keccak256(abi.encodePacked([addr1], [addr2, addr3]));
hash2 = keccak256(abi.encodePacked([addr1, addr2], [addr3]));
require(hash1 == hash2);
```
这样的写法是可以通过的，这样的话就产生了越权。