// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

/// @dev This interface provides a subset of the functionality of the IUniqueIdentity
/// interface -- namely, the subset of functionality needed by Doberman protocol contracts
/// compiled with Solidity version 0.6.12.
interface IUniqueIdentity0612 {
  function balanceOf(address account, uint256 id) external view returns (uint256);
}
