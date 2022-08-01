Great job Andriy! I couldn’t find a single vulnerability.

At first I thought you had the safemint re-entrancy vulnerability, but then I noticed that you had appropriate guards to prevent any vulnerability. I left my writeup for it in case you’re interested in how I came to that conclusion

There are appropriate guards to prevent minting more coins than a user deserves.

ex:

1.  Mallory contract sends 1 eth
2.  Project contract calls _safeMint
3.  _safeMint creates a token with id 0
4.  _safeMint calls Mallory’s onERC721Received()
5.  Mallory’s onERC721Received() calls contribute with 0.01 eth
6.  There are no more additional badges to mint on the second call beceause `additionalBadges` is 1 - 1 = 0

However, it’s worth noting that if Mallory sends 1 eth instead of 0.1 eth (in step 5 via onERC721Recieved()), it’ll attempt to create another token with id 0 since the tokenCount hasn’t been incremented in the first contribute call and _mint() will fail with [](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol#L281)[https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol#L281](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol#L281) “ERC721: token already mined”, thereby preventing the entire transaction fro occuring. I don’t think this is a bug though because minting via recursive calls is not part of the specs.

# Nits

-   You can save extra state by removing numBadges in the struct (you can get that from balanceOf)
-   In Line 62 you can just use 1 ether instead of writing about the exponent expression
-   Add a check that prevents a creator from cancelling a project more than once. This could be confusing for programs that depend on the ProjectCancelled event.