// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "./BaseUpgradeablePausable.sol";
import "./ConfigHelper.sol";
import "./LeverageRatioStrategy.sol";
import "../../interfaces/ISeniorPoolStrategy.sol";
import "../../interfaces/ISeniorPool.sol";
import "../../interfaces/ITranchedPool.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FixedLeverageRatioStrategy is LeverageRatioStrategy {
    DobermanConfig public config;
    using ConfigHelper for DobermanConfig;

    event DobermanConfigUpdated(address indexed who, address configAddress);

    function initialize(
        address owner,
        DobermanConfig _config
    ) public initializer {
        require(
            owner != address(0) && address(_config) != address(0),
            "Owner and config addresses cannot be empty"
        );
        __BaseUpgradeablePausable__init(owner);
        config = _config;
    }

    function updateDobermanConfig() external onlyAdmin {
        config = DobermanConfig(config.configAddress());
        emit DobermanConfigUpdated(msg.sender, address(config));
    }

    function getLeverageRatio(
        ITranchedPool pool
    ) public view override returns (uint256) {
        return config.getLeverageRatio();
    }
}
