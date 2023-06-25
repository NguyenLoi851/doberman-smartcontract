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

        const fidu = (await deployments.get('Fidu_Implementation')).address

        console.log('----- START VERIFICATION -----');

        await hre.run('verify:verify', {
            address: fidu,
            constructorArguments: [],
            contract: "contracts/protocol/core/Fidu.sol:Fidu"
        })    
    } catch (error) {
        console.log(error);
    }
}

verification.tags = ['VERIFICATION_FIDU']

export default verification
