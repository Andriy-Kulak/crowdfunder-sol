// ----------------------------------------------------------------------------
// REQUIRED: Instructions
// ----------------------------------------------------------------------------
/*
  For this first project, we've provided a significant amount of scaffolding
  in your test suite. We've done this to:

    1. Set expectations, by example, of where the bar for testing is.
    2. Encourage more students to embrace an Advanced Typescript Hardhat setup.
    3. Reduce the amount of time consumed this week by "getting started friction".

  Please note that:

    - We will not be so generous on future projects!
    - The tests provided are about ~90% complete.
    - IMPORTANT:
      - We've intentionally left out some tests that would reveal potential
        vulnerabilities you'll need to identify, solve for, AND TEST FOR!

      - Failing to address these vulnerabilities will leave your contracts
        exposed to hacks, and will certainly result in extra points being
        added to your micro-audit report! (Extra points are _bad_.)

  Your job (in this file):

    - DO NOT delete or change the test names for the tests provided
    - DO complete the testing logic inside each tests' callback function
    - DO add additional tests to test how you're securing your smart contracts
         against potential vulnerabilties you identify as you work through the
         project.

    - You will also find several places where "FILL_ME_IN" has been left for
      you. In those places, delete the "FILL_ME_IN" text, and replace with
      whatever is appropriate.
*/
// ----------------------------------------------------------------------------

import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  Project,
  ProjectFactory,
  ProjectFactory__factory,
  Project__factory,
} from "../typechain";

// ----------------------------------------------------------------------------
// OPTIONAL: Constants and Helper Functions
// ----------------------------------------------------------------------------
// We've put these here for your convenience. Feel free to use them if they
// are helpful!
const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");

// Bump the timestamp by a specific amount of seconds
const timeTravel = async (seconds: number) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

// Or, set the time to be a specific amount (in seconds past epoch time)
const setBlockTimeTo = async (seconds: number) => {
  await network.provider.send("evm_setNextBlockTimestamp", [seconds]);
  await network.provider.send("evm_mine");
};
// ----------------------------------------------------------------------------

