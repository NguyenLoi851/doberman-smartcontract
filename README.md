# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```

# Contract deployment and set config variables order

1. Config

2. USDC, usdc.initializeV2, usdc.configMinter, usdc.mint, config.setAddress(for usdc)

3. config.setAddress()
