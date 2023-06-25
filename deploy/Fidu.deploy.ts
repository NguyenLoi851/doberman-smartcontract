import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployFidu: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const configAddress = (await deployments.get('DobermanConfig_Proxy')).address;

  await deploy('Fidu', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
    proxy: {
        proxyContract: 'OpenZeppelinTransparentProxy',
        upgradeIndex: 0,
        execute: {
          methodName: '__initialize__',
          args: [deployer, "Doberman FIDU", "FIDU", configAddress]
        }
      },
  });
};

deployFidu.tags = ['FIDU'];
deployFidu.dependencies = ['CONFIG'];

export default deployFidu;
