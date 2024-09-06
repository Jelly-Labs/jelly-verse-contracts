## Rewards Claiming (Vesting)

When users claim rewards we want to give them two options: claim now and lose a certain percentage of rewards (40% - 50%) or start a 30 day reward vesting period to get 100% of rewards. If the user triggers vesting, they can at any point sacrifice a percentage of their rewards to claim them right away, with the percentage loss linearly decreasing. The user cannot trigger another vesting (add new rewards to the currently vesting ones) before they claim the rewards that are currently vesting. For example a user has earned 1000 jly in rewards on day 0 and they want to claim them. If they click claim now they will receive 500 jly in their wallet right away. If they click start vesting the 1000 jly is added to their vesting bucket and they have to wait for 30 days before the jly will be available on their wallet (1000 jly in claim queue claimable on day 30). If after 15 days (on day 15) they want to claim the vesting rewards they can do so and claim 750 jly (50% + 15 / 30 * 50% = 75%). This probably means changing the reward distribution architecture so that if the user clicks claim in 30 days the rewards are sent to a new vesting SC, from which they are claimable from that point onwards.

Flow chart can be found in docs folder:
![RewardsClaimingFlowChart.png](./RewardsClaimingFlowChart.png)

## Characteristics

- Rewards can be claimed immediately with 50% reduction in rewards or fully after a 30 day vesting period. If user wants to claim in between they can do so with a linearly decreasing percentage of rewards lost.
- Tax on rewards is burned.

## Sequence Diagrams

1. Claim immediately rewards flow (freeze period ended)

```mermaid
sequenceDiagram
    actor A as User
    participant B as Rewards Distribution Contract
    participant C as JLY Token
    participant D as Vesting Contract
    Note over A: User has 1000 jly in claim queue
    alt claim now
        A->>B: Claim all rewards now
        B->>C: Transfer 500 jly to user (half of rewards)
        C->>C: _transfer(userAddress, halfOfRewards)
        C->>B: Confirm transfer
        B->>C: Burn rest (500 jly, half of rewards)
        C->>C: _transfer(zeroAddress, halfOfRewards)
        C->>B: Confirm transfer
        B->>A: Confirm claim
    Note over A: User received 500 JLY tokens, <br/> and has 0 jly in claim queue
    else start vesting
        A->>B: Start vesting of rewards
        B->>C: Approve vesting contract to spend 1000 jly (total amount)
        C->>C: _approve(vestingContractAddress, totalAmount)
        C->>B: Confirm Approval
        B->>D: Call vesting function
        D->>C: Transfer tokens to vesting contract
        C->>C: _transferFrom(rewardsDistributionAddress, vestingAddress, totalAmount)
        C->>D: Confirm transfer
        D->>D: Update user state on vesting contract
        D->>B: Confirm vesting
        B->>A: Confirm vesting started
        Note over A: User has 1000 JLY in vesting contract <br/> and 0 JLY in claim queue
        alt user waits until vesting period ends
            A->>D: Call claim function
            D->>D: Update user state on vesting contract
            D->>C: Transfer 1000 tokens to user (full amount)
            C->>C: _transfer(userAddress, totalAmount)
            C->>D: Confirm transfer
            D->>A: Confirm claim
            Note over A: User has received 1000 JLY tokens <br/> and has 0 JLY in vesting contract
        else user claims from vesting before vesting period ends (30 days) e.g. on day 15
            A->>D: Call claim function
            D->>D: Calculate amount to transfer (50% + day / 30 * 50%)
            D->>D: Update user state on vesting contract
            D->>C: Transfer 750 tokens to user (50% + 15 / 30 * 50%)
            C->>C: _transfer(userAddress, calculatedAmount)
            C->>D: Confirm transfer
            D->>C: Burn remaining tokens (250 JLY)
            C->>C: _transfer(zeroAddress, remainingAmount)
            C->>D: Confirm transfer
            D->>A: Confirm claim
            Note over A: User has received 750 JLY tokens <br/>(calculated amount based on linear decreasing percentage) <br/> and has 0 JLY in vesting contract (burned 250 JLY)
        end
    end
```
