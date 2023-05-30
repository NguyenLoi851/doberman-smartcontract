import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployFactory: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const configAddress = (await deployments.get('DobermanConfig_Proxy')).address;
  
  await deploy('DobermanFactory', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 0,
      execute: {
        methodName: 'initialize',
        args: [deployer, configAddress]
      }
    },
  });
};

deployFactory.tags = ['FACTORY'];
deployFactory.dependencies = ['CONFIG'];
export default deployFactory;
