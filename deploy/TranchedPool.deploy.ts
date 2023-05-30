import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployTranchedPool: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const { address: tranchingLogic } = await deploy('TranchingLogic', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
  });

  await deploy('TranchedPool', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
    libraries: {
      TranchingLogic: tranchingLogic,
    },
  });
};

deployTranchedPool.tags = ['TRANCHED_POOL'];

export default deployTranchedPool;
