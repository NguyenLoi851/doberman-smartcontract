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

        const borrower = (await deployments.get('Borrower')).address

        console.log('----- START VERIFICATION -----');

        await hre.run('verify:verify', {
            address: borrower,
            constructorArguments: [],
            contract: "contracts/protocol/periphery/Borrower.sol:Borrower"
        })    
    } catch (error) {
        console.log(error);
    }
}

verification.tags = ['VERIFICATION_BORROWER']

export default verification
