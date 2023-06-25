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

# Note for contract deployment and set config variables order

1. Config

2. USDC, usdc.initializeV2, usdc.configMinter, usdc.mint, config.setAddress(for usdc)

3. Other contract

4. config.setAddress()

5. When deploy upgradable first time, in folder deployment: file sc_Impl has address of Impl,
file sc_Proxy and file sc have address of Proxy

6. When upgrade, in folder deployment:
file sc_Impl has old address of Impl,
file sc_Proxy has address of Proxy,
file sc has new address of Impl
