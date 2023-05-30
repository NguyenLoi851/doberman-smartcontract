import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployBorrower: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const { address: borrowerAddress } = await deploy('Borrower', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
  });
};

deployBorrower.tags = ['BORROWER'];

export default deployBorrower;
