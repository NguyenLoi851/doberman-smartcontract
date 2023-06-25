import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployGo: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const configAddress = (await deployments.get('DobermanConfig_Proxy')).address;
  const uniqueIdentityAddress = (
    await deployments.get('UniqueIdentity_Proxy')
  ).address;

  await deploy('Go', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
    // proxy: {
    //   proxyContract: 'OpenZeppelinTransparentProxy',
    //   upgradeIndex: 0,
    //   execute: {
    //     methodName: 'initialize',
    //     args: [deployer, configAddress, uniqueIdentityAddress]
    //   }
    // },
  });
};

deployGo.tags = ['GO'];
// deployGo.dependencies = ['CONFIG', 'UNIQUE_IDENTITY'];

export default deployGo;
