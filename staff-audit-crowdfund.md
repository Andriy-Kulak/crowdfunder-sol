https://github.com/0xMacro/student.Andriy-Kulak/tree/de1e22ff11c8ba8626398fd3997af36644377a7a/crowdfund

Audited By: brianwatroba

# General Comments

1. I really appreciated the thoroughness of your readme. It's a key starting point for auditors to understand your code, and it always leaves an immediate great impression when someone has taken the time to document the structure of their project (including features/tradoffs). This instinct will be valuable for you as you work on the different projects in the fellowship, especially the DAO project which requires more extensive documentation. Great work!
2. You caught a lot of key "gotchas" on your first project, which is awesome! For instance: you implemented the Checks Effects Interaction pattern to guard against re-entrancy, used `safeMint()` to ensure receivers can receive ERC721s, etc. This really shows that you absorbed the pre work and made an effort to implement what you learned and go the extra mile. That's awesome to see.
3. I liked your organizational approach of using a struct to organize Contributor balances for both contributions and badges. This also simplifies the calculations for "badges to award" as you keep the running totals in one place (and then calculate their delta). Great!

_To think about_:

1. Tracking project state: you do this via two storage variable booleans, `isProjectSuccess` and `isProjectCancelled`. This is very intuitive and makes sense. Good solution. Just for your own learning, there is another common design pattern in Solidity contracts for tracking state: using enums and view functions. For instance, because a project's success state is dependent on a combination of variables (is funding goal met, are we past deadline), you could write a view function that reads these variables and returns the current state as an enum. This could be combined with the cancelled state as well. The benefits of this approach: gas savings on variable storage, an external view function users can call to immediately understand the project state rather than querying separate variables, and the reduction of require checks to a specific state enum.

# Design Exercise

Really awesome answer. Your solution covers all bases: it provides tiered functionality that is highly transparent, stores it within the same contract, and preserves the main functionality of a ERC-721. I really appreciate how much time you took to write out your thoughts and show how you'd implement.

_To think about_:

1. What are the tradeoffs of this system? For instance, does waiting until project success to award badges help or hurt the user incentive to donate? Would fewer projects get funded this way? How could you allow for immediate awarding _and_ tiered badges based on cumulative contribution?
2. I encourage you to check out a different token standard: [the ERC-1155 standard](https://docs.openzeppelin.com/contracts/3.x/erc1155). It's essentially a fused ERC-20 and ERC-721 that allows for both to exist in the same contract. It's used by a lot of game developers as games need to have distinguished items. I actually use it in my day job at Stardust.gg! The main tradeoffs, however, is not all external and decentralized exchanges/marketplaces accept 1155, so we often have to write proxy contracts to interact with 1155 as ERC-20/ERC-721.

# Issues

**[M-1]** Users can contribute to cancelled projects

In your `contribute()` function, you have extensive require checks to ensure the project isn't already a success, the deadline hasn't passed, and the minimum contribution is met. Great work!

However, because you split your Project "success" state between two bools (`isProjectSuccess` and `isProjectCancelled`), you may have forgot to check the cancelled state for your `contribute()` functionality.

At worst this is a confusing experience for a user: they might contribute thinking it was successful, but won't have any notification on a front end to show they gave money to a Project that isn't currently open. They also have the ability to continue to collect badges after a project is cancelled.

Consider adding a require check to your `contribute()` function to guard against cancelled projects.

**[L-1]** Use of transfer

Your contract uses the `tranfer()` function to send ETH. Although this will
work it is no longer the recommended approach. `Transfer()` limits the gas
sent with the transfer call and has the potential to fail due to
rising gas costs. `Call()` is currently the best practice way to send ETH.

For a full breakdown of why, check out [this resource](https://consensys.net/diligence/blog/2019/09/stop-using-soliditys-transfer-now/)

For example: instead of using

```
payable(someAddress).transfer(amount);
```

The alternative, admittedly somewhat clumsy looking, recommendation is:

```
(bool success,) = payable(someAddress).call{value:amount}("");
require(success, "transfer failed"
```

Consider replacing your `tranfer()` functions with `call()` to send ETH.

**[Technical Mistake-1]** Creator can cancel twice

A creator can call cancel to emit the ProjectCancelled event multiple times.
This may cause a discrepancy for offchain applications that attempt to read
when a project got cancelled.

Consider adding a check to see if the project has already been cancelled before emitting the event or updating the storage variable.

**[Q-1]** Use NatSpec format for comments

Solidity contracts can use a special form of comments to provide rich
documentation for functions, return variables and more. This special form is
named the Ethereum Natural Language Specification Format (NatSpec).

It is recommended that Solidity contracts are fully annotated using NatSpec
for all public interfaces (everything in the ABI).

Using NatSpec will make your contracts more familiar for others audit, as well
as making your contracts look more standard.

For more info on NatSpec, check out [this guide](https://docs.soliditylang.org/en/develop/natspec-format.html).

Consider annotating your contract code via the NatSpec comment standard.

**[Q-2]** Using modifiers for repeated require checks

In your `withdrawCreatorFunds()` and `cancelProject()` functions you include individual require checks to ensure `msg.sender == creator`. This is great!

However, Solidity allows you to write modifiers so you can repeat logic checks and not re-write them each time. A good rule of thumb is whenever a require check is used more than once, it's appropriate to replace them with a modifer that each function can share.

For example:

```Solidity
modifier onlyCreator {
    require(msg.sender == creator, "must be project creator");
    _;
}
```

Consider using modifiers for any require checks used more than once.

# Nitpicks

- All functions in Project.sol are not called internally, can be marked `external` instead of `public`.
- Consider using constants for storage variables that don't change. Constants are most often written `LIKE_THIS` to visually differentiate them from variables that change. Consider writing a variable `minimumContribution` as `MIN_CONTRIBUTION`.
- Similar to constants, error strings are often written `LIKE_THIS` by convention. When a project has mutliple contracts that interact, it is also common to designate which contract the error is coming from for easier error tracing. Instead of `"Can only be called by creator"` on line 61 of Project.sol, consider writing `Project.sol: ONLY_CALLABLE_BY_CREATOR`. Solidity has also recently introduced custom errors, which you can also use.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | -     |
| Vulnerability              | 3     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | 1     |

Total: 4

Good job!
