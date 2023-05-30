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

        const backerRewards = (await deployments.get('BackerRewards_Implementation')).address

        console.log('----- START VERIFICATION -----');

        await hre.run('verify:verify', {
            address: backerRewards,
            constructorArguments: [],
            contract: "contracts/rewards/BackerRewards.sol:BackerRewards"
        })    
    } catch (error) {
        console.log(error);
    }
}

verification.tags = ['VERIFICATION_BACKER_REWARDS']

export default verification
