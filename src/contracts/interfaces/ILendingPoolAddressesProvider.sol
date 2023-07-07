// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ILendingPoolAddressesProvider interface
 */
interface ILendingPoolAddressesProvider {
  function setLendingPoolImpl(address _pool) external;
}
