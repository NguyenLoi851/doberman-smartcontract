import { BigNumberish, ethers, Signer } from "ethers";
import 'dotenv/config'

const buildSignature = async(
    signer: Signer,
    userAddr: string,
    tokenId: BigNumberish,
    expiresAt: BigNumberish,
    UIDContractAddr: string,
    nonce: BigNumberish,
    chainId: BigNumberish
) => {
    console.log(ethers.solidityPacked(
        ['address', 'uint256', 'uint256', 'address', 'uint256', 'uint256'],
        [userAddr, tokenId, expiresAt, UIDContractAddr, nonce, chainId]
    ));

    const msgHash = ethers.keccak256(
        ethers.solidityPacked(
            ['address', 'uint256', 'uint256', 'address', 'uint256', 'uint256'],
            [userAddr, tokenId, expiresAt, UIDContractAddr, nonce, chainId]
        )
    )

    console.log(msgHash)
    console.log('=')
    console.log(ethers.getBytes(msgHash))
    console.log('=')
    console.log(await signer.signMessage(ethers.toUtf8Bytes(msgHash)))
}

const admin = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY as any)

buildSignature(
    admin, 
    '0xf41BA28610A002440cC724CaD80d31F4554070F8',
    1,
    2000000000,
    '0x05FCE5CB76326Bf9777FA206F1998c71292ad466',
    0,
    11155111
)