#!/usr/bin/env node

/**
 * Basic Usage Example
 * 
 * This example shows the most common use cases for the XPR Token Transfer CLI.
 * It demonstrates basic operations that developers will use most frequently.
 * 
 * Prerequisites:
 * - Configure .env file with your private key and account
 * - Ensure you have some XPR tokens for testing
 * 
 * Usage: node examples/basic-usage.js
 */

const { initializeProtonSDK, getBalance, transferToken, getAccountInfo } = require('../chain/token-transfer');
const { logger } = require('../utils');
const { config } = require('../config');

async function basicUsageExample() {
  try {
    logger.info('=== Basic Usage Example ===');
    
    // Step 1: Initialize the SDK
    logger.info('Step 1: Initializing Proton SDK...');
    await initializeProtonSDK();
    logger.info('SDK initialized successfully');
    
    // Step 2: Check your balance
    logger.info('Step 2: Checking account balance...');
    const balance = await getBalance(config.account.name);
    logger.info(`Your balance: ${balance}`);
    
    // Step 3: Get account information
    logger.info('Step 3: Getting account information...');
    const accountInfo = await getAccountInfo(config.account.name);
    logger.info(`Account: ${accountInfo.account_name}`);
    logger.info(`Created: ${accountInfo.created}`);
    logger.info(`RAM Usage: ${accountInfo.ram_usage}/${accountInfo.ram_quota}`);
    
    // Step 4: Transfer tokens (example - change recipient to a real account)
    const recipient = 'dochuong'; // Change this to a real account
    const amount = '0.1000 XPR';  // Small amount for testing
    
    logger.info(`Step 4: Transferring ${amount} to ${recipient}...`);
    const result = await transferToken(recipient, amount, 'Basic usage example');
    
    if (result.success) {
      logger.info('Transfer successful!');
      logger.info(`Transaction ID: ${result.transactionId}`);
      logger.info(`Block Number: ${result.blockNumber}`);
      
      // Step 5: Check new balance
      logger.info('Step 5: Checking new balance...');
      const newBalance = await getBalance(config.account.name);
      logger.info(`New balance: ${newBalance}`);
    } else {
      logger.error(`Transfer failed: ${result.error}`);
    }
    
  } catch (error) {
    logger.error('Example failed:', error.message);
  }
}

// Run the example
if (require.main === module) {
  basicUsageExample();
}

module.exports = { basicUsageExample };
