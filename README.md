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

1. UniqueIdentity

2. DobermanConfig

3. DobermanFactory

4. Go

5. Borrower

6. USDC, usdc.initializeV2, usdc.configMinter, usdc.mint, config.setAddress(for usdc)

7. Pool (Senior Pool)

8. Tranched Pool (Tranching Logic)

9. Credit Line (Accountant)

10. Pool Tokens

11. Backer Reward