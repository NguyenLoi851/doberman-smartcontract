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

        const uniqueIdentity = (await deployments.get('UniqueIdentity')).address

        console.log('----- START VERIFICATION -----');

        await hre.run('verify:verify', {
            address: uniqueIdentity,
            constructorArguments: [],
            contract: "contracts/protocol/core/UniqueIdentity.sol:UniqueIdentity"
        })    
    } catch (error) {
        console.log(error);
    }
}

verification.tags = ['VERIFICATION_UNIQUE_IDENTITY']

export default verification
