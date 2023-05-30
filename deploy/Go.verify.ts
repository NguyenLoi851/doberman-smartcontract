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

        const go = (await deployments.get('Go_Implementation')).address

        console.log('----- START VERIFICATION -----');

        await hre.run('verify:verify', {
            address: go,
            constructorArguments: [],
            contract: "contracts/protocol/core/Go.sol:Go"
        })    
    } catch (error) {
        console.log(error);
    }
}

verification.tags = ['VERIFICATION_GO']

export default verification
