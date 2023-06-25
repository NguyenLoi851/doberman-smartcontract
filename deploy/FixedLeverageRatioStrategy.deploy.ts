import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployFixedLeverageRatioStrategy: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const configAddress = (await deployments.get('DobermanConfig_Proxy')).address;

  const { address: fixedLeverageRatioStrategyAddress } = await deploy('FixedLeverageRatioStrategy', {
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

deployFixedLeverageRatioStrategy.tags = ['FIXED_LEVERAGE_RATIO_STRATEGY'];

export default deployFixedLeverageRatioStrategy;
