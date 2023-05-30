import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployBackerRewards: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const configAddress = (await deployments.get('DobermanConfig_Proxy')).address;
  
  await deploy('BackerRewards', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 0,
      execute: {
        methodName: '__initialize__',
        args: [deployer, configAddress]
      }
    },
  });
};

deployBackerRewards.tags = ['BACKER_REWARDS'];
deployBackerRewards.dependencies = ['CONFIG'];
export default deployBackerRewards;
