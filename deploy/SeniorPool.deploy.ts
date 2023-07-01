import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deploySeniorPool: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const configAddress = (await deployments.get('DobermanConfig_Proxy')).address;
  const accountantAddress = (await deployments.get('Accountant')).address;
  
  await deploy('SeniorPool', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
    libraries: {
      Accountant: accountantAddress,
    },
    // proxy: {
    //   proxyContract: 'OpenZeppelinTransparentProxy',
    //   upgradeIndex: 0,
    //   execute: {
    //     methodName: 'initialize',
    //     args: [deployer, configAddress]
    //   }
    // },
  });
};

deploySeniorPool.tags = ['SENIOR_POOL'];
deploySeniorPool.dependencies = ['CONFIG'];
export default deploySeniorPool;
