require('dotenv').config()

import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const verification: DeployFunction = async(hre: HardhatRuntimeEnvironment) =>{

    try {
        const { ethers, deployments, getNamedAccounts} = hre
        const { deployer } = await getNamedAccounts()

        await new Promise((res, _) =>{
            setTimeout(()=>{
                res(true)
            }, 30)
        })

        const usdc = (await deployments.get('FiatTokenV2_Implementation')).address

        console.log('----- START VERIFICATION -----');

        await hre.run('verify:verify', {
            address: usdc,
            constructorArguments: [],
            contract: "contracts/mocks/USDC.sol:FiatTokenV2"
        })    
    } catch (error) {
        console.log(error);
    }
}

verification.tags = ['VERIFICATION_USDC']

export default verification
