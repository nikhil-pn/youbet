const { expect } = require("chai");
const hre = require("hardhat");
const {
  loadFixture,
nox } = require("@nomicfoundation/hardhat-toolbox-viem/network-helpers");
const { parseEther, getAddress } = require("viem");

describe("SimpleBetting", function () {
  const betId = "testBet001";

  // Indices for Bet struct fields
  const BET_MODERATOR_IDX = 0;
  const BET_AMOUNT_IDX = 1;
  const BET_TOTAL_POOL_IDX = 2;
  const BET_YES_COUNT_IDX = 3;
  const BET_NO_COUNT_IDX = 4;
  const BET_IS_RESOLVED_IDX = 5;

  async function deploySimpleBettingFixture() {
    const betAmount = parseEther("1");
    const [owner, addr1, addr2, addr3, ...otherAccounts] =
      await hre.viem.getWalletClients();
    const simpleBetting = await hre.viem.deployContract("SimpleBetting");
    const publicClient = await hre.viem.getPublicClient();
    return {
      simpleBetting,
      owner,
      addr1,
      addr2,
      addr3,
      otherAccounts,
      betAmount,
      publicClient,
      betId,
    };
  }

  describe("Bet Creation", function () {
    it("Should allow a user to create a new bet", async function () {
      const { simpleBetting, owner, addr3, betAmount, betId, publicClient } =
        await loadFixture(deploySimpleBettingFixture);

      const makeBetHash = await simpleBetting.write.betmake([
        betId,
        getAddress(addr3.account.address),
        betAmount,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: makeBetHash });

      const bet = await simpleBetting.read.getBet([betId]);
      
      expect(bet[BET_MODERATOR_IDX]).to.equal(getAddress(addr3.account.address));
      expect(bet[BET_AMOUNT_IDX]).to.equal(betAmount);
      expect(bet[BET_TOTAL_POOL_IDX]).to.equal(0n);
      expect(bet[BET_YES_COUNT_IDX]).to.equal(0n); 
      expect(bet[BET_NO_COUNT_IDX]).to.equal(0n);  
      expect(bet[BET_IS_RESOLVED_IDX]).to.be.false;
    });
  });

  describe("Voting", function () {
    async function fixtureWithBetCreated() {
      const fixture = await loadFixture(deploySimpleBettingFixture);
      const makeBetHash = await fixture.simpleBetting.write.betmake([
        fixture.betId,
        getAddress(fixture.addr3.account.address),
        fixture.betAmount,
      ]);
      await fixture.publicClient.waitForTransactionReceipt({ hash: makeBetHash });
      return fixture;
    }

    it("Should allow users to vote 'yes' and update pool", async function () {
      const { simpleBetting, addr1, betAmount, betId, publicClient } = await loadFixture(
        fixtureWithBetCreated
      );
      const voteHash = await simpleBetting.write.vote([betId, 1], {
        value: betAmount,
        account: addr1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: voteHash });
      const bet = await simpleBetting.read.getBet([betId]);
      expect(bet[BET_YES_COUNT_IDX]).to.equal(1n);
      expect(bet[BET_NO_COUNT_IDX]).to.equal(0n);
      expect(bet[BET_TOTAL_POOL_IDX]).to.equal(betAmount);
      expect(
        await simpleBetting.read.hasVoted([betId, getAddress(addr1.account.address)])
      ).to.be.true;
    });

    it("Should allow users to vote 'no' and update pool", async function () {
      const { simpleBetting, addr2, betAmount, betId, publicClient } = await loadFixture(
        fixtureWithBetCreated
      );
      const voteHash = await simpleBetting.write.vote([betId, 0], {
        value: betAmount,
        account: addr2.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: voteHash });
      const bet = await simpleBetting.read.getBet([betId]);
      expect(bet[BET_YES_COUNT_IDX]).to.equal(0n);
      expect(bet[BET_NO_COUNT_IDX]).to.equal(1n);
      expect(bet[BET_TOTAL_POOL_IDX]).to.equal(betAmount);
      expect(
        await simpleBetting.read.hasVoted([betId, getAddress(addr2.account.address)])
      ).to.be.true;
    });

    it("Should revert if user tries to vote twice", async function () {
      const { simpleBetting, addr1, betAmount, betId, publicClient } = await loadFixture(
        fixtureWithBetCreated
      );
      const vote1Hash = await simpleBetting.write.vote([betId, 1], {
        value: betAmount,
        account: addr1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: vote1Hash });
      await expect(
        simpleBetting.write.vote([betId, 1], {
          value: betAmount,
          account: addr1.account,
        })
      ).to.be.rejectedWith("Already voted");
    });

    it("Should revert if incorrect bet amount is sent", async function () {
      const { simpleBetting, addr1, betId } = await loadFixture(
        fixtureWithBetCreated
      );
      const incorrectAmount = parseEther("0.5");
      await expect(
        simpleBetting.write.vote([betId, 1], {
          value: incorrectAmount,
          account: addr1.account,
        })
      ).to.be.rejectedWith("Must send exact bet amount");
    });
  });

  describe("Releasing Funds", function () {
    async function fixtureWithVotes() {
      const fixture = await loadFixture(deploySimpleBettingFixture);
      const { simpleBetting, owner, addr1, addr2, addr3, betAmount, betId, publicClient } =
        fixture;

      const makeBetHash = await simpleBetting.write.betmake(
        [betId, getAddress(addr3.account.address), betAmount],
        { account: owner.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: makeBetHash });

      const vote1Hash = await simpleBetting.write.vote([betId, 1], {
        value: betAmount,
        account: addr1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: vote1Hash });

      const vote2Hash = await simpleBetting.write.vote([betId, 1], {
        value: betAmount,
        account: owner.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: vote2Hash });

      const vote3Hash = await simpleBetting.write.vote([betId, 0], {
        value: betAmount,
        account: addr2.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: vote3Hash });
      return fixture;
    }

    it("Should allow moderator to release funds to 'yes' winners", async function () {
      const {
        simpleBetting,
        addr1,
        addr3,
        betAmount,
        betId,
        publicClient,
      } = await loadFixture(fixtureWithVotes);

      const initialBalanceAddr1 = await publicClient.getBalance({
        address: getAddress(addr1.account.address),
      });

      const releaseHash = await simpleBetting.write.release([betId, 1], {
        account: addr3.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: releaseHash });

      const bet = await simpleBetting.read.getBet([betId]);
      expect(bet[BET_IS_RESOLVED_IDX]).to.be.true;

      const expectedPayout = (betAmount * 3n) / 2n;

      const finalBalanceAddr1 = await publicClient.getBalance({
        address: getAddress(addr1.account.address),
      });
      expect(finalBalanceAddr1).to.equal(initialBalanceAddr1 + expectedPayout);
    });

    it("Should allow moderator to release funds to 'no' winners", async function () {
      const {
        simpleBetting,
        addr2,
        addr3,
        betAmount,
        betId,
        publicClient,
      } = await loadFixture(fixtureWithVotes);

      const initialBalanceAddr2 = await publicClient.getBalance({
        address: getAddress(addr2.account.address),
      });

      const releaseHash = await simpleBetting.write.release([betId, 0], {
        account: addr3.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: releaseHash });

      const bet = await simpleBetting.read.getBet([betId]);
      expect(bet[BET_IS_RESOLVED_IDX]).to.be.true;

      const expectedPayout = (betAmount * 3n) / 1n;

      const finalBalanceAddr2 = await publicClient.getBalance({
        address: getAddress(addr2.account.address),
      });
      expect(finalBalanceAddr2).to.equal(initialBalanceAddr2 + expectedPayout);
    });

    it("Should revert if non-moderator tries to release funds", async function () {
      const { simpleBetting, addr1, betId } = await loadFixture(
        fixtureWithVotes
      );
      await expect(
        simpleBetting.write.release([betId, 1], { account: addr1.account })
      ).to.be.rejectedWith("Only moderator can release");
    });

    it("Should revert if trying to release an already resolved bet", async function () {
      const { simpleBetting, addr3, betId, publicClient } = await loadFixture(
        fixtureWithVotes
      );
      const releaseHash = await simpleBetting.write.release([betId, 1], {
        account: addr3.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: releaseHash });

      await expect(
        simpleBetting.write.release([betId, 1], { account: addr3.account })
      ).to.be.rejectedWith("Already resolved");
    });

    it("Should handle case with no winners (funds remain in contract)", async function () {
      const {
        simpleBetting,
        owner,
        addr1, 
        addr2, 
        addr3,
        betAmount,
        publicClient,
      } = await loadFixture(deploySimpleBettingFixture);
      
      const noWinnerBetId = "noWinnerBet002";

      const makeBetHash = await simpleBetting.write.betmake(
        [noWinnerBetId, getAddress(addr3.account.address), betAmount],
        { account: owner.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: makeBetHash });

      const initialBalanceVoter1 = await publicClient.getBalance({ address: getAddress(addr1.account.address) });
      const initialBalanceVoter2 = await publicClient.getBalance({ address: getAddress(addr2.account.address) });
      
      const vote1Hash = await simpleBetting.write.vote([noWinnerBetId, 1], {
        value: betAmount,
        account: addr1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: vote1Hash });

      const vote2Hash = await simpleBetting.write.vote([noWinnerBetId, 1], {
        value: betAmount,
        account: addr2.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: vote2Hash });
      
      const releaseHash = await simpleBetting.write.release([noWinnerBetId, 0], {
        account: addr3.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: releaseHash });

      const bet = await simpleBetting.read.getBet([noWinnerBetId]);
      expect(bet[BET_IS_RESOLVED_IDX]).to.be.true;
      
      const finalBalanceVoter1 = await publicClient.getBalance({ address: getAddress(addr1.account.address) });
      const finalBalanceVoter2 = await publicClient.getBalance({ address: getAddress(addr2.account.address) });

      expect(finalBalanceVoter1 < initialBalanceVoter1).to.be.true;
      expect(finalBalanceVoter2 < initialBalanceVoter2).to.be.true;
    });
  });

  describe("Get Bet Details", function () {
    it("Should return correct bet details", async function () {
      const { simpleBetting, owner, addr1, addr2, addr3, betAmount, betId, publicClient } =
        await loadFixture(deploySimpleBettingFixture);

      const makeBetHash = await simpleBetting.write.betmake([
        betId,
        getAddress(addr3.account.address),
        betAmount],
        { account: owner.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: makeBetHash });

      const vote1Hash = await simpleBetting.write.vote([betId, 1], {
        value: betAmount,
        account: addr1.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: vote1Hash });

      const vote2Hash = await simpleBetting.write.vote([betId, 0], {
        value: betAmount,
        account: addr2.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: vote2Hash });

      const betDetails = await simpleBetting.read.getBet([betId]);

      expect(betDetails[BET_MODERATOR_IDX]).to.equal(getAddress(addr3.account.address));
      expect(betDetails[BET_AMOUNT_IDX]).to.equal(betAmount);
      expect(betDetails[BET_TOTAL_POOL_IDX]).to.equal(betAmount * 2n);
      expect(betDetails[BET_YES_COUNT_IDX]).to.equal(1n);
      expect(betDetails[BET_NO_COUNT_IDX]).to.equal(1n);
      expect(betDetails[BET_IS_RESOLVED_IDX]).to.be.false;
    });
  });
}); 