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


        console.log('----- START VERIFICATION -----');

        try {
            const tranchingLogic = (await deployments.get('TranchingLogic')).address

            await hre.run('verify:verify', {
                address: tranchingLogic,
                constructorArguments: [],
                contract: "contracts/protocol/core/TranchingLogic.sol:TranchingLogic"
            })    
        } catch (error) {
            console.log(error)
        }

        const tranchedPool = (await deployments.get('TranchedPool')).address

        console.log('----- START VERIFICATION -----');

        await hre.run('verify:verify', {
            address: tranchedPool,
            constructorArguments: [],
            contract: "contracts/protocol/core/TranchedPool.sol:TranchedPool"
        })    
    } catch (error) {
        console.log(error);
    }
}

verification.tags = ['VERIFICATION_TRANCHED_POOL']
verification.dependencies = ['TRANCHED_POOL']

export default verification
