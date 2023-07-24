import { BigNumberish, ethers, Signer } from "ethers";
import 'dotenv/config'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// const buildSignature = async(
//     signer: Signer,
//     userAddr: string,
//     tokenId: BigNumberish,
//     expiresAt: BigNumberish,
//     UIDContractAddr: string,
//     nonce: BigNumberish,
//     chainId: BigNumberish
// ) => {
//     console.log(ethers.solidityPacked(
//         ['address', 'uint256', 'uint256', 'address', 'uint256', 'uint256'],
//         [userAddr, tokenId, expiresAt, UIDContractAddr, nonce, chainId]
//     ));

//     const msgHash = ethers.keccak256(
//         ethers.solidityPacked(
//             ['address', 'uint256', 'uint256', 'address', 'uint256', 'uint256'],
//             [userAddr, tokenId, expiresAt, UIDContractAddr, nonce, chainId]
//         )
//     )

//     console.log(msgHash)
//     console.log('=')
//     console.log(ethers.getBytes(msgHash))
//     console.log('=')
//     console.log(await signer.signMessage(ethers.toUtf8Bytes(msgHash)))
//     console.log(await signer.signMessage(ethers.getBytes(msgHash)))
// }

// const admin = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY as any)

// buildSignature(
//     admin, 
//     '0x34E0Ab7Ac91e9c2281Ead1b215F3c95EfAf0f215',
//     1,
//     2000000000,
//     '0x5042f8CCCDDaBD2deEBa9E9B6b8255a67a7C56a6',
//     0,
//     80001
// )

export const buildMintUIDAllowanceSignatureEIP191 = async (signer: SignerWithAddress, lper: string, uIdType: BigNumberish, deadline1: BigNumberish, uIdContractAddr: string, nonces: BigNumberish, chainId: BigNumberish) => {
    const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256", "address", "uint256", "uint256"],
        [lper, uIdType, deadline1, uIdContractAddr, nonces, chainId]
    )
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash))
    return signature
}

export type Domain = {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: any;
};


export const buildMintUIDAllowanceSignatureEIP712 = async (
    signer: SignerWithAddress,
    domain: Domain,
    account: string,
    id: BigNumberish,
    expiresAt: BigNumberish,
    nonces: BigNumberish
) => {
    const types = {
        MintAllowance: [
            { name: 'account', type: 'address' },
            { name: 'id', type: 'uint256' },
            { name: 'expiresAt', type: 'uint256' },
            { name: 'nonces', type: 'uint256' },
        ],
    }

    const value = {
        account: account,
        id: id as any,
        expiresAt: expiresAt as any,
        nonces: nonces as any,
    }


    return signer._signTypedData(domain, types, value)
}

export const buildPermitSignature = async (
    signer: SignerWithAddress,
    domain: Domain,
    spender: string,
    value: BigNumberish,
    nonce: BigNumberish,
    deadline: BigNumberish,
) => {
    const types = {
        Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    }

    const values = {
        owner: signer.address,
        spender,
        value,
        nonce,
        deadline,
    }

    return {
        ...ethers.utils.splitSignature(await signer._signTypedData(domain, types, values)),
    };
}
