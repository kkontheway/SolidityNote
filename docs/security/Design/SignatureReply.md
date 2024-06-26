---
title: SignatureReply
tags:
- DesignIssue
- SignatureReply
---
# SignatureReply
数字签名一般有两种常见的重放攻击：

普通重放：将本该使用一次的签名多次使用。
跨链重放：将本该在一条链上使用的签名，在另一条链上重复使用。

# Type of SignatureReply

## Basic SignatureReply
签名可以被多次使用
```solidity
function transferFunds(address _to, uint256 _amount, uint8 _v, bytes32 _r, bytes32 _s) external {
    bytes32 messageHash = keccak256(abi.encodePacked(_to, _amount));
    address signer = ecrecover(messageHash, _v, _r, _s);
    require(signer == msg.sender, "Invalid signature");
    payable(_to).transfer(_amount);
}
```
## Missing Nonce reply
漏洞代码：
```solidity
function addKYCAddressViaSignature( 
    uint256 kycRequirementGroup,
    address user,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s ) external {
    // ...
    bytes32 structHash = keccak256(
      abi.encode(_APPROVAL_TYPEHASH, kycRequirementGroup, user, deadline)
    );

    bytes32 expectedMessage = _hashTypedDataV4(structHash);

    address signer = ECDSA.recover(expectedMessage, v, r, s);
    // ...
}
```
`addKYCAddressViaSignature()` 使用签名向用户（签名者）授予 `KYC` 状态。然而，如果 `KYC` 身份随后被撤销会发生什么？用户只需重放原始签名即可再次授予 `KYC` 状态。

## Cross Chain Reply
许多智能合约从同一合约地址在多个链上运行，并且用户类似地跨多个链操作同一地址。
Code:
```solidity
function getHash(UserOperation calldata userOp)
public pure returns (bytes32) {
    //can't use userOp.hash(), since it contains also the paymasterAndData itself.
    return keccak256(abi.encode(
            userOp.getSender(),
            userOp.nonce,
            keccak256(userOp.initCode),
            keccak256(userOp.callData),
            userOp.callGasLimit,
            userOp.verificationGasLimit,
            userOp.preVerificationGas,
            userOp.maxFeePerGas,
            userOp.maxPriorityFeePerGas
        ));
}
```
由于 `UserOperation` 未使用 `chain_id` 进行签名或验证，因此攻击者可以复制一条链上使用的有效签名并将其传播到另一条链上，在另一条链上它对于同一用户和合约地址也有效为了防止跨链签名重放攻击，智能合约必须使用`chain_id`验证签名，并且用户必须将`chain_id`包含在要签名的消息中。

## Missing Parameter
假如一个有一个合约，通过签名来判断是否允许一个合约花费代币，要花费的代币数量并不是签名的一部分的话，那么就有可能造成大问题:
Example From Code4rena:
```solidity
function encodeTransactionData(
    Transaction memory _tx,
    FeeRefund memory refundInfo,
    uint256 _nonce
) public view returns (bytes memory) {
    bytes32 safeTxHash =
        keccak256(
            abi.encode(
                ACCOUNT_TX_TYPEHASH,
                _tx.to,
                _tx.value,
                keccak256(_tx.data),
                _tx.operation,
                _tx.targetTxGas,
                refundInfo.baseGas,
                refundInfo.gasPrice,
                refundInfo.gasToken,
                refundInfo.refundReceiver,
                _nonce
            )
        );
    return abi.encodePacked(bytes1(0x19), bytes1(0x01), domainSeparator(), safeTxHash);
}

function handlePaymentRevert(
    uint256 gasUsed,
    uint256 baseGas,
    uint256 gasPrice,
    uint256 tokenGasPriceFactor,
    address gasToken,
    address payable refundReceiver
) external returns (uint256 payment) {
    // ...
    payment = (gasUsed + baseGas) * (gasPrice) / (tokenGasPriceFactor);
    // ...
}
```
在这个例子中，签名允许用户签署允许向交易提供者退款的交易，但是在计算退款的时候，会有一个参数`tokenGasPriceFactor` 用来计算实际的退款金额，这个金额没有包含在签名中，所以可以导致恶意攻击者，提供一个足够大的数字，从而耗尽合约的资产。
## No Expiration
用户签名的签名应始终具有过期时间或时间戳期限，以便在该时间之后签名不再有效。如果签名没有过期，则用户通过签署消息实际上授予了“终身许可证”。
```solidity
function call(
    address instance,
    bytes calldata data,
    bytes calldata signature
)
    external
    payable
    operatorOnly(instance)
    signedOnly(abi.encodePacked(msg.sender, instance, data), signature)
{
    _call(instance, data, msg.value);
}
```

## Unchecked ecrecover() return
Solidity 的 `ecrecover()` 函数返回签名地址，如果签名无效则返回` 0`；必须检查 `ecrecover()` 的返回值以检测无效签名！



# Mitagation
1. 跟踪随机数Nonce
2. 使用当前的随机数让signers签名
3. 使用当前随机数验证前面
4. 一旦使用了随机数，记得保存，从而让他无法被再次使用
# Refer
https://dacian.me/signature-replay-attacks
https://github.com/AmazingAng/WTF-Solidity/blob/main/S06_SignatureReplay/readme.md
https://medium.com/immunefi/intro-to-cryptography-and-signatures-in-ethereum-2025b6a4a33d