import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { randomBytes } from "crypto"
import { BigNumber, BigNumberish } from "ethers"
import { keccak256, parseUnits, solidityPack } from "ethers/lib/utils"
import { ethers, getChainId, hardhatArguments } from "hardhat"
import { buildMintUIDAllowanceSignatureEIP712, buildPermitSignature, Domain } from "../scripts/buildSignature"
import { FixedLeverageRatioStrategy__factory } from "../typechain-types/factories/contracts/protocol/core/FixedLeverageRatioStrategy__factory"
import { FiatTokenV2_1 } from "../typechain-types/contracts/mocks/USDC.sol"
import { Accountant } from "../typechain-types/contracts/protocol/core/Accountant"
// import { CreditDesk } from "../typechain-types/contracts/protocol/core/CreditDesk"
import { CreditLine } from "../typechain-types/contracts/protocol/core/CreditLine"
import { DobermanConfig } from "../typechain-types/contracts/protocol/core/DobermanConfig"
import { DobermanFactory } from "../typechain-types/contracts/protocol/core/DobermanFactory"
import { Fidu } from "../typechain-types/contracts/protocol/core/Fidu"
import { FixedLeverageRatioStrategy } from "../typechain-types/contracts/protocol/core/FixedLeverageRatioStrategy"
import { Go } from "../typechain-types/contracts/protocol/core/Go"
import { PoolTokens } from "../typechain-types/contracts/protocol/core/PoolTokens"
import { SeniorPool } from "../typechain-types/contracts/protocol/core/SeniorPool"
import { TranchedPool } from "../typechain-types/contracts/protocol/core/TranchedPool"
import { TranchingLogic } from "../typechain-types/contracts/protocol/core/TranchingLogic"
import { UniqueIdentity } from "../typechain-types/contracts/protocol/core/UniqueIdentity"
import { Borrower } from "../typechain-types/contracts/protocol/periphery/Borrower"
import { BackerRewards } from "../typechain-types/contracts/rewards/BackerRewards"
import { FiatTokenV2_1__factory } from "../typechain-types/factories/contracts/mocks/USDC.sol"
import { Accountant__factory } from "../typechain-types/factories/contracts/protocol/core/Accountant__factory"
// import { CreditDesk__factory } from "../typechain-types/factories/contracts/protocol/core/CreditDesk__factory"
import { CreditLine__factory } from "../typechain-types/factories/contracts/protocol/core/CreditLine__factory"
import { DobermanConfig__factory } from "../typechain-types/factories/contracts/protocol/core/DobermanConfig__factory"
import { DobermanFactory__factory } from "../typechain-types/factories/contracts/protocol/core/DobermanFactory__factory"
import { Fidu__factory } from "../typechain-types/factories/contracts/protocol/core/Fidu__factory"
import { Go__factory } from "../typechain-types/factories/contracts/protocol/core/Go__factory"
import { PoolTokens__factory } from "../typechain-types/factories/contracts/protocol/core/PoolTokens__factory"
import { SeniorPool__factory } from "../typechain-types/factories/contracts/protocol/core/SeniorPool__factory"
import { TranchedPool__factory } from "../typechain-types/factories/contracts/protocol/core/TranchedPool__factory"
import { TranchingLogic__factory } from "../typechain-types/factories/contracts/protocol/core/TranchingLogic__factory"
import { UniqueIdentity__factory } from "../typechain-types/factories/contracts/protocol/core/UniqueIdentity__factory"
import { Borrower__factory } from "../typechain-types/factories/contracts/protocol/periphery/Borrower__factory"
import { BackerRewards__factory } from "../typechain-types/factories/contracts/rewards/BackerRewards__factory"

