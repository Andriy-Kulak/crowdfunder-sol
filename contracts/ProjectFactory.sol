//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;
import "./Project.sol";

contract ProjectFactory {
  mapping(address => address[]) public creatorProjects;

  event ProjectCreated(
    address indexed newProject,
    string projectName,
    uint256 goal,
    address creator
  );

  // req: I,
  function create(
    string memory _projectName,
    string memory _projectSymbol,
    uint256 _goal
  ) external {
    // req: 1 and 1a, 4c
    Project project = new Project(
      _projectName,
      _projectSymbol,
      _goal,
      msg.sender
    );

    // keep track of all the projects that creator has created
    creatorProjects[msg.sender].push(address(project));

    emit ProjectCreated(address(project), _projectName, _goal, msg.sender);
  }
}