describe("Crowdfundr", () => {
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let lucy: SignerWithAddress;

  let ProjectFactory: ProjectFactory__factory;
  let projectFactory: ProjectFactory;

  beforeEach(async () => {
    [deployer, alice, bob, lucy] = await ethers.getSigners();

    // NOTE: You may need to pass arguments to the `deploy` function if your
    //       ProjectFactory contract's constructor has input parameters
    ProjectFactory = await ethers.getContractFactory("ProjectFactory");
    projectFactory = (await ProjectFactory.deploy()) as ProjectFactory;
    await projectFactory.deployed();
  });

  describe("ProjectFactory: Additional Tests", () => {
    describe("Creator", () => {
      it("should be able to create multiple contracts with the same creator", async () => {
        await projectFactory
          .connect(alice)
          .create("Test Project 1", "TP1", 1000);
        await projectFactory
          .connect(alice)
          .create("Test Project 2", "TP2", 1000000);

        const aliceContract0 = await projectFactory.creatorProjects(
          alice.address,
          0
        );

        const aliceContract1 = await projectFactory.creatorProjects(
          alice.address,
          1
        );
        expect(aliceContract0).to.exist;
        expect(aliceContract0.startsWith("0x") && aliceContract0.length === 42)
          .to.be.true;

        expect(aliceContract1).to.exist;
        expect(aliceContract1.startsWith("0x") && aliceContract1.length === 42)
          .to.be.true;
      });
    });
  });

  describe("ProjectFactory", () => {
    it("Deploys a contract", () => {
      expect(projectFactory.address).to.exist;
    });

    it("Can register a single project", async () => {
      await projectFactory.connect(alice).create("Test Project 1", "TP1", 1000);
      // confirming that alice has deployed a contract and it stored in a mapping
      const aliceContract = await projectFactory.creatorProjects(
        alice.address,
        0
      );
      expect(aliceContract).to.exist;
      expect(aliceContract.startsWith("0x") && aliceContract.length === 42).to
        .be.true;
    });

    it("Can register multiple projects", async () => {
      // here alice deploys 2 creator contracts and bob deploys 1.
      // we are confirming that addresses are stored in the mapping

      await projectFactory.connect(alice).create("Test Project 1", "TP1", 50);
      await projectFactory.connect(alice).create("Test Project 2", "TP2", 530);
      await projectFactory.connect(bob).create("Test Project 3", "TP3", 150);

      // confirming that alice has deployed a contract and it stored in a mapping
      const aliceContract1 = await projectFactory.creatorProjects(
        alice.address,
        0
      );
      expect(aliceContract1).to.exist;
      expect(aliceContract1.startsWith("0x")).to.be.true;

      const aliceContract2 = await projectFactory.creatorProjects(
        alice.address,
        1
      );
      expect(aliceContract2).to.exist;
      expect(aliceContract2.startsWith("0x")).to.be.true;

      const bobContract1 = await projectFactory.creatorProjects(bob.address, 0);
      expect(bobContract1).to.exist;
      expect(bobContract1.startsWith("0x")).to.be.true;
    });

    it("Registers projects with the correct owner", async () => {
      // bob created the project
      await projectFactory.connect(bob).create("Test Project 3", "TP3", 150);

      // contract that was created
      const bobContract1 = await projectFactory.creatorProjects(bob.address, 0);
      const creatorAddress = await new ethers.Contract(
        bobContract1,
        Project__factory.abi,
        ethers.provider
      ).creator();

      // check theat Project has the correct creator
      expect(bob.address).to.eq(creatorAddress);
    });

    it("Registers projects with a preset funding goal (in units of ether)", async () => {
      const goal = 113; // in eth

      // bob created the project
      await projectFactory.connect(bob).create("Test Project13", "TP13", goal);

      // contract that was created
      const bobContract1 = await projectFactory.creatorProjects(bob.address, 0);
      const creatorGoal = await new ethers.Contract(
        bobContract1,
        Project__factory.abi,
        ethers.provider
      ).goal();

      // check theat Project has the correct goal amount
      expect(creatorGoal).to.eq(goal);
    });

    it("Emits a ProjectCreated event after registering a project", async () => {
      const testProjectName = "Test Project 1";
      const testGoal = 13;
      // bob created the project
      await projectFactory
        .connect(bob)
        .create(testProjectName, "TP1", testGoal);

      const event = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated()
      );

      expect(event.length).to.eq(1); // we only want 1 event to have been fired

      // confirm values are what is expected
      const { newProject, projectName, goal, creator } = event[0].args;

      expect(newProject).to.exist;
      expect(newProject.startsWith("0x") && newProject.length === 42).to.eq(
        true
      );
      expect(projectName).to.eq(testProjectName);
      expect(goal).to.eq(testGoal);
      expect(bob.address).to.eq(creator);
    });

    it("Allows multiple contracts to accept ETH simultaneously", async () => {
      await Promise.all([
        projectFactory.connect(bob).create("test 1", "TP1", 40),
        projectFactory.connect(alice).create("test 2", "TP2", 34),
      ]);

      // confirming that alice has deployed a contract and it stored in a mapping
      const aliceContract1 = await projectFactory.creatorProjects(
        alice.address,
        0
      );
      expect(aliceContract1).to.exist;
      expect(aliceContract1.startsWith("0x")).to.be.true;

      const bobContract1 = await projectFactory.creatorProjects(bob.address, 0);
      expect(bobContract1).to.exist;
      expect(bobContract1.startsWith("0x")).to.be.true;
    });
  });

  describe("Project: Additional Tests", () => {
    let projectAddress: string;
    let project: Project;

    beforeEach(async () => {
      const projectName = "Test Crowfunder Project";
      const goal = ethers.utils.parseEther("10");
      const txReceiptUnresolved = await projectFactory
        .connect(lucy)
        .create(projectName, "TP1", goal);
      const txReceipt = await txReceiptUnresolved.wait();

      projectAddress = txReceipt.events![0].args![0];
      project = await ethers.getContractAt("Project", projectAddress);
    });

    describe("Contributor Withdraw", () => {
      it("Contributor tries to be fancy and refund twice simultaneously", async () => {
        await project.connect(alice).contribute({
          value: ethers.utils.parseEther("4"),
        });

        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("2"),
        });

        // cancel project so contributor can withdraw
        await project.connect(lucy).cancelProject();

        let isFailed = false;
        try {
          await Promise.all([
            project.connect(bob).getRefund(),
            project.connect(bob).getRefund(),
          ]);
        } catch (e) {
          isFailed = true;
        }
        expect(isFailed).to.eq(true);
      });
    });

    describe("Creator Withdraw", () => {
      it("Creator tries to be fancy and withdraw twice (more than total amount) simultaneously", async () => {
        await project.connect(alice).contribute({
          value: ethers.utils.parseEther("4"),
        });

        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("9"),
        });

        let isFailed = false;
        try {
          await Promise.all([
            project
              .connect(lucy)
              .withdrawCreatorFunds(ethers.utils.parseEther("10")),
            project
              .connect(lucy)
              .withdrawCreatorFunds(ethers.utils.parseEther("10")),
          ]);
        } catch (e) {
          isFailed = true;
        }
        expect(isFailed).to.eq(true);
        expect(await project.raisedAmount()).to.eq("3000000000000000000");
      });

      it("creator cannot withdraw if project was cancelled", async () => {
        await project.connect(alice).contribute({
          value: ethers.utils.parseEther("4"),
        });

        await project.connect(lucy).cancelProject();

        // confirm project is cancelled
        expect(await project.isProjectCancelled()).to.eq(true);

        // attempt to withdraw should fail
        await expect(
          project.connect(lucy).withdrawCreatorFunds(6666666)
        ).to.be.revertedWith(
          "Creator can only withdraw funds if project is a success"
        );
      });
    });

    it("Allows contributor badge holders to trade the NFT to another address even after its related project gets cancelled by contributor", async () => {
      await project.connect(bob).contribute({
        value: ethers.utils.parseEther("1.25"),
      });

      await project.connect(lucy).cancelProject();
      // project cancelled but we should still be able to trade

      const tokenId = 0;

      const oldOwnerOfToken0 = await project.ownerOf(tokenId);
      expect(bob.address).to.eq(oldOwnerOfToken0);

      await project.connect(bob).transferFrom(bob.address, alice.address, 0);

      const newOwnerOfToken0 = await project.ownerOf(tokenId);
      expect(alice.address).to.eq(newOwnerOfToken0);
    });

    describe("Cancel Project additional options", () => {
      it("cannot cancel project if it is successful", async () => {
        await project.connect(alice).contribute({
          value: ethers.utils.parseEther("4"),
        });

        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("90"),
        });

        await expect(project.connect(lucy).cancelProject()).to.be.revertedWith(
          "Can only cancel a project if the goal has not been met yet"
        );
      });

      it("non - creator cannot cancel the project", async () => {
        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("1.25"),
        });

        project.connect(bob).cancelProject;

        await expect(project.connect(bob).cancelProject()).to.be.revertedWith(
          "Only creator can cancel project"
        );
      });
    });
  });

  describe("Project", () => {
    let projectAddress: string;
    let project: Project;

    beforeEach(async () => {
      const projectName = "Test Crowfunder Project";
      const goal = ethers.utils.parseEther("10");
      const txReceiptUnresolved = await projectFactory
        .connect(lucy)
        .create(projectName, "TP1", goal);
      const txReceipt = await txReceiptUnresolved.wait();

      projectAddress = txReceipt.events![0].args![0];
      project = await ethers.getContractAt("Project", projectAddress);
    });

    describe("Contributions", () => {
      describe("Contributors", () => {
        it("Allows the creator to contribute", async () => {
          // lucy is the creator and contributor

          await project
            .connect(lucy)
            .contribute({ value: ethers.utils.parseEther("4.1") });
          const raisedAmount = await project.raisedAmount();
          const contributorState = await project.contributors(lucy.address);
          expect(raisedAmount).to.eq("4100000000000000000");
          expect(contributorState.amount).to.eq("4100000000000000000");

          expect(contributorState.badges).to.eq(4);
        });

        it("Allows any EOA to contribute", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("4.1") });
          const raisedAmount = await project.raisedAmount();
          const contributorState = await project.contributors(bob.address);
          expect(raisedAmount).to.eq("4100000000000000000");
          expect(contributorState.amount).to.eq("4100000000000000000");

          expect(contributorState.badges).to.eq(4);
        });

        it("Allows an EOA to make many separate contributions", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("4.1") });

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("1.2") }); // sum 5.3

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("1.9") }); // sum 7.2
          const raisedAmount = await project.raisedAmount();
          const contributorState = await project.contributors(bob.address);
          expect(raisedAmount).to.eq("7200000000000000000");
          expect(contributorState.amount).to.eq("7200000000000000000");

          expect(contributorState.badges).to.eq(7);
        });

        it("Emits a ContributionAdded event after a contribution is made", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("1.2") });
          const event = await project.queryFilter(
            project.filters.ContributionAdded()
          );

          expect(event.length).to.eq(1); // we only want 1 event to have been fired

          // confirm values are what is expected
          const { contributor, amount, badgesAdded } = event[0].args;
          expect(contributor).to.eq(bob.address);
          expect(amount).to.eq("1200000000000000000");
          expect(badgesAdded).to.eq(1);
        });
      });

      describe("Minimum ETH Per Contribution", () => {
        it("Reverts contributions below 0.01 ETH", async () => {
          await expect(
            project
              .connect(bob)
              .contribute({ value: ethers.utils.parseEther("0.002") })
          ).to.be.revertedWith("Contribution must be 0.01 eth or greater");
        });

        it("Accepts contributions of exactly 0.01 ETH", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("0.01") });

          // confirming that amount is being tracked
          const raisedAmount = await project.raisedAmount();
          const contributorState = await project.contributors(alice.address);
          expect(raisedAmount).to.eq("10000000000000000"); // 0.01 eth
          expect(contributorState.amount).to.eq("10000000000000000"); // 0.01 eth
        });
      });

      describe("Final Contributions", () => {
        it("Allows the final contribution to exceed the project funding goal", async () => {
          // goal is 10 eth

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("3") });
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("6.9") }); // this should make total 9.9 eth
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("10") }); // should be allowed

          expect(await project.isProjectSuccess()).to.eq(true);
          expect(await project.raisedAmount()).to.eq("19900000000000000000"); // 19.9 eth
        });

        it("Prevents additional contributions after a project is fully funded", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("10") }); // should be allowed
          await expect(
            project
              .connect(alice)
              .contribute({ value: ethers.utils.parseEther("0.01") })
          ).to.be.revertedWith("Goal has been met. No more can be contributed"); // should not be allowed
        });

        it("Prevents additional contributions after 30 days have passed since Project instance deployment", async () => {
          await timeTravel(SECONDS_IN_DAY * 31); // 31 days have passed. contribution should fail

          await expect(
            project
              .connect(alice)
              .contribute({ value: ethers.utils.parseEther("0.01") })
          ).to.be.revertedWith("Deadline to contribute has passed"); // should not be allowed
        });
      });
    });

    describe("Withdrawals", () => {
      describe("Project Status: Active", () => {
        it("Prevents the creator from withdrawing any funds", async () => {
          // only a total of 5 eth was contributed. goal is 10. therefore creator cannot withdraw funds
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("5") });

          await expect(
            project.connect(lucy).withdrawCreatorFunds(500000)
          ).to.be.revertedWith(
            "Creator can only withdraw funds if project is a success"
          );
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          // only a total of 5 eth was contributed. the project was not cancelled or ran out of time.
          // contributor should not be able to withdraw
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("5") });

          await expect(project.connect(bob).getRefund()).to.be.revertedWith(
            "For Refund, project must be either cancelled or go past deadline and not reach the goal"
          );
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          // one contributions
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("5") });

          // creator cancels the project
          await project.connect(lucy).cancelProject();

          // random account cannot withdraw

          await expect(project.connect(alice).getRefund()).to.be.revertedWith(
            "Contributor must have a balance greater than 0 to get refund"
          );
        });
      });

      describe("Project Status: Success", () => {
        it("Allows the creator to withdraw some of the contribution balance", async () => {
          // 12 eth was contributed between bob and alice. creator can withdraw part of balance
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("5") });

          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("7") });

          await project
            .connect(lucy)
            .withdrawCreatorFunds(ethers.utils.parseEther("0.3"));

          expect(await project.raisedAmount()).to.eq("11700000000000000000");
        });

        it("Allows the creator to withdraw the entire contribution balance", async () => {
          // 12 eth was contributed between bob and alice. creator can withdraw all of balance
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("5") });

          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("7") });

          await project
            .connect(lucy)
            .withdrawCreatorFunds(ethers.utils.parseEther("12"));

          expect(await project.raisedAmount()).to.eq("0");
        });

        it("Allows the creator to make multiple withdrawals", async () => {
          // 12 eth was contributed between bob and alice. creator can withdraw part of balance
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("5") });

          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("7") });

          // 1st withdrawal
          await project
            .connect(lucy)
            .withdrawCreatorFunds(ethers.utils.parseEther("0.5"));

          expect(await project.raisedAmount()).to.eq("11500000000000000000");

          // 2nd withdrawal
          await project
            .connect(lucy)
            .withdrawCreatorFunds(ethers.utils.parseEther("10"));

          expect(await project.raisedAmount()).to.eq("1500000000000000000"); // 1.5 eth
        });

        it("Prevents the creator from withdrawing more than the contribution balance", async () => {
          // 12 eth was contributed between bob and alice. creator cannot withdraw 15
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("5") });

          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("7") });

          await expect(
            project
              .connect(lucy)
              .withdrawCreatorFunds(ethers.utils.parseEther("15"))
          ).to.be.revertedWith(
            "Creator cannot request more than available amount"
          );
        });

        it("Emits a CreatorWithdraw event after a withdrawal is made by the creator", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("10.2") });

          await project
            .connect(lucy)
            .withdrawCreatorFunds(ethers.utils.parseEther("5"));
          const event = await project.queryFilter(
            project.filters.CreatorWithdraw()
          );

          expect(event.length).to.eq(1); // we only want 1 event to have been fired

          // confirm values are what is expected
          const { creator, amount } = event[0].args;
          expect(creator).to.eq(lucy.address);
          expect(amount).to.eq("5000000000000000000");
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("10.2") });

          await expect(project.connect(bob).getRefund()).to.be.revertedWith(
            "For Refund, project must be either cancelled or go past deadline and not reach the goal"
          );
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("10.2") });

          await expect(project.connect(alice).getRefund()).to.be.revertedWith(
            "Contributor must have a balance greater than 0 to get refund"
          );
        });
      });

      describe("Project Status: Failure", () => {
        it("Prevents the creator from withdrawing any funds (if not a contributor)", async () => {
          // project did not meet the goal and expired. creator should not be able to withdraw
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("2") });
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("2") });
          await timeTravel(SECONDS_IN_DAY * 35); // 35 days have passed. contribution should fail

          await expect(
            project
              .connect(lucy)
              .withdrawCreatorFunds(ethers.utils.parseEther("15"))
          ).to.be.revertedWith(
            "Creator can only withdraw funds if project is a success"
          );
        });

        it("Prevents contributors from withdrawing any funds (though they can still refund)", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("2") });
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("2") });
          await timeTravel(SECONDS_IN_DAY * 35); // 35 days have passed. contribution should fail

          // we cannot let bob (the contributor) try to withdraw funds
          await expect(
            project
              .connect(bob)
              .withdrawCreatorFunds(ethers.utils.parseEther("5"))
          ).to.be.revertedWith("Only creator can execute this");
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("2") });

          await timeTravel(SECONDS_IN_DAY * 35); // 35 days have passed. contribution should fail

          // alice is a non-contributor and should not be able to withdraw funds
          await expect(
            project.connect(bob).withdrawCreatorFunds(50000)
          ).to.be.revertedWith("Only creator can execute this");
        });
      });
    });

    describe("Refunds", () => {
      it("Allows contributors to be refunded when a project fails", async () => {
        await project
          .connect(bob)
          .contribute({ value: ethers.utils.parseEther("2") });
        await project
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("5") });

        await timeTravel(SECONDS_IN_DAY * 35); // 35 days have passed. contribution should fail
        await project.connect(alice).getRefund();
        await project.connect(bob).getRefund();

        const bobStatus = await project.contributors(bob.address);
        expect(bobStatus.amount).to.eq(0);

        const aliceStatus = await project.contributors(alice.address);
        expect(aliceStatus.amount).to.eq(0);
      });

      it("Prevents contributors from being refunded if a project has not failed", async () => {
        await project
          .connect(bob)
          .contribute({ value: ethers.utils.parseEther("2") });
        await project
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("35") });

        await timeTravel(SECONDS_IN_DAY * 35); // 35 days have passed. contribution should fail
        await expect(project.connect(alice).getRefund()).to.be.revertedWith(
          "For Refund, project must be either cancelled or go past deadline and not reach the goal"
        );
        await expect(project.connect(bob).getRefund()).to.be.revertedWith(
          "For Refund, project must be either cancelled or go past deadline and not reach the goal"
        );
      });

      it("Emits a ContributorRefunded event after a a contributor receives a refund", async () => {
        await project
          .connect(bob)
          .contribute({ value: ethers.utils.parseEther("2") });

        await timeTravel(SECONDS_IN_DAY * 35); // 35 days have passed. contribution should fail
        await project.connect(bob).getRefund();

        const event = await project.queryFilter(
          project.filters.ContributorRefunded()
        );

        expect(event.length).to.eq(1); // we only want 1 event to have been fired

        // confirm values are what is expected
        const { contributor, amount } = event[0].args;
        expect(contributor).to.eq(bob.address);
        expect(amount).to.eq("2000000000000000000");
      });
    });

    describe("Cancelations (creator-triggered project failures)", () => {
      it("Allows the creator to cancel the project if < 30 days since deployment has passed ", async () => {
        await timeTravel(SECONDS_IN_DAY * 25); // 25 days have passed. cancel should pass

        await project.connect(lucy).cancelProject();
        expect(await project.isProjectCancelled()).to.eq(true);
      });

      it("Prevents the creator from canceling the project if at least 30 days have passed", async () => {
        await timeTravel(SECONDS_IN_DAY * 35); // 35 days have passed. cancel should fail

        await expect(project.connect(lucy).cancelProject()).to.be.revertedWith(
          "Can only cancel before deadline"
        );
      });

      it("Emits a ProjectCancelled event after a project is cancelled by the creator", async () => {
        await project.connect(lucy).cancelProject();

        const event = await project.queryFilter(
          project.filters.ProjectCancelled()
        );

        expect(event.length).to.eq(1); // we only want 1 event to have been fired

        // confirm values are what is expected
        const { creator } = event[0].args;
        expect(creator).to.eq(lucy.address);
      });
    });

    describe("NFT Contributor Badges", () => {
      it("Awards a contributor with a badge when they make a single contribution of at least 1 ETH", async () => {
        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("1.1"),
        });

        const tokenId = 0;
        const ownerOfToken0 = await project.ownerOf(tokenId);
        expect(bob.address).to.eq(ownerOfToken0);

        expect(await project.tokenCount()).to.eq(1); // meaning only 1 nft was minted
      });

      it("Awards a contributor with a badge when they make multiple contributions to a single project that sum to at least 1 ETH", async () => {
        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("0.25"),
        });

        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("0.8"),
        });

        const tokenId = 0;
        const ownerOfToken0 = await project.ownerOf(tokenId);
        expect(bob.address).to.eq(ownerOfToken0);

        expect(await project.tokenCount()).to.eq(1); // meaning only 1 nft was minted
      });

      it("Does not award a contributor with a badge if their total contribution to a single project sums to < 1 ETH", async () => {
        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("0.25"),
        });

        const tokenId = 0;

        let isOwner;
        try {
          await project.ownerOf(tokenId);
          // above statement should error out and never make it to `isOwner = true;`
          isOwner = true;
        } catch (e) {
          isOwner = false;
        }
        expect(isOwner).to.eq(false);

        expect(await project.tokenCount()).to.eq(0); // meaning only 1 nft was minted
      });

      it("Awards a contributor with a second badge when their total contribution to a single project sums to at least 2 ETH", async () => {
        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("1.25"),
        });

        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("0.8"),
        });

        const tokenId0 = 0;
        const ownerOfToken0 = await project.ownerOf(tokenId0);
        expect(bob.address).to.eq(ownerOfToken0);

        const tokenId1 = 1;
        const ownerOfToken1 = await project.ownerOf(tokenId1);
        expect(bob.address).to.eq(ownerOfToken1);

        expect(await project.tokenCount()).to.eq(2); // meaning only 2 nfts were minted
      });

      it("Does not award a contributor with a second badge if their total contribution to a single project is > 1 ETH but < 2 ETH", async () => {
        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("1.25"),
        });

        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("0.25"),
        });

        const tokenId0 = 0;
        const ownerOfToken0 = await project.ownerOf(tokenId0);
        expect(bob.address).to.eq(ownerOfToken0);

        let isOwnerOfTokenId1;
        try {
          const tokenId1 = 1;
          await project.ownerOf(tokenId1);
          // above statement should error out and never make it to `isOwnerOfTokenId1 = true;`
          isOwnerOfTokenId1 = true;
        } catch (e) {
          isOwnerOfTokenId1 = false;
        }
        expect(isOwnerOfTokenId1).to.eq(false);

        expect(await project.tokenCount()).to.eq(1); // meaning only 1 nft was minted
      });

      it("Awards contributors with different NFTs for contributions to different projects", async () => {
        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("1.25"),
        });

        // a different project but same bob contributor :-)

        const projectName2 = "Test Crowfunder Project 222";
        const goal = ethers.utils.parseEther("13");
        const txReceiptUnresolved = await projectFactory
          .connect(lucy)
          .create(projectName2, "TP2", goal);
        const txReceipt = await txReceiptUnresolved.wait();

        const projectAddress2 = txReceipt.events![0].args![0];
        const project2 = await ethers.getContractAt("Project", projectAddress2);

        await project2.connect(bob).contribute({
          value: ethers.utils.parseEther("1.25"),
        });
        // finished creating project 2

        // now we want to confirm that bob has badges in both projects
        const tokenId0 = 0;
        const ownerOfProject1Token0 = await project.ownerOf(tokenId0);
        expect(bob.address).to.eq(ownerOfProject1Token0);

        const ownerOfProject2Token0 = await project2.ownerOf(tokenId0);
        expect(bob.address).to.eq(ownerOfProject2Token0);
      });

      it("Allows contributor badge holders to trade the NFT to another address", async () => {
        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("1.25"),
        });
        const tokenId = 0;

        const oldOwnerOfToken0 = await project.ownerOf(tokenId);
        expect(bob.address).to.eq(oldOwnerOfToken0);

        await project.connect(bob).transferFrom(bob.address, alice.address, 0);

        const newOwnerOfToken0 = await project.ownerOf(tokenId);
        expect(alice.address).to.eq(newOwnerOfToken0);
      });

      it("Allows contributor badge holders to trade the NFT to another address even after its related project fails", async () => {
        await project.connect(bob).contribute({
          value: ethers.utils.parseEther("1.25"),
        });

        await timeTravel(SECONDS_IN_DAY * 35); // 35 days have passed. contribution should fail
        // project expired but we should still be able to trade

        const tokenId = 0;

        const oldOwnerOfToken0 = await project.ownerOf(tokenId);
        expect(bob.address).to.eq(oldOwnerOfToken0);

        await project.connect(bob).transferFrom(bob.address, alice.address, 0);

        const newOwnerOfToken0 = await project.ownerOf(tokenId);
        expect(alice.address).to.eq(newOwnerOfToken0);
      });
    });
  });
});
