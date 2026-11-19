// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Test-only stand-in for the Agent ID registry (ERC-721).
/// @dev Implements just `mint` and `balanceOf` — the only surface AgentWall
///      (and the tests) rely on. NOT for deployment.
contract MockAgentId {
    mapping(address => uint256) private _balances;

    function mint(address to) external {
        _balances[to] += 1;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }
}
