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

        const dobermanConfig = (await deployments.get('DobermanConfig_Implementation')).address

        console.log('----- START VERIFICATION -----');

        await hre.run('verify:verify', {
            address: dobermanConfig,
            constructorArguments: [],
            contract: "contracts/protocol/core/DobermanConfig.sol:DobermanConfig"
        })    
    } catch (error) {
        console.log(error);
    }
}

verification.tags = ['VERIFICATION_CONFIG']

export default verification
