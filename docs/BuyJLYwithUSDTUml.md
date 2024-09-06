## Buy with USDT aka Pool Party
## Characteristics

- JLY tokens can be bought with USDT 
    - USDT should be deposited to the USDT-JLY pool (along with appropriate amount of JLY, based on rate)


## Sequence Diagrams

1. Buying JLY with USDT flow

```mermaid
sequenceDiagram
    actor A as User
    participant B as USDT Token
    participant C as PoolParty
    participant E as JLY-USDT Pool
    participant D as JLY Token
    Note over A: Needs to approve USDT tokens before buying JLY
    A->>B: Approves token spend
    B->>B: _approve(PoolPartyAddress, amountToSppend)
    B->>A: Emit approved event 
    A->>C: Call buyWithUSDT function
    activate C
    C->>B: Send USDT to PoolParty tokens
    B->>B: _transferFrom(userAddress, PoolPartyAddress, amountToStake)
    B->>C: Confirms transfer
    C->>C: Calculatest JLY amount (for join pool) <br/>based on USDT transferred
    C->>E: Join USDT-JLY Pool (where LP tokens are burned)
    E->>E: _join(jellySwapPoolId, PoolPartyAddress, zeroAddress, joinRequest)
    E->>C: Confirm join
    C->>D: Transfer JLY to User
    D->>D: _transfer(userAdderess, amount)
    D->>C: Confirm transfer
    C->>A: Confirm buy with USDT
    deactivate C
    Note over A: Has JLY tokens with no vesting period
```
