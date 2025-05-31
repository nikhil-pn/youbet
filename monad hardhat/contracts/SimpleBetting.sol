// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SimpleBetting {
    
    struct Bet {
        string betId;
        address moderator;
        uint256 betAmount;
        uint256 totalPool;
        address[] yesVoters;
        address[] noVoters;
        bool isResolved;
    }
    
    mapping(string => Bet) public bets;
    mapping(string => mapping(address => bool)) public hasVoted;
    
    /**
     * @dev Create a new bet
     * @param betId Unique string identifier for the bet
     * @param mod Moderator address who can release funds
     * @param betAmount Amount each voter must pay
     */
    function betmake(string memory betId, address mod, uint256 betAmount) external {
        bets[betId] = Bet({
            betId: betId,
            moderator: mod,
            betAmount: betAmount,
            totalPool: 0,
            yesVoters: new address[](0),
            noVoters: new address[](0),
            isResolved: false
        });
    }
    
    /**
     * @dev Vote on a bet
     * @param betId The bet identifier
     * @param option 0 for No, 1 for Yes
     */
    function vote(string memory betId, int8 option) external payable {
        Bet storage bet = bets[betId];
        require(msg.value == bet.betAmount, "Must send exact bet amount");
        require(!hasVoted[betId][msg.sender], "Already voted");
        require(!bet.isResolved, "Bet already resolved");
        
        hasVoted[betId][msg.sender] = true;
        bet.totalPool += msg.value;
        
        if (option == 1) {
            bet.yesVoters.push(msg.sender);
        } else {
            bet.noVoters.push(msg.sender);
        }
    }
    
    /**
     * @dev Release funds to winning side
     * @param betId The bet identifier
     * @param winOption 0 if No wins, 1 if Yes wins
     */
    function release(string memory betId, int8 winOption) external {
        Bet storage bet = bets[betId];
        require(!bet.isResolved, "Already resolved");
        
        bet.isResolved = true;
        
        address[] memory winners;
        if (winOption == 1) {
            winners = bet.yesVoters;
        } else {
            winners = bet.noVoters;
        }
        
        if (winners.length > 0) {
            uint256 amountPerWinner = bet.totalPool / winners.length;
            
            for (uint i = 0; i < winners.length; i++) {
                payable(winners[i]).transfer(amountPerWinner);
            }
        }
    }
    
    /**
     * @dev Get bet details
     */
    function getBet(string memory betId) external view returns (
        address moderator,
        uint256 betAmount,
        uint256 totalPool,
        uint256 yesCount,
        uint256 noCount,
        bool isResolved
    ) {
        Bet memory bet = bets[betId];
        return (
            bet.moderator,
            bet.betAmount,
            bet.totalPool,
            bet.yesVoters.length,
            bet.noVoters.length,
            bet.isResolved
        );
    }
}