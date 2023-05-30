import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployFactory: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const {address} = await deploy('FiatTokenV2', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 0,
      execute: {
        methodName: 'initialize',
        args: [
          'USD Coin',
          'USDC',
          'USDC',
          6,
          deployer,
          deployer,
          deployer,
          deployer,
        ]
      },
    },
  });

  // const USDC = await ethers.getContractFactory('FiatTokenV2')
  // const usdc = USDC.attach(address)
  // await usdc.initializeV2('USD Coin')
  // await usdc.configureMinter(deployer, ethers.parseUnits('1000000000000000000', 18));
  // await usdc.connect(deployer).mint(deployer, ethers.parseUnits('1000000000000000000',6));
};

deployFactory.tags = ['USDC'];
export default deployFactory;
