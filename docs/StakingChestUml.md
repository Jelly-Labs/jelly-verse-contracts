## Staking/Chest Contract

The staking functionality is supposed to allow users to freeze their JLY for a period of time, giving them voting power, a dedicated amount of block rewards, and a dedicated amount of rewards from all different protocols in jellyverse. The users should be able to open a new staking position, which is represented by an NFT. They can deposit JLY to that NFT and set a freezing period. They can, at any point in time, increase the amount of staked JLY, or the freezing period. Once the freezing period is over they can withdraw some or all of the deposited amount. The staking position NFT also has a booster coefficient that is a function of time the position is opened, with a minimum value of 1 at time = 0, and converging to a maximum amount. Withdrawing any amount of JLY resets the booster to the initial amount. Each NFT has a certain amount of “power”, calculated by the following formula: power = booster * depositedJelly * (Min(0, unfreezingTime - currentTime) + basePower). Each NFTs voting power and rewards are calculated as the pro rata share of all the available “power”.

Latest Figma Flows and Chart: https://www.figma.com/file/qGvBuurYYNwsOhAhUO9u8Q/Jellyverse?type=design&node-id=5785-16076&mode=design&t=rFTVHNOSgicTgiHC-4

Flow Chart screenshot:
![chestsFlowCHart.png](./chestsFlowChart.svg)
## Characteristics

- Needs to have staking, freezing, increasing stake amount/freezePeriod and unstaking
- Needs to be able to calculate voting power and rewards
- Needs to create NFT (Chest) which represents the staking position

## Sequence Diagrams

1. Staking JLY tokens flow (received Chest can be frozen or open)

Reference:
`The users should be able to open a new staking position, which is represented by an NFT. They can deposit JLY to that NFT and set a freezing period.`

```mermaid
sequenceDiagram
    actor A as User
    participant B as JLY Token
    participant C as Staking
    Note over A: Needs to approve JLY tokens before staking
    A->>B: Approves token spend
    B->>B: _approve(StakingAddress, amountToStake)
    B->>A: Emit approved event 
    Note over A: Can now stake
    A->>C: Stake JLY Tokens 
    C->>B: Transfer user tokens to staking contract
    B->>B: _transferFrom(userAddress, stakingAddress, amount)
    B->>C: Confirms transfer
    C->>C: Updates internal states:  <br/> totalStaked, userStaked, freezePeriod, etc.
    C->>C: Mints NFT to User
    C->>C: Creates Metadata for NFT
    C->>A: Emit event (Staking position/Chest Created)
    Note over A: Has Chest with some voting power

```
Detailed:
```mermaid
sequenceDiagram
    actor A as User
    participant B as Frontend
    participant C as Wallet
    box Gray Blockchain Node 
    participant D as JLY Token
    participant E as Staking
    end
    Note over A: Needs to approve tokens before staking
    A->>B: Clicks approve button
    B->>B: Create approve tx 
    B->>C: Request to sign and submit created tx
    B->>B: Listen for Approval event
    C->>A: Request to sign tx
    A->>C: Signs and submits tx
    C->>D: Call approve function
    D->>D: _approve(stakingAddress, amount)
    D->>B: Approval Event emitted
    B->>B: Approval Event heard
    B->>A: User notified
    Note over A: Can now stake tokens
    A->>B: Click stake button
    B->>B: Create staking Tx
    B->>C: Request to sign and submit created tx
    B->>B: Listen for Staking event
    C->>A: Request to sign tx
    A->>C: Signs and submits tx
    C->>E: Call stake function
    E-->>D: Transfer tokens from user to staking contract
    D->>D: _transferFrom(userAddress, stakingAddress, amount)
    D-->>E: Confirms transfer
    E->>E: Updates internal states: <br/> totalStaked, userStaked, freezePeriod, etc.
    E->>E: Mints NFT to User
    E->>E: Creates Metadata for NFT
    E->>B: Emit event (Chest Created)
    B->>B: Staking Event heard
    B->>A: User notified that staking  is complete
    Note over A: Has Chest (Staking position NFT) <br/>with some voting power
```
2. Freeze Chest flow (when Chest is open)

