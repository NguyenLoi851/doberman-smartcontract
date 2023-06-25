require('dotenv').config()

import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const verification: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    try {
        const { ethers, deployments, getNamedAccounts } = hre
        const { deployer } = await getNamedAccounts()

        await new Promise((res, _) => {
            setTimeout(() => {
                res(true)
            }, 30)
        })

        const fixedLeverageRatioStrategy = (await deployments.get('FixedLeverageRatioStrategy_Implementation')).address

        console.log('----- START VERIFICATION -----');

        await hre.run('verify:verify', {
            address: fixedLeverageRatioStrategy,
            constructorArguments: [],
            contract: "contracts/protocol/core/FixedLeverageRatioStrategy.sol:FixedLeverageRatioStrategy"
        })
    } catch (error) {
        console.log(error);
    }
}

verification.tags = ['VERIFICATION_FIXED_LEVERAGE_RATIO_STRATEGY']
verification.dependencies = ['FIXED_LEVERAGE_RATIO_STRATEGY']

export default verification
