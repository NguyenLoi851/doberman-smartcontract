import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployPoolShares: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const { address: accountant } = await deploy('Accountant', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
  });

  const { address: creditLineAddress } = await deploy(
    'CreditLine',
    {
      from: deployer,
      args: [],
      log: true,
      libraries: {
        Accountant: accountant,
      },
      deterministicDeployment: false,
    },
  );
};

deployPoolShares.tags = ['CREDIT_LINE'];

export default deployPoolShares;
