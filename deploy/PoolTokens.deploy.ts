import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployPoolTokens: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const configAddress = (await deployments.get('DobermanConfig_Proxy')).address;
  
  await deploy('PoolTokens', {
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

deployPoolTokens.tags = ['POOL_TOKENS'];
deployPoolTokens.dependencies = ['CONFIG'];
export default deployPoolTokens;
