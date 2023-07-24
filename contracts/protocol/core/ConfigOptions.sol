// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

/**
 * @title ConfigOptions
 * @notice A central place for enumerating the configurable options of our DobermanConfig contract
 * @author Doberman
 */

library ConfigOptions {
    // NEVER EVER CHANGE THE ORDER OF THESE!
    // You can rename or append. But NEVER change the order.
    enum Numbers {
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
    enum Addresses {
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
}
