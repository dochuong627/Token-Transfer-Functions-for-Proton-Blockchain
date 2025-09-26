#!/usr/bin/env node

/**
 * Batch Payments Example
 * 
 * This example demonstrates how to send multiple payments in a single transaction.
 * This is more efficient than sending individual transfers and can save on transaction fees.
 * 
 * Use cases:
 * - Payroll systems
 * - Airdrops
 * - Bulk payments
 * - Reward distributions
 * 
 * Usage: node examples/batch-payments.js
 */

const { initializeProtonSDK, batchTransfer, getBalance } = require('../chain/token-transfer');
const { logger } = require('../utils');
const { config } = require('../config');

async function batchPaymentsExample() {
  try {
    logger.info('=== Batch Payments Example ===');
    
    // Initialize SDK
    await initializeProtonSDK();
    
    // Check initial balance
    const initialBalance = await getBalance(config.account.name);
    logger.info(`Initial balance: ${initialBalance}`);
    
    // Example 1: Payroll System
    logger.info('Example 1: Payroll System');
    const payrollTransfers = [
      {
        to: 'employee1',
        amount: '100.0000 XPR',
        memo: 'Salary - January 2024'
      },
      {
        to: 'employee2',
        amount: '150.0000 XPR',
        memo: 'Salary - January 2024'
      },
      {
        to: 'employee3',
        amount: '120.0000 XPR',
        memo: 'Salary - January 2024'
      }
    ];
    
    logger.info(`Preparing payroll for ${payrollTransfers.length} employees...`);
    
    // Note: This will fail if accounts don't exist, but demonstrates the concept
    try {
      const result = await batchTransfer(payrollTransfers);
      if (result.success) {
        logger.info('Payroll batch transfer successful!');
        logger.info(`Transaction ID: ${result.transactionId}`);
      } else {
        logger.info(`Payroll transfer failed (expected): ${result.error}`);
      }
    } catch (error) {
      logger.info(`Payroll transfer failed (expected): ${error.message}`);
    }
    
    // Example 2: Airdrop
    logger.info('Example 2: Token Airdrop');
    const airdropTransfers = [
      {
        to: 'user1',
        amount: '10.0000 XPR',
        memo: 'Welcome airdrop'
      },
      {
        to: 'user2',
        amount: '10.0000 XPR',
        memo: 'Welcome airdrop'
      },
      {
        to: 'user3',
        amount: '10.0000 XPR',
        memo: 'Welcome airdrop'
      },
      {
        to: 'user4',
        amount: '10.0000 XPR',
        memo: 'Welcome airdrop'
      },
      {
        to: 'user5',
        amount: '10.0000 XPR',
        memo: 'Welcome airdrop'
      }
    ];
    
    logger.info(`Preparing airdrop for ${airdropTransfers.length} users...`);
    
    try {
      const result = await batchTransfer(airdropTransfers);
      if (result.success) {
        logger.info('Airdrop batch transfer successful!');
        logger.info(`Transaction ID: ${result.transactionId}`);
      } else {
        logger.info(`Airdrop transfer failed (expected): ${result.error}`);
      }
    } catch (error) {
      logger.info(`Airdrop transfer failed (expected): ${error.message}`);
    }
    
    // Example 3: Reward Distribution
    logger.info('Example 3: Reward Distribution');
    const rewardTransfers = [
      {
        to: 'winner1',
        amount: '50.0000 XPR',
        memo: 'Contest winner - 1st place'
      },
      {
        to: 'winner2',
        amount: '30.0000 XPR',
        memo: 'Contest winner - 2nd place'
      },
      {
        to: 'winner3',
        amount: '20.0000 XPR',
        memo: 'Contest winner - 3rd place'
      }
    ];
    
    logger.info(`Preparing rewards for ${rewardTransfers.length} winners...`);
    
    try {
      const result = await batchTransfer(rewardTransfers);
      if (result.success) {
        logger.info('Reward distribution successful!');
        logger.info(`Transaction ID: ${result.transactionId}`);
      } else {
        logger.info(`Reward distribution failed (expected): ${result.error}`);
      }
    } catch (error) {
      logger.info(`Reward distribution failed (expected): ${error.message}`);
    }
    
    // Check final balance
    const finalBalance = await getBalance(config.account.name);
    logger.info(`Final balance: ${finalBalance}`);
    
    logger.info('=== Batch Payments Example Complete ===');
    logger.info('Note: Transfers failed because demo accounts don\'t exist');
    logger.info('This demonstrates the batch transfer concept and error handling');
    
  } catch (error) {
    logger.error('Batch payments example failed:', error.message);
  }
}

// Run the example
if (require.main === module) {
  batchPaymentsExample();
}

module.exports = { batchPaymentsExample };