Reference:
https://www.figma.com/file/qGvBuurYYNwsOhAhUO9u8Q/Jellyverse?type=design&node-id=5739-143385&mode=design&t=rFTVHNOSgicTgiHC-4
```mermaid
sequenceDiagram
    actor A as User
    participant B as Staking
    Note over A: Has Unfrozen Chest
    A->>B: Freezes Chest
    B->>B: Updates internal states (freezePeriod)
    B->>B: Updates Metadata for NFT
    B->>A: Emit event (Chest frozen)
    Note over A: Has Frozen the Chest <br/>(and increased voting power)

```
3. Extend Freeze Period on Chest flow (when Chest is frozen)

Reference:
`They can, at any point in time, increase the amount of staked JLY, or the *freezing period*`

```mermaid
sequenceDiagram
    actor A as User
    participant B as Staking
    Note over A: Has Frozen Chest
    A->>B: Extend Freeze Period for Chest
    B->>B: Updates internal states (freezePeriod)
    B->>B: Updates Metadata for NFT
    B->>A: Emit event (Chest freeze period extended)
    Note over A: Has Extended Freeze Period for the Chest<br/> (and voting power)

```
4. Add JLY to Chest (frozen or open)

Reference:
`They can, at any point in time, increase the amount of staked JLY`
```mermaid
sequenceDiagram
    actor A as User
    participant B as JLY Token
    participant C as Staking
    Note over A: Needs to approve JLY tokens before staking
    A->>B: Approves token spend
    B->>B: _approve(StakingAddress, amountToStake)
    B->>A: Emit approved event 
    Note over A: Can now increase stake
    A->>C: Increase Chest Stake Amount
    C->>B: Transfer user JLY tokens to staking contract
    B->>B: _transferFrom(userAddress, stakingAddress, amountToStake)
    B->>C: Confirms transfer
    C->>C: Updates internal states (totalStaked, userStaked)
    C->>C: Updates Metadata for NFT
    C->>A: Emit event (Chest staked amount increased)
    Note over A: Has Chest with increased staked amount <br/>(and voting power)

```
4. Unstake Chest (open)

Reference:
`Once the freezing period is over they can withdraw some or all of the deposited amount.`
```mermaid
sequenceDiagram
    actor A as User
    participant C as Staking
    participant B as JLY Token
    Note over A: Has Unfrozen Chest
    A->>C: Unstake some amount from Chest
    C->>C: Updates internal states:  <br/> userStakedAmount = userStakedAmount - unstakeAmount, <br/> booster = 1
    C->>B: Transfer unstakeAmount of JLY to user 
    B->>B: _transfer(userAddress, unstakeAmount)
    B->>C: Confirms transfer 
    C->>C: Updates Metadata for NFT
    C->>A: Emit event (Unstaked from Chest)
    Note over A: Has Chest with decreased staked amount, <br/>and voting power (booster reset to 1)

```

5. Unstake Special Chest

Reference:
https://www.figma.com/file/qGvBuurYYNwsOhAhUO9u8Q/Jellyverse?type=design&node-id=5739-143385&mode=design&t=rFTVHNOSgicTgiHC-4
```mermaid
sequenceDiagram
    actor A as User
    participant C as Staking
    participant B as JLY Token
    Note over A: Has Special Chest (and some time has passed <br/> after freeze period ended and vesting started)
    A->>C: Unstake some available amount from Chest
    C->>C: Updates internal states:  <br/> userStakedAmount = userStakedAmount - unstakeAmount, <br/> booster = 1
    C->>B: Transfer unstakeAmount of JLY to user 
    B->>B: _transfer(userAddress, unstakeAmount)
    B->>C: Confirms transfer 
    C->>C: Updates Metadata for NFT
    C->>A: Emit event (Unstaked from Chest)
    Note over A: Has Chest with decreased staked amount, <br/>and voting power booster reset to <1

```
