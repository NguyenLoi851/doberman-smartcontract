import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployConfig: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('DobermanConfig', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
    proxy: {
        proxyContract: 'OpenZeppelinTransparentProxy',
        upgradeIndex: 0,
        execute: {
          methodName: 'initialize',
          args: [deployer]
        }
      },
  });
};

deployConfig.tags = ['CONFIG'];

export default deployConfig;
