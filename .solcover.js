module.exports = {
    skipFiles:[
        'external', 'interfaces', 'library', 'mocks', 'rewards',
        'protocol/core/CreditDesk', 'protocol/core/DynamicLeverageRatioStrategy',
        'protocol/core/GFI', 'protocol/core/MigratedTranchedPool',
        'protocol/core/PoolBackup', 'protocol/core/SeniorPoolBackup',
        'protocol/periphery/BaseRelayRecipient', 'protocol/periphery/TransferRestrictedVault',
        'protocol/periphery/V2Migrator', 'protocol/core/ConfigHelper',
        'protocol/core/Pool'
    ]
}