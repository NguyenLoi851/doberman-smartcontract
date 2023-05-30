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

        const accountant = (await deployments.get('Accountant')).address

        console.log('----- START VERIFICATION -----');

        await hre.run('verify:verify', {
            address: accountant,
            constructorArguments: [],
            contract: "contracts/protocol/core/Accountant.sol:Accountant"
        })    

        const creditLine = (await deployments.get('CreditLine')).address

        console.log('----- START VERIFICATION -----');

        await hre.run('verify:verify', {
            address: creditLine,
            constructorArguments: [],
            contract: "contracts/protocol/core/CreditLine.sol:CreditLine"
        })    
    } catch (error) {
        console.log(error);
    }
}

verification.tags = ['VERIFICATION_CREDIT_LINE']

export default verification
