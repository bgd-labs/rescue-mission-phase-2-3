// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRescue {
  function rescueTokens(address token, address to, uint256 amount) external;
}