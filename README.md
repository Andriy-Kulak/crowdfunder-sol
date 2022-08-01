# Crowdfunder (Solidity Smart Contract w/ Hardhat)

- this is my personal implementation of a crowfunder project (similar to kickstarter)

## Overview

The purpose of this project is the following:

- Build a smart contract that allows creators to register their projects.
- Other people can contribute ETH to that project.
- Once the goal has been met, the creators can withdraw the funds.
- When someone contributes 1 ETH, they receive a contributor badge NFT, which is tradable.

## Main Commands (to see tests)

- `npm i`
- `npx hardhat compile`
- `npx hardhat test`

## Technical Implementation

- I split the logic into 2 contracts `Project.sol` and `ProjectFactory.sol`. I am using factory pattern here.
- Every time a new project is registered, I create a new contract in Project using ProjectFactory.

### More Details

I added comments within contract where each of these features is added

1. The smart contract is reusable; multiple projects can be registered and accept ETH concurrently.

- (1a) Specifically, you should use the factory contract pattern.

2. The goal is a preset amount of ETH.

- (2a) This cannot be changed after a project gets created.

3. Regarding contributing:

- (3a) The contribute amount must be at least 0.01 ETH.
- (3b) There is no upper limit.
- (3c) Anyone can contribute to the project, including the creator.
- (3d) One address can contribute as many times as they like.
- (3e) No one can withdraw their funds until the project either fails or gets cancelled.

4. Regarding contributer badges:

- (4a) An address receives a badge if their total contribution is at least 1 ETH.
- (4b) One address can receive multiple badges, but should only receive 1 badge per 1 ETH.
- (4c) Each project should use its own NFT contract.

5. If the project is not fully funded within 30 days:

- (5a) The project goal is considered to have failed.
- (5b) No one can contribute anymore.
- (5c) Supporters get their money back.
- (5d) Contributor badges are left alone. They should still be tradable.

6. Once a project becomes fully funded:

- (6a) No one else can contribute (however, the last contribution can go over the goal).
- (6b) The creator can withdraw any amount of contributed funds.

7. The creator can choose to cancel their project before the 30 days are over, which has the same effect as a project failing.
