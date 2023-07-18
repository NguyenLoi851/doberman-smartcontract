import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployUniqueIdentity: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('UniqueIdentity', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
    // proxy: {
    //   proxyContract: 'OpenZeppelinTransparentProxy',
    //   upgradeIndex: 0,
    //   execute: {
    //     methodName: 'initialize',
    //     args: [deployer, 'https://google.com']
    //   }
    // },
  });
};

deployUniqueIdentity.tags = ['UNIQUE_IDENTITY'];

export default deployUniqueIdentity;
