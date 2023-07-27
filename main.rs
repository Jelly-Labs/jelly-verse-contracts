extern crate alloy_primitives;

use std::env;
use alloy_primitives::U256;


/**
 * 01 January 2024   = 1704067200
 * 01 June 2024      = 1717200000
 * 25 June 2024      = 1719273600
 * 07 July 2024      = 1720310400
 * 08 August 2024    = 1723075200
 * 08 September 2024 = 1725753600
 * 09 October 2024   = 1728432000
 * 09 November 2024  = 1731110400
 * 10 December 2024  = 1733788800
 * 10 January 2025   = 1736467200
 * 10 February 2025  = 1739145600
 * 12 March 2025     = 1741737600
 * 12 April 2025     = 1744416000
 * 13 May 2025       = 1747094400
 * 13 June 2025      = 1749772800
 * 14 July 2025      = 1752451200
 * 14 August 2025    = 1755129600
 * 14 September 2025 = 1757808000
 * 15 October 2025   = 1760486400
 * 15 November 2025  = 1763164800
 * 15 December 2025  = 1765756800
 * 31 December 2025  = 1767139200
 * 01 January 2026   = 1767225600
 *
 *
 * startTimestamp = 1704067200 (01 January 2024)
 * cliffTimestamp = 1719792000 (01 July 2024)
 * cliffDuration = 15778458
 * totalDuration = 63113832
 */

fn vested_amount(amount: U256, start_timestamp: u64, cliff_timestamp: u64, total_duration: u32, block_timestamp: u64) -> U256 {
    if block_timestamp < cliff_timestamp {
        return U256::from(0_u32);
    } else if block_timestamp >= (start_timestamp + total_duration as u64) {
        return amount;
    } else {
        return amount * U256::from(block_timestamp - start_timestamp) / U256::from(total_duration);
    }   
}

fn main() {
    let amount: U256 = U256::from(133_000_000_u32) * U256::from(10_u32).pow(U256::from(18_u32));

    let args: Vec<String> = env::args().collect();
    let start_timestamp: u64 = args[1].parse().unwrap();
    let cliff_timestamp: u64 = args[2].parse().unwrap();
    let total_duration: u32 = args[3].parse().unwrap();
    let block_timestamp: u64 = args[4].parse().unwrap();

    let vested_amount = vested_amount(amount, start_timestamp, cliff_timestamp, total_duration, block_timestamp);

    print!("{:#x}", vested_amount);
}

