//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Project is ERC721 {
  struct ContributorState {
    uint256 amount;
    uint256 badges;
  }
  event ContributionAdded(
    address indexed contributor,
    uint256 amount,
    uint256 badgesAdded
  );

  event CreatorWithdraw(address indexed creator, uint256 amount);
  event ContributorRefunded(address indexed contributor, uint256 amount);
  event ProjectCancelled(address indexed creator, uint256 time);

  mapping(address => ContributorState) public contributors;
  uint256 public raisedAmount;
  uint256 public minimumContribution = 0.01 ether; // req: 3a
  bool public isProjectCancelled;
  bool public isProjectSuccess;
  uint256 public tokenCount;

  string public projectName;

  address public creator;
  uint256 public goal;
  uint256 public deadline; // timestamp

  constructor(
    string memory _projectName,
    string memory _projectSymbol,
    uint256 _goal,
    address _creator
  ) ERC721(projectName, _projectSymbol) {
    projectName = _projectName;
    creator = _creator;
    goal = _goal; // req: 2 and 2a

    deadline = block.timestamp + 30 days; // req: 5 => setting deadline 30 days from creation
  }

  // req: II, IV, 3a, 3b, 3c, 3d, 5b
  function contribute() public payable {
    require(
      isProjectSuccess == false,
      "Goal has been met. No more can be contributed"
    );
    require(block.timestamp < deadline, "Deadline to contribute has passed");
    require(
      msg.value >= minimumContribution,
      "Contribution must be 0.01 eth or greater"
    );

    contributors[msg.sender].amount += msg.value;

    uint256 additionalBadges = contributors[msg.sender].amount /
      (10**18) -
      contributors[msg.sender].badges; // rounded down automaticallly

    contributors[msg.sender].badges += additionalBadges;

    // req: 6a
    raisedAmount += msg.value;
    if (raisedAmount >= goal) {
      isProjectSuccess = true;
    }

    // req: 4a, 4b
    uint256 badgeMintCount = 0;
    while (badgeMintCount < additionalBadges) {
      badgeMintCount++;

      _safeMint(msg.sender, tokenCount);

      tokenCount++;
    }

    emit ContributionAdded(msg.sender, msg.value, additionalBadges);
  }

  // req: 3e, 5a, 5c
  function getRefund() public {
    require(
      contributors[msg.sender].amount > 0,
      "Contributor must have a balance greater than 0 to get refund"
    );
    require(
      (block.timestamp > deadline && isProjectSuccess == false) ||
        isProjectCancelled == true,
      "For Refund, project must be either cancelled or go past deadline and not reach the goal"
    );

    // updating all the state first before sending money to avoid re-entrancy attack
    uint256 value = contributors[msg.sender].amount;
    contributors[msg.sender].amount = 0;
    address payable recepient = payable(msg.sender);

    recepient.transfer(value);
    emit ContributorRefunded(msg.sender, value);
  }

  // req: 7
  function cancelProject() public {
    require(
      isProjectSuccess == false,
      "Can only cancel a project if the goal has not been met yet"
    );
    require(msg.sender == creator, "Only creator can cancel project");
    require(block.timestamp < deadline, "Can only cancel before deadline");
    isProjectCancelled = true;

    emit ProjectCancelled(msg.sender, block.timestamp);
  }

  // req: III, 3e, 6b
  function withdrawCreatorFunds(uint256 amount) public {
    require(creator == msg.sender, "Only creator can execute this");
    require(
      isProjectSuccess == true,
      "Creator can only withdraw funds if project is a success"
    );
    require(
      isProjectCancelled == false,
      "Creator cannot withdraw funds if project was cancelled"
    );

    require(
      amount <= raisedAmount,
      "Creator cannot request more than available amount"
    );

    // update all state before transfering
    raisedAmount -= amount;

    // send the funds to creator
    payable(creator).transfer(amount);
    emit CreatorWithdraw(creator, amount);
  }
}