describe("Doberman", () => {
    type PoolInfo = {
        borrower: string,
        juniorFeePercent: BigNumberish,
        limit: BigNumberish,
        interestApr: BigNumberish,
        paymentPeriodInDays: BigNumberish,
        termInDays: BigNumberish,
        lateFeeApr: BigNumberish,
        principalGracePeriodInDays: BigNumberish,
        fundableAt: BigNumberish,
        allowedUIDTypes: BigNumberish[]
    }

    type USDCBalanceInit = {
        owner: string,
        balances: BigNumberish
    }

    enum ConfigOptionNumbers {
        TransactionLimit,
        TotalFundsLimit,
        MaxUnderwriterLimit,
        ReserveDenominator,
        WithdrawFeeDenominator,
        LatenessGracePeriodInDays,
        LatenessMaxDays,
        DrawdownPeriodInSeconds,
        TransferRestrictionPeriodInDays,
        LeverageRatio,
        MinBidIncrease
    }

    enum ConfigOptionAddresses {
        Pool,
        CreditLineImplementation,
        DobermanFactory,
        CreditDesk,
        Fidu,
        USDC,
        TreasuryReserve,
        ProtocolAdmin,
        OneInch,
        TrustedForwarder,
        CUSDCContract,
        DobermanConfig,
        PoolTokens,
        TranchedPoolImplementation,
        SeniorPool,
        SeniorPoolStrategy,
        MigratedTranchedPoolImplementation,
        BorrowerImplementation,
        GFI,
        Go,
        BackerRewards,
        StakingRewards
    }

    async function deployFixture() {

        const logMark = "\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"

        const logSpace = async () => {
            return (
                "\n" + await time.latest() + "\n===========================================================================================================================================================================================================\n"
            )
        }
        const zeroAddress = ethers.constants.AddressZero
        let deployer: SignerWithAddress
        let protocolAdminAddress: SignerWithAddress
        let owner: SignerWithAddress
        let borrower1: SignerWithAddress
        let backer1: SignerWithAddress
        let backer2: SignerWithAddress
        let backer3: SignerWithAddress
        let lper1: SignerWithAddress
        let lper2: SignerWithAddress
        let lper3: SignerWithAddress

        let USDC: FiatTokenV2_1
        let usdcDecimal: BigNumberish
        let dobermanConfig: DobermanConfig
        let poolTokens: PoolTokens;
        let borrowerImpl: Borrower
        let tranchedPoolImpl: TranchedPool
        let tranchingLogic: TranchingLogic
        let creditLineImpl: CreditLine
        let accountant: Accountant
        let dobermanFactory: DobermanFactory
        let trustedForwarderAddress: string
        let oneInchAddress: string
        let poolInfos: PoolInfo[]
        let go: Go
        let uniqueIdentity: UniqueIdentity
        let seniorPool: SeniorPool
        let fixedLeverageRatioStrategy: FixedLeverageRatioStrategy
        // let creditDesk: CreditDesk
        let usdcBalanceInit: USDCBalanceInit[]
        let backerRewards: BackerRewards
        let drawdownPeriodInSeconds: BigNumberish
        let reserveDenominator: BigNumberish
        let withdrawFeeDenominator: BigNumberish
        let treasuryReserve: string
        let fidu: Fidu
        let totalFundsLimit: BigNumberish
        let leverageRatio: BigNumberish
        let minBidIncrease: BigNumberish

        // const signEIP191 = async (signer: SignerWithAddress, lper: string, uIdType: BigNumberish, deadline1: BigNumberish, uIdContractAddr: string, nonces: BigNumberish, chainId: BigNumberish) => {
        //     const messageHash = ethers.utils.solidityKeccak256(
        //         ["address", "uint256", "uint256", "address", "uint256", "uint256"],
        //         [lper, uIdType, deadline1, uIdContractAddr, nonces, chainId]
        //     )
        //     const signature = await signer.signMessage(ethers.utils.arrayify(messageHash))
        //     return signature
        // }

        const getAndLogCreditLineInfo = async (creditLine: CreditLine) => {
            const borrower = await creditLine.borrower()
            const currentLimit = await creditLine.currentLimit()
            const maxLimit = await creditLine.maxLimit()
            const interestApr = await creditLine.interestApr()
            const paymentPeriodInDays = await creditLine.paymentPeriodInDays()
            const termInDays = await creditLine.termInDays()
            const principalGracePeriodInDays = await creditLine.principalGracePeriodInDays()
            const lateFeeApr = await creditLine.lateFeeApr()
            const creditLineTerms = {
                borrower,
                currentLimit,
                maxLimit,
                interestApr,
                paymentPeriodInDays,
                termInDays,
                principalGracePeriodInDays,
                lateFeeApr
            }
            const balance = await creditLine.balance()
            const interestOwed = await creditLine.interestOwed()
            const principalOwed = await creditLine.principalOwed()
            const termEndTime = await creditLine.termEndTime()
            const nextDueTime = await creditLine.nextDueTime()
            const interestAccruedAsOf = await creditLine.interestAccruedAsOf()
            const lastFullPaymentTime = await creditLine.lastFullPaymentTime()
            const totalInterestAccrued = await creditLine.totalInterestAccrued()
            const accountingVariables = {
                balance,
                interestOwed,
                principalOwed,
                termEndTime,
                nextDueTime,
                interestAccruedAsOf,
                lastFullPaymentTime,
                totalInterestAccrued
            }
            console.log(await logSpace(), "Credit line terms", creditLineTerms, "\n", "Accounting variables", accountingVariables)
        }

        [deployer, protocolAdminAddress, owner, borrower1, backer1, backer2, backer3, lper1, lper2, lper3] = await ethers.getSigners()


        // deploy and mint USDC token
        USDC = await new FiatTokenV2_1__factory(deployer).deploy()
        await USDC.connect(deployer).initialize("USD Coin", "USDC", "USD", 6, deployer.address, deployer.address, deployer.address, deployer.address)
        await USDC.connect(deployer).initializeV2('USD Coin')
        await USDC.connect(deployer).configureMinter(deployer.address, ethers.constants.MaxUint256)
        usdcDecimal = await USDC.decimals()

        usdcBalanceInit = [
            {
                owner: backer1.address,
                balances: parseUnits("1000000000", usdcDecimal)
            },
            {
                owner: backer2.address,
                balances: parseUnits("1000000000", usdcDecimal)
            },
            {
                owner: backer3.address,
                balances: parseUnits("1000000000", usdcDecimal)
            },
            {
                owner: lper1.address,
                balances: parseUnits("1000000000", usdcDecimal)
            },
            {
                owner: lper2.address,
                balances: parseUnits("1000000000", usdcDecimal)
            },
            {
                owner: lper3.address,
                balances: parseUnits("1000000000", usdcDecimal)
            },
            {
                owner: borrower1.address,
                balances: parseUnits("1000000000", usdcDecimal)
            }
        ]

        await Promise.all(
            usdcBalanceInit.map(
                async (item): Promise<any> => await USDC.connect(deployer).mint(item.owner, item.balances)
            )
        )

        // deploy contract
        dobermanConfig = await new DobermanConfig__factory(deployer).deploy()
        await dobermanConfig.connect(deployer).initialize(owner.address)
        await dobermanConfig.connect(owner).setDobermanConfig(dobermanConfig.address)

        borrowerImpl = await new Borrower__factory(deployer).deploy()
        await dobermanConfig.connect(owner).setBorrowerImplementation(borrowerImpl.address)

        tranchingLogic = await new TranchingLogic__factory(deployer).deploy()
        tranchedPoolImpl = await new TranchedPool__factory({
            ["contracts/protocol/core/TranchingLogic.sol:TranchingLogic"]: tranchingLogic.address
        }, deployer).deploy()
        await dobermanConfig.connect(owner).setTranchedPoolImplementation(tranchedPoolImpl.address)

        accountant = await new Accountant__factory(deployer).deploy()
        creditLineImpl = await new CreditLine__factory({
            ["contracts/protocol/core/Accountant.sol:Accountant"]: accountant.address
        }, deployer).deploy()
        await dobermanConfig.connect(owner).setCreditLineImplementation(creditLineImpl.address)

        dobermanFactory = await new DobermanFactory__factory(deployer).deploy()
        await dobermanFactory.connect(deployer).initialize(owner.address, dobermanConfig.address)
        await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.DobermanFactory, dobermanFactory.address)

        trustedForwarderAddress = '0x' + randomBytes(20).toString('hex');
        await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.TrustedForwarder, trustedForwarderAddress);

        oneInchAddress = '0x' + randomBytes(20).toString('hex');
        await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.OneInch, oneInchAddress)

        await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.USDC, USDC.address)

        // await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.ProtocolAdmin, protocolAdminAddress.address)
        await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.ProtocolAdmin, owner.address)

        poolTokens = await new PoolTokens__factory(deployer).deploy()
        await poolTokens.connect(deployer).__initialize__(owner.address, dobermanConfig.address)
        await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.PoolTokens, poolTokens.address)

        uniqueIdentity = await new UniqueIdentity__factory(deployer).deploy()
        await uniqueIdentity.connect(deployer).initialize(owner.address, "http://uri.test")
        await uniqueIdentity.connect(owner).setSupportedUIDTypes([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [true, true, true, true, true, true, true, true, true, true, true])

        go = await new Go__factory(deployer).deploy()
        await go.connect(deployer).initialize(owner.address, dobermanConfig.address, uniqueIdentity.address)
        await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.Go, go.address)

        // creditDesk = await new CreditDesk__factory({
        //     ["contracts/protocol/core/Accountant.sol:Accountant"]: accountant.address
        // }, deployer).deploy()
        // await creditDesk.connect(deployer).initialize(owner.address, dobermanConfig.address)
        // await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.CreditDesk, creditDesk.address)


        seniorPool = await new SeniorPool__factory(
            // { ["contracts/protocol/core/Accountant.sol:Accountant"]: accountant.address }, 
        deployer).deploy()
        await seniorPool.connect(deployer).initialize(owner.address, dobermanConfig.address)
        await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.SeniorPool, seniorPool.address)

        fixedLeverageRatioStrategy = await new FixedLeverageRatioStrategy__factory(deployer).deploy()
        await fixedLeverageRatioStrategy.connect(owner).initialize(owner.address, dobermanConfig.address)
        await dobermanConfig.connect(owner).setSeniorPoolStrategy(fixedLeverageRatioStrategy.address)

        fidu = await new Fidu__factory(deployer).deploy()
        await fidu.connect(deployer).__initialize__(owner.address, "FIDU", "FIDU", dobermanConfig.address)
        await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.Fidu, fidu.address)
        await fidu.connect(owner).grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE")), seniorPool.address)

        backerRewards = await new BackerRewards__factory(deployer).deploy()
        await backerRewards.connect(deployer).__initialize__(owner.address, dobermanConfig.address)
        await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.BackerRewards, backerRewards.address)

        drawdownPeriodInSeconds = 3 * 24 * 60 * 60;
        await dobermanConfig.connect(owner).setNumber(ConfigOptionNumbers.DrawdownPeriodInSeconds, drawdownPeriodInSeconds)

        reserveDenominator = 10
        await dobermanConfig.connect(owner).setNumber(ConfigOptionNumbers.ReserveDenominator, reserveDenominator)

        treasuryReserve = '0x' + randomBytes(20).toString('hex');
        await dobermanConfig.connect(owner).setAddress(ConfigOptionAddresses.TreasuryReserve, treasuryReserve)
        await dobermanConfig.connect(owner).setTreasuryReserve(treasuryReserve)

        totalFundsLimit = parseUnits("1000000000", 18)
        await dobermanConfig.connect(owner).setNumber(ConfigOptionNumbers.TotalFundsLimit, totalFundsLimit)

        leverageRatio = parseUnits("4", 18)
        await dobermanConfig.connect(owner).setNumber(ConfigOptionNumbers.LeverageRatio, leverageRatio)

        minBidIncrease = parseUnits('1000')
        await dobermanConfig.connect(owner).setNumber(ConfigOptionNumbers.MinBidIncrease, minBidIncrease)

        withdrawFeeDenominator = 200
        await dobermanConfig.connect(owner).setNumber(ConfigOptionNumbers.WithdrawFeeDenominator, withdrawFeeDenominator)
        poolInfos = [
            {
                borrower: borrower1.address,
                juniorFeePercent: BigNumber.from("10"),
                limit: parseUnits("48000", usdcDecimal),
                interestApr: parseUnits("15", 16),
                paymentPeriodInDays: BigNumber.from("30"),
                termInDays: BigNumber.from("120"),
                lateFeeApr: parseUnits("5", 16),
                principalGracePeriodInDays: BigNumber.from("5"),
                fundableAt: (await time.latest()) + 10 * 24 * 60 * 60,
                allowedUIDTypes: [0, 1, 2, 3, 4, 5]
            }
        ]

        const usdcDomain: Domain = {
            version: '2',
            name: 'USD Coin',
            chainId: Number(await getChainId()),
            verifyingContract: USDC.address
        }

        const uniqueIdentityDomain: Domain = {
            version: '1',
            name: 'Unique Identity',
            chainId: Number(await getChainId()),
            verifyingContract: uniqueIdentity.address
        }

        return {
            deployer, owner, borrower1, backer1, backer2, backer3, lper1, lper2, lper3,
            logSpace, zeroAddress, usdcDecimal, dobermanConfig, dobermanFactory,
            poolInfos, tranchingLogic, uniqueIdentity, USDC, accountant,
            getAndLogCreditLineInfo, logMark, seniorPool, usdcDomain, uniqueIdentityDomain,
            fixedLeverageRatioStrategy, go, fidu, minBidIncrease, drawdownPeriodInSeconds
        }
    }

    it("Should config system", async() => {
        const { deployer, owner, borrower1, backer1, backer2, backer3, lper1, lper2, lper3,
            logSpace, zeroAddress, usdcDecimal, dobermanConfig, dobermanFactory,
            poolInfos, tranchingLogic, uniqueIdentity, USDC, accountant,
            getAndLogCreditLineInfo, logMark, seniorPool, go
        } = await loadFixture(deployFixture)

        // let dobermanConfig2 = await new DobermanConfig__factory(owner).deploy()
        await dobermanConfig.connect(owner).initializeFromOtherConfig(dobermanConfig.address, 2, 3)
        await dobermanConfig.connect(owner).addToGoList(backer1.address)
        await dobermanConfig.connect(owner).removeFromGoList(backer1.address)
        await dobermanConfig.connect(owner).bulkAddToGoList([backer3.address])
        await dobermanConfig.connect(owner).bulkRemoveFromGoList([backer1.address])
    })

    it("Should manage UID", async() => {
        const { deployer, owner, borrower1, backer1, backer2, backer3, lper1, lper2, lper3,
            logSpace, zeroAddress, usdcDecimal, dobermanConfig, dobermanFactory,
            poolInfos, tranchingLogic, uniqueIdentity, USDC, accountant,
            getAndLogCreditLineInfo, logMark, seniorPool, go
        } = await loadFixture(deployFixture)

        await uniqueIdentity.connect(owner).setSupportedUIDTypes([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [true, true, true, true, true, true, true, true, true, true, true])
        expect(await uniqueIdentity.name()).to.be.equal("Unique Identity")
        expect(await uniqueIdentity.symbol()).to.be.equal("UID")
        await go.connect(owner).updateDobermanConfig()
        await go.connect(owner).performUpgrade()
        expect(await go.go(backer1.address)).to.be.false
        expect(await go.goSeniorPool(backer1.address)).to.be.false
        await dobermanConfig.connect(owner).addToGoList(backer1.address)
        await go.connect(owner).setLegacyGoList(dobermanConfig.address)
        expect(await go.goOnlyIdTypes(backer1.address, [0])).to.be.true
        await go.connect(owner).setLegacyGoList(zeroAddress)
    })

    it("Should create borrower", async() => {
        const { deployer, owner, borrower1, backer1, backer2, backer3, lper1, lper2, lper3,
            logSpace, zeroAddress, usdcDecimal, dobermanConfig, dobermanFactory,
            poolInfos, tranchingLogic, uniqueIdentity, USDC, accountant,
            getAndLogCreditLineInfo, logMark, seniorPool, go, uniqueIdentityDomain
        } = await loadFixture(deployFixture)

        let tx;
        let txRs;

        // create borrower contract
        tx = await dobermanFactory.connect(borrower1).createBorrower(borrower1.address)
        txRs = await tx.wait()
        const borrower1ContractAddr = (txRs.events as any)[(txRs.events as any).length - 1].args.borrower
        const borrower1Contract = new Borrower__factory(borrower1).attach(borrower1ContractAddr)
        expect(await borrower1Contract.versionRecipient()).to.be.equal("2.0.0")

        const pool1Info = poolInfos[1 - 1];
        tx = await dobermanFactory.connect(owner).createPool(
            borrower1ContractAddr,
            pool1Info.juniorFeePercent,
            pool1Info.limit,
            pool1Info.interestApr,
            pool1Info.paymentPeriodInDays,
            pool1Info.termInDays,
            pool1Info.lateFeeApr,
            pool1Info.principalGracePeriodInDays,
            pool1Info.fundableAt,
            pool1Info.allowedUIDTypes
        )
        txRs = await tx.wait()
        const pool1Addr = (txRs.events as any)[(txRs.events as any).length - 1].args.pool
        const pool1 = new TranchedPool__factory({
            ["contracts/protocol/core/TranchingLogic.sol:TranchingLogic"]: tranchingLogic.address
        }, owner).attach(pool1Addr)

        await time.increaseTo((await pool1.fundableAt()).add(1))

        const deadline1 = (await time.latest()) + 10 * 60
        const signature1 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer1.address, 1, deadline1, await uniqueIdentity.nonces(backer1.address))
        tx = await uniqueIdentity.connect(backer1).mint(1, deadline1, signature1, { value: parseUnits("83", 13) })
        expect(await go.go(backer1.address)).to.be.true

        const signature11 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer1.address, 1, deadline1, await uniqueIdentity.nonces(backer1.address))
        await uniqueIdentity.connect(backer1).burn(backer1.address, 1, deadline1, signature11)
    })

    it("Should handle fidu token", async() => {
        const { deployer, owner, borrower1, backer1, backer2, backer3, lper1, lper2, lper3,
            logSpace, zeroAddress, usdcDecimal, dobermanConfig, dobermanFactory,
            poolInfos, tranchingLogic, uniqueIdentity, USDC, accountant,
            getAndLogCreditLineInfo, logMark, seniorPool, fidu
        } = await loadFixture(deployFixture)

        await fidu.connect(owner).updateDobermanConfig()
    })

    it("Should create pool", async () => {
        const { deployer, owner, borrower1, backer1, backer2, backer3, lper1, lper2, lper3,
            logSpace, zeroAddress, usdcDecimal, dobermanConfig, dobermanFactory,
            poolInfos, tranchingLogic, uniqueIdentity, USDC, accountant,
            getAndLogCreditLineInfo, logMark, seniorPool
        } = await loadFixture(deployFixture)

        let tx;
        let txRs;

        // create borrower contract
        tx = await dobermanFactory.connect(borrower1).createBorrower(borrower1.address)
        txRs = await tx.wait()
        const borrower1ContractAddr = (txRs.events as any)[(txRs.events as any).length - 1].args.borrower
        const borrower1Contract = new Borrower__factory(borrower1).attach(borrower1ContractAddr)

        const pool1Info = poolInfos[1 - 1];
        tx = await dobermanFactory.connect(owner).createPool(
            borrower1ContractAddr,
            pool1Info.juniorFeePercent,
            pool1Info.limit,
            pool1Info.interestApr,
            pool1Info.paymentPeriodInDays,
            pool1Info.termInDays,
            pool1Info.lateFeeApr,
            pool1Info.principalGracePeriodInDays,
            pool1Info.fundableAt,
            []
        )
        txRs = await tx.wait()
        const pool1Addr = (txRs.events as any)[(txRs.events as any).length - 1].args.pool
        const pool1 = new TranchedPool__factory({
            ["contracts/protocol/core/TranchingLogic.sol:TranchingLogic"]: tranchingLogic.address
        }, owner).attach(pool1Addr)

        await pool1.connect(owner).setAllowedUIDTypes([1,2,3])
        await pool1.connect(owner).setFundableAt((await pool1.fundableAt()).add(1000))
        await pool1.connect(owner).setLimit(parseUnits('12', usdcDecimal))
        await pool1.connect(owner).setMaxLimit(parseUnits('15', usdcDecimal))
        expect(await pool1.numSlices()).to.be.equal(1)
        expect(await pool1.totalJuniorDeposits()).to.be.equal(BigNumber.from(0))

        await dobermanFactory.connect(owner).performUpgrade()
        await dobermanFactory.connect(owner).grantRole(keccak256(solidityPack(['string'],['BORROWER_ROLE'])), backer1.address)
        expect(await dobermanFactory.connect(backer1).isBorrower()).to.be.true

        const poo2 = new TranchedPool__factory({
            ["contracts/protocol/core/TranchingLogic.sol:TranchingLogic"]: tranchingLogic.address
        }, backer1).attach(pool1Addr) 

        await dobermanFactory.connect(owner).updateDobermanConfig()
    })

    it("Should deposit, invest from senior pool, withdraw", async () => {
        const { deployer, owner, borrower1, backer1, backer2, backer3, lper1, lper2, lper3,
            logSpace, zeroAddress, usdcDecimal, dobermanConfig, dobermanFactory,
            poolInfos, tranchingLogic, uniqueIdentity, USDC, accountant,
            getAndLogCreditLineInfo, logMark, seniorPool, usdcDomain, uniqueIdentityDomain
        } = await loadFixture(deployFixture)

        let tx;
        let txRs;

        // create borrower contract
        tx = await dobermanFactory.connect(borrower1).createBorrower(borrower1.address)
        txRs = await tx.wait()
        const borrower1ContractAddr = (txRs.events as any)[(txRs.events as any).length - 1].args.borrower
        const borrower1Contract = new Borrower__factory(borrower1).attach(borrower1ContractAddr)

        const pool1Info = poolInfos[1 - 1];
        tx = await dobermanFactory.connect(owner).createPool(
            borrower1ContractAddr,
            pool1Info.juniorFeePercent,
            pool1Info.limit,
            pool1Info.interestApr,
            pool1Info.paymentPeriodInDays,
            pool1Info.termInDays,
            pool1Info.lateFeeApr,
            pool1Info.principalGracePeriodInDays,
            pool1Info.fundableAt,
            pool1Info.allowedUIDTypes
        )
        txRs = await tx.wait()
        const pool1Addr = (txRs.events as any)[(txRs.events as any).length - 1].args.pool
        const pool1 = new TranchedPool__factory({
            ["contracts/protocol/core/TranchingLogic.sol:TranchingLogic"]: tranchingLogic.address
        }, owner).attach(pool1Addr)

        const creditLinePool1Slice1Addr = await pool1.creditLine()
        const creditLinePool1Slice1 = new CreditLine__factory({
            ["contracts/protocol/core/Accountant.sol:Accountant"]: accountant.address
        }, deployer).attach(creditLinePool1Slice1Addr)

        await time.increaseTo((await pool1.fundableAt()).add(1))

        const deadline1 = (await time.latest()) + 10 * 60
        const signature1 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer1.address, 1, deadline1, await uniqueIdentity.nonces(backer1.address))
        tx = await uniqueIdentity.connect(backer1).mint(1, deadline1, signature1, { value: parseUnits("83", 13) })

        const signature11 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer1.address, 1, deadline1, await uniqueIdentity.nonces(backer1.address))
        await expect(uniqueIdentity.connect(backer1).mint(1, deadline1, signature11, { value: parseUnits("83", 13) })).to.be.reverted

        // backer1 deposit to pool1
        await USDC.connect(backer1).approve(pool1.address, ethers.constants.MaxUint256)
        await pool1.connect(backer1).deposit(2, parseUnits("5000", usdcDecimal))

        const deadline2 = (await time.latest()) + 10 * 60
        const signature2 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer2.address, 1, deadline2, await uniqueIdentity.nonces(backer2.address))
        tx = await uniqueIdentity.connect(backer2).mint(1, deadline2, signature2, { value: parseUnits("83", 13) })

        // backer2 deposit to pool1
        const deadline4 = (await time.latest()) + 10 * 60
        const depositSignature = await buildPermitSignature(backer2, {...usdcDomain}, pool1.address, parseUnits("3000", usdcDecimal), await USDC.nonces(backer2.address), deadline4)
        await pool1.connect(backer2).depositWithPermit(2, parseUnits("3000", usdcDecimal), deadline4, depositSignature.v, depositSignature.r, depositSignature.s)

        const deadline3 = (await time.latest()) + 10 * 60
        const signature3 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer3.address, 1, deadline3, await uniqueIdentity.nonces(backer3.address))
        await expect(uniqueIdentity.connect(backer3).mint(1, deadline3, signature3)).to.be.reverted
        tx = await uniqueIdentity.connect(backer3).mint(1, deadline3, signature3, { value: parseUnits("83", 13) })

        await pool1.connect(owner).pause()
        await pool1.connect(owner).unpause()
        await pool1.connect(owner).pauseDrawdowns()
        await pool1.connect(owner).unpauseDrawdowns()

        // backer3 deposit to pool1
        await USDC.connect(backer3).approve(pool1.address, ethers.constants.MaxUint256)
        await expect(pool1.connect(backer3).deposit(2, parseUnits("40001", usdcDecimal))).to.be.reverted
        await pool1.connect(backer3).deposit(2, parseUnits("4000", usdcDecimal))
        await expect(pool1.connect(owner).deposit(2, parseUnits("1", usdcDecimal))).to.be.reverted
        await expect(pool1.connect(backer3).deposit(2, parseUnits("40000001", usdcDecimal))).to.be.reverted

        // borrower lock junior capital
        await borrower1Contract.connect(borrower1).lockJuniorCapital(pool1.address)

        // backer1 deposit to senior pool
        await USDC.connect(backer1).approve(seniorPool.address, ethers.constants.MaxUint256)
        await seniorPool.connect(backer1).deposit(parseUnits("20000", usdcDecimal))

        // backer2 deposit to senior pool
        await USDC.connect(backer2).approve(seniorPool.address, ethers.constants.MaxUint256)
        await seniorPool.connect(backer2).deposit(parseUnits("50000", usdcDecimal))

        // backer3 deposit to senior pool
        await USDC.connect(backer3).approve(seniorPool.address, ethers.constants.MaxUint256)
        await seniorPool.connect(backer3).deposit(parseUnits("30000", usdcDecimal))

        // senior pool deposit to poo1
        await seniorPool.connect(borrower1).invest(pool1.address)

        // borrower lock pool
        await borrower1Contract.connect(borrower1).lockPool(pool1.address)

        // borrower drawdown
        await time.increaseTo(1700000000 - 1)
        await borrower1Contract.connect(borrower1).drawdown(pool1.address, parseUnits("12000", usdcDecimal), zeroAddress)

        await time.increaseTo(await creditLinePool1Slice1.nextDueTime())
        const debtAmounts = await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()

        await USDC.connect(borrower1).approve(borrower1Contract.address, ethers.constants.MaxUint256)
        await borrower1Contract.connect(borrower1).pay(pool1.address, debtAmounts[0].add(debtAmounts[1]))

        await time.increaseTo(await creditLinePool1Slice1.nextDueTime())
        const debtAmounts2 = await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()
        const deadline = (await time.latest()) + 1000
        const paySignature = await buildPermitSignature(borrower1, {...usdcDomain}, borrower1Contract.address, debtAmounts2[0].add(debtAmounts2[1]), await USDC.nonces(borrower1.address), deadline)
        await borrower1Contract.connect(borrower1).payWithPermit(pool1.address, debtAmounts2[0].add(debtAmounts2[1]), deadline, paySignature.v, paySignature.r, paySignature.s)


        await time.increaseTo(await creditLinePool1Slice1.nextDueTime())
        const debtAmounts4 = await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()

        await USDC.connect(borrower1).approve(borrower1Contract.address, ethers.constants.MaxUint256)
        await borrower1Contract.connect(borrower1).payMultiple([pool1.address], [debtAmounts4[0].add(debtAmounts4[1])])

        await time.increaseTo((await creditLinePool1Slice1.termEndTime()).add(1000))
        const debtAmounts3 = await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()
        await USDC.connect(borrower1).approve(borrower1Contract.address, ethers.constants.MaxUint256)
        await borrower1Contract.connect(borrower1).payInFull(pool1.address, debtAmounts3[0].add(debtAmounts3[1]))

        await pool1.connect(backer1).withdrawMaxMultiple([1])
        await pool1.connect(backer2).withdrawMultiple([2], [parseUnits('1', usdcDecimal)])
        const withdrawableAmounts = await pool1.connect(backer2).availableToWithdrawMultiple([2])
        expect(withdrawableAmounts[0]).to.be.greaterThan(BigNumber.from(0))
        expect(withdrawableAmounts[1]).to.be.greaterThan(BigNumber.from(0))
        await seniorPool.connect(backer2).withdraw(parseUnits("10", usdcDecimal))
        await seniorPool.connect(backer3).withdrawInFidu(parseUnits("1", 18))
    })

    it("Should deposit, invest from senior pool, bid, withdraw", async () => {
        const { deployer, owner, borrower1, backer1, backer2, backer3, lper1, lper2, lper3,
            logSpace, zeroAddress, usdcDecimal, dobermanConfig, dobermanFactory,
            poolInfos, tranchingLogic, uniqueIdentity, USDC, accountant,
            getAndLogCreditLineInfo, logMark, seniorPool, usdcDomain, uniqueIdentityDomain,
            minBidIncrease, drawdownPeriodInSeconds
        } = await loadFixture(deployFixture)

        let tx;
        let txRs;

        // create borrower contract
        tx = await dobermanFactory.connect(borrower1).createBorrower(borrower1.address)
        txRs = await tx.wait()
        const borrower1ContractAddr = (txRs.events as any)[(txRs.events as any).length - 1].args.borrower
        const borrower1Contract = new Borrower__factory(borrower1).attach(borrower1ContractAddr)

        const pool1Info = poolInfos[1 - 1];
        tx = await dobermanFactory.connect(owner).createPool(
            borrower1ContractAddr,
            pool1Info.juniorFeePercent,
            pool1Info.limit,
            pool1Info.interestApr,
            pool1Info.paymentPeriodInDays,
            pool1Info.termInDays,
            pool1Info.lateFeeApr,
            pool1Info.principalGracePeriodInDays,
            pool1Info.fundableAt,
            pool1Info.allowedUIDTypes
        )
        txRs = await tx.wait()
        const pool1Addr = (txRs.events as any)[(txRs.events as any).length - 1].args.pool
        const pool1 = new TranchedPool__factory({
            ["contracts/protocol/core/TranchingLogic.sol:TranchingLogic"]: tranchingLogic.address
        }, owner).attach(pool1Addr)

        const creditLinePool1Slice1Addr = await pool1.creditLine()
        const creditLinePool1Slice1 = new CreditLine__factory({
            ["contracts/protocol/core/Accountant.sol:Accountant"]: accountant.address
        }, deployer).attach(creditLinePool1Slice1Addr)

        await time.increaseTo((await pool1.fundableAt()).add(1))

        const deadline1 = (await time.latest()) + 10 * 60
        const signature1 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer1.address, 1, deadline1, await uniqueIdentity.nonces(backer1.address))
        tx = await uniqueIdentity.connect(backer1).mint(1, deadline1, signature1, { value: parseUnits("83", 13) })

        const signature11 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer1.address, 1, deadline1, await uniqueIdentity.nonces(backer1.address))
        await expect(uniqueIdentity.connect(backer1).mint(1, deadline1, signature11, { value: parseUnits("83", 13) })).to.be.reverted

        // backer1 deposit to pool1
        await USDC.connect(backer1).approve(pool1.address, ethers.constants.MaxUint256)
        await pool1.connect(backer1).deposit(2, parseUnits("5000", usdcDecimal))

        const deadline2 = (await time.latest()) + 10 * 60
        const signature2 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer2.address, 1, deadline2, await uniqueIdentity.nonces(backer2.address))
        tx = await uniqueIdentity.connect(backer2).mint(1, deadline2, signature2, { value: parseUnits("83", 13) })

        // backer2 deposit to pool1
        const deadline4 = (await time.latest()) + 10 * 60
        const depositSignature = await buildPermitSignature(backer2, {...usdcDomain}, pool1.address, parseUnits("3000", usdcDecimal), await USDC.nonces(backer2.address), deadline4)
        await pool1.connect(backer2).depositWithPermit(2, parseUnits("3000", usdcDecimal), deadline4, depositSignature.v, depositSignature.r, depositSignature.s)

        const deadline3 = (await time.latest()) + 10 * 60
        const signature3 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer3.address, 1, deadline3, await uniqueIdentity.nonces(backer3.address))
        await expect(uniqueIdentity.connect(backer3).mint(1, deadline3, signature3)).to.be.reverted
        tx = await uniqueIdentity.connect(backer3).mint(1, deadline3, signature3, { value: parseUnits("83", 13) })

        await pool1.connect(owner).pause()
        await pool1.connect(owner).unpause()
        await pool1.connect(owner).pauseDrawdowns()
        await pool1.connect(owner).unpauseDrawdowns()

        // backer3 deposit to pool1
        await USDC.connect(backer3).approve(pool1.address, ethers.constants.MaxUint256)
        await expect(pool1.connect(backer3).deposit(2, parseUnits("40001", usdcDecimal))).to.be.reverted
        await pool1.connect(backer3).deposit(2, parseUnits("4000", usdcDecimal))
        await expect(pool1.connect(owner).deposit(2, parseUnits("1", usdcDecimal))).to.be.reverted
        await expect(pool1.connect(backer3).deposit(2, parseUnits("40000001", usdcDecimal))).to.be.reverted

        // borrower lock junior capital
        await borrower1Contract.connect(borrower1).lockJuniorCapital(pool1.address)

        await seniorPool.connect(owner).updateDobermanConfig()

        // backer1 deposit to senior pool
        await USDC.connect(backer1).approve(seniorPool.address, ethers.constants.MaxUint256)
        await seniorPool.connect(backer1).deposit(parseUnits("20000", usdcDecimal))

        // backer2 deposit to senior pool
        await USDC.connect(backer2).approve(seniorPool.address, ethers.constants.MaxUint256)
        await seniorPool.connect(backer2).deposit(parseUnits("50000", usdcDecimal))

        // backer3 deposit to senior pool
        await USDC.connect(backer3).approve(seniorPool.address, ethers.constants.MaxUint256)
        await seniorPool.connect(backer3).deposit(parseUnits("30000", usdcDecimal))

        // senior pool deposit to poo1
        await seniorPool.connect(borrower1).invest(pool1.address)
        
        expect(await creditLinePool1Slice1.withinPrincipalGracePeriod()).to.be.true

        // borrower drawdown
        await time.increaseTo(1700000000 - 1)
        await borrower1Contract.connect(borrower1).drawdown(pool1.address, parseUnits("12000", usdcDecimal), zeroAddress)

        await time.increaseTo(await creditLinePool1Slice1.nextDueTime())
        const debtAmounts = await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()

        await USDC.connect(borrower1).approve(borrower1Contract.address, ethers.constants.MaxUint256)
        await borrower1Contract.connect(borrower1).pay(pool1.address, debtAmounts[0].add(debtAmounts[1]))

        await time.increaseTo(await creditLinePool1Slice1.nextDueTime())
        const debtAmounts2 = await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()
        const deadline = (await time.latest()) + 1000
        const paySignature = await buildPermitSignature(borrower1, {...usdcDomain}, borrower1Contract.address, debtAmounts2[0].add(debtAmounts2[1]), await USDC.nonces(borrower1.address), deadline)
        await borrower1Contract.connect(borrower1).payWithPermit(pool1.address, debtAmounts2[0].add(debtAmounts2[1]), deadline, paySignature.v, paySignature.r, paySignature.s)

        await time.increaseTo(await creditLinePool1Slice1.nextDueTime())
        const debtAmounts4 = await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()

        await USDC.connect(borrower1).approve(pool1.address, ethers.constants.MaxUint256)
        await pool1.connect(borrower1).pay(debtAmounts4[0].add(debtAmounts4[1]))
        await pool1.connect(borrower1).pay(parseUnits('100', usdcDecimal))

        await time.increaseTo((await creditLinePool1Slice1.termEndTime()).add(1000))
        const deadline5 = (await time.latest()) + 1000
        const oweAmounts =  await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()
        const bidSignature = await buildPermitSignature(backer1, usdcDomain, creditLinePool1Slice1.address, oweAmounts[0].add(oweAmounts[1]), await USDC.nonces(backer1.address), deadline5)
        await expect(creditLinePool1Slice1.connect(backer1).bidWithPermit(oweAmounts[0].add(oweAmounts[1]), deadline5, bidSignature.v, bidSignature.r, bidSignature.s)).to.be.revertedWith('Loans is on time or fully repaid')

        await time.increase((await creditLinePool1Slice1.paymentPeriodInDays()).mul(60).add(1000))
        const deadline6 = (await time.latest()) + 1000
        const oweAmounts1 =  await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()
        const bidSignature1 = await buildPermitSignature(backer1, usdcDomain, creditLinePool1Slice1.address, oweAmounts1[0].add(oweAmounts1[1]), await USDC.nonces(backer1.address), deadline6)
        await creditLinePool1Slice1.connect(backer1).bidWithPermit(oweAmounts1[0].add(oweAmounts1[1]), deadline6, bidSignature1.v, bidSignature1.r, bidSignature1.s)
        await pool1.connect(owner).updateDobermanConfig()
        expect(await creditLinePool1Slice1.termStartTime()).greaterThan(BigNumber.from(0))
        expect(await creditLinePool1Slice1.isLate()).to.be.true
        expect(await creditLinePool1Slice1.withinPrincipalGracePeriod()).to.be.false

        await time.increaseTo((await creditLinePool1Slice1.auctionEnd()).sub(100))
        const deadline7 = (await time.latest()) + 1000
        const bidSignature2 = await buildPermitSignature(backer2, usdcDomain, creditLinePool1Slice1.address, await creditLinePool1Slice1.auctionLivePrice(), await USDC.nonces(backer2.address), deadline7)
        await expect(creditLinePool1Slice1.connect(backer2).bidWithPermit(await creditLinePool1Slice1.auctionLivePrice(), deadline7, bidSignature2.v, bidSignature2.r, bidSignature2.s)).to.be.revertedWith('Bid too low')
        await USDC.connect(deployer).mint(backer2.address, (await creditLinePool1Slice1.auctionLivePrice()).mul(minBidIncrease.add(10000)).div(10000))
        const bidSignature3 = await buildPermitSignature(backer2, usdcDomain, creditLinePool1Slice1.address, (await creditLinePool1Slice1.auctionLivePrice()).mul(minBidIncrease.add(10000)).div(10000), await USDC.nonces(backer2.address), deadline7)
        await creditLinePool1Slice1.connect(backer2).bidWithPermit((await creditLinePool1Slice1.auctionLivePrice()).mul(minBidIncrease.add(10000)).div(10000), deadline7, bidSignature3.v, bidSignature3.r, bidSignature3.s)

        await time.increaseTo((await creditLinePool1Slice1.auctionEnd()).sub(3))
        const auctionEndBefore = await creditLinePool1Slice1.auctionEnd()
        const deadline8 = (await time.latest()) + 1000
        await USDC.connect(deployer).mint(backer3.address, (await creditLinePool1Slice1.auctionLivePrice()).mul(minBidIncrease.add(10000)).div(10000))
        const bidSignature4 = await buildPermitSignature(backer3, usdcDomain, creditLinePool1Slice1.address, (await creditLinePool1Slice1.auctionLivePrice()).mul(minBidIncrease.add(10000)).div(10000), await USDC.nonces(backer3.address), deadline8)
        await creditLinePool1Slice1.connect(backer3).bidWithPermit((await creditLinePool1Slice1.auctionLivePrice()).mul(minBidIncrease.add(10000)).div(10000), deadline8, bidSignature4.v, bidSignature4.r, bidSignature4.s)
        const auctionEndAfter = await creditLinePool1Slice1.auctionEnd()
        expect(auctionEndAfter).greaterThan(auctionEndBefore)

        await time.increaseTo((await creditLinePool1Slice1.auctionEnd()).add(30))
        const deadline9 = (await time.latest()) + 1000
        await USDC.connect(deployer).mint(backer1.address, (await creditLinePool1Slice1.auctionLivePrice()).mul(minBidIncrease.add(10000)).div(10000))
        const bidSignature5 = await buildPermitSignature(backer1, usdcDomain, creditLinePool1Slice1.address, (await creditLinePool1Slice1.auctionLivePrice()).mul(minBidIncrease.add(10000)).div(10000), await USDC.nonces(backer1.address), deadline9)
        await expect(creditLinePool1Slice1.connect(backer1).bidWithPermit((await creditLinePool1Slice1.auctionLivePrice()).mul(minBidIncrease.add(10000)).div(10000), deadline9, bidSignature5.v, bidSignature5.r, bidSignature5.s)).to.be.reverted

        await time.increase(drawdownPeriodInSeconds + 10)
        await seniorPool.connect(backer3).redeem(4)
    })

    it("Should deposit, invest from senior pool, emergencyShutdown", async () => {
        const { deployer, owner, borrower1, backer1, backer2, backer3, lper1, lper2, lper3,
            logSpace, zeroAddress, usdcDecimal, dobermanConfig, dobermanFactory,
            poolInfos, tranchingLogic, uniqueIdentity, USDC, accountant,
            getAndLogCreditLineInfo, logMark, seniorPool, usdcDomain, uniqueIdentityDomain,
            fixedLeverageRatioStrategy
        } = await loadFixture(deployFixture)

        let tx;
        let txRs;

        // create borrower contract
        tx = await dobermanFactory.connect(borrower1).createBorrower(borrower1.address)
        txRs = await tx.wait()
        const borrower1ContractAddr = (txRs.events as any)[(txRs.events as any).length - 1].args.borrower
        const borrower1Contract = new Borrower__factory(borrower1).attach(borrower1ContractAddr)

        const pool1Info = poolInfos[1 - 1];
        tx = await dobermanFactory.connect(owner).createPool(
            borrower1ContractAddr,
            pool1Info.juniorFeePercent,
            pool1Info.limit,
            pool1Info.interestApr,
            pool1Info.paymentPeriodInDays,
            pool1Info.termInDays,
            pool1Info.lateFeeApr,
            pool1Info.principalGracePeriodInDays,
            pool1Info.fundableAt,
            pool1Info.allowedUIDTypes
        )
        txRs = await tx.wait()
        const pool1Addr = (txRs.events as any)[(txRs.events as any).length - 1].args.pool
        const pool1 = new TranchedPool__factory({
            ["contracts/protocol/core/TranchingLogic.sol:TranchingLogic"]: tranchingLogic.address
        }, owner).attach(pool1Addr)

        const creditLinePool1Slice1Addr = await pool1.creditLine()
        const creditLinePool1Slice1 = new CreditLine__factory({
            ["contracts/protocol/core/Accountant.sol:Accountant"]: accountant.address
        }, deployer).attach(creditLinePool1Slice1Addr)

        await time.increaseTo((await pool1.fundableAt()).add(1))

        const deadline1 = (await time.latest()) + 10 * 60
        const signature1 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer1.address, 1, deadline1, await uniqueIdentity.nonces(backer1.address))
        tx = await uniqueIdentity.connect(backer1).mint(1, deadline1, signature1, { value: parseUnits("83", 13) })

        const signature11 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer1.address, 1, deadline1, await uniqueIdentity.nonces(backer1.address))
        await expect(uniqueIdentity.connect(backer1).mint(1, deadline1, signature11, { value: parseUnits("83", 13) })).to.be.reverted
        expect(await fixedLeverageRatioStrategy.invest(seniorPool.address, pool1.address)).to.be.equal(BigNumber.from(0))
        await fixedLeverageRatioStrategy.connect(owner).updateDobermanConfig()

        // backer1 deposit to pool1
        await USDC.connect(backer1).approve(pool1.address, ethers.constants.MaxUint256)
        await pool1.connect(backer1).deposit(2, parseUnits("5001", usdcDecimal))
        await pool1.connect(backer1).withdraw(1, parseUnits('1', usdcDecimal))

        const deadline2 = (await time.latest()) + 10 * 60
        const signature2 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer2.address, 1, deadline2, await uniqueIdentity.nonces(backer2.address))
        tx = await uniqueIdentity.connect(backer2).mint(1, deadline2, signature2, { value: parseUnits("83", 13) })

        // backer2 deposit to pool1
        const deadline4 = (await time.latest()) + 10 * 60
        const depositSignature = await buildPermitSignature(backer2, {...usdcDomain}, pool1.address, parseUnits("3000", usdcDecimal), await USDC.nonces(backer2.address), deadline4)
        await pool1.connect(backer2).depositWithPermit(2, parseUnits("3000", usdcDecimal), deadline4, depositSignature.v, depositSignature.r, depositSignature.s)

        const deadline3 = (await time.latest()) + 10 * 60
        const signature3 = await buildMintUIDAllowanceSignatureEIP712(owner, { ...uniqueIdentityDomain }, backer3.address, 1, deadline3, await uniqueIdentity.nonces(backer3.address))
        await expect(uniqueIdentity.connect(backer3).mint(1, deadline3, signature3)).to.be.reverted
        tx = await uniqueIdentity.connect(backer3).mint(1, deadline3, signature3, { value: parseUnits("83", 13) })

        await pool1.connect(owner).pause()
        await pool1.connect(owner).unpause()
        await pool1.connect(owner).pauseDrawdowns()
        await pool1.connect(owner).unpauseDrawdowns()

        // backer3 deposit to pool1
        await USDC.connect(backer3).approve(pool1.address, ethers.constants.MaxUint256)
        await expect(pool1.connect(backer3).deposit(2, parseUnits("40001", usdcDecimal))).to.be.reverted
        await pool1.connect(backer3).deposit(2, parseUnits("4000", usdcDecimal))
        await expect(pool1.connect(owner).deposit(2, parseUnits("1", usdcDecimal))).to.be.reverted
        await expect(pool1.connect(backer3).deposit(2, parseUnits("40000001", usdcDecimal))).to.be.reverted

        // borrower lock junior capital
        await borrower1Contract.connect(borrower1).lockJuniorCapital(pool1.address)

        // backer1 deposit to senior pool
        await USDC.connect(backer1).approve(seniorPool.address, ethers.constants.MaxUint256)
        await seniorPool.connect(backer1).deposit(parseUnits("20000", usdcDecimal))

        // backer2 deposit to senior pool
        await USDC.connect(backer2).approve(seniorPool.address, ethers.constants.MaxUint256)
        await seniorPool.connect(backer2).deposit(parseUnits("50000", usdcDecimal))

        // backer3 deposit to senior pool
        // await USDC.connect(backer3).approve(seniorPool.address, ethers.constants.MaxUint256)
        // await seniorPool.connect(backer3).deposit(parseUnits("30000", usdcDecimal))
        const deadline5 = (await time.latest()) + 1000
        const signature4 = await buildPermitSignature(backer3, usdcDomain, seniorPool.address, parseUnits("3000", usdcDecimal), await USDC.nonces(backer3.address), deadline5)
        await seniorPool.connect(backer3).depositWithPermit(parseUnits("3000", usdcDecimal), deadline5, signature4.v, signature4.r, signature4.s)

        // senior pool deposit to poo1
        await seniorPool.connect(borrower1).invest(pool1.address)
        await expect(seniorPool.connect(borrower1).invest(pool1.address)).to.be.reverted
        expect(await fixedLeverageRatioStrategy.estimateInvestment(seniorPool.address, pool1.address)).to.be.equal(BigNumber.from(0))
        
        // borrower drawdown
        await time.increaseTo(1700000000 - 1)
        await borrower1Contract.connect(borrower1).drawdown(pool1.address, parseUnits("12000", usdcDecimal), zeroAddress)
        const withdrawableAmounts = await pool1.availableToWithdrawMultiple([1])
        expect(withdrawableAmounts[0]).to.be.equal(BigNumber.from(0))
        expect(withdrawableAmounts[0]).to.be.equal(BigNumber.from(0))
        
        await time.increaseTo(await creditLinePool1Slice1.nextDueTime())
        const debtAmounts = await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()

        await USDC.connect(borrower1).approve(borrower1Contract.address, ethers.constants.MaxUint256)
        await borrower1Contract.connect(borrower1).pay(pool1.address, debtAmounts[0].add(debtAmounts[1]))

        await time.increaseTo(await creditLinePool1Slice1.nextDueTime())
        const debtAmounts2 = await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()
        const deadline = (await time.latest()) + 1000
        const paySignature = await buildPermitSignature(borrower1, {...usdcDomain}, borrower1Contract.address, debtAmounts2[0].add(debtAmounts2[1]), await USDC.nonces(borrower1.address), deadline)
        await borrower1Contract.connect(borrower1).payWithPermit(pool1.address, debtAmounts2[0].add(debtAmounts2[1]), deadline, paySignature.v, paySignature.r, paySignature.s)

        await time.increaseTo(await creditLinePool1Slice1.nextDueTime())
        const debtAmounts4 = await creditLinePool1Slice1.getInterestAndPrincipalOwedAsOfCurrent()

        await USDC.connect(borrower1).approve(pool1.address, ethers.constants.MaxUint256)
        await pool1.connect(borrower1).pay(debtAmounts4[0].add(debtAmounts4[1]))
        await USDC.connect(borrower1).transfer(creditLinePool1Slice1.address, parseUnits('10', usdcDecimal))
        
        await pool1.connect(owner).emergencyShutdown()
        await time.increaseTo((await creditLinePool1Slice1.termEndTime()).add(1000))
    })
})