#!/usr/bin/env node

/**
 * Demo Script for XPR Token Transfer CLI
 * 
 * This script demonstrates various features and use cases of the XPR Token Transfer CLI.
 * It's designed to be educational and show best practices for Proton blockchain interactions.
 * 
 * Usage: node demo.js [demo-name]
 * 
 * Available demos:
 * - basic: Basic token transfer
 * - batch: Batch transfer example
 * - error-handling: Error handling scenarios
 * - account-info: Account information retrieval
 * - all: Run all demos
 */

const { initializeProtonSDK, getBalance, transferToken, getAccountInfo, accountExists, batchTransfer } = require('./chain/token-transfer');
const { logger, formatAmount, parseAmount } = require('./utils');
const { config, getNetworkType } = require('./config');

/**
 * Demo 1: Basic Token Transfer
 * 
 * This demo shows the most common use case - transferring XPR tokens
 * between accounts. It demonstrates:
 * - SDK initialization
 * - Account validation
 * - Balance checking
 * - Token transfer
 * - Result handling
 */
async function demoBasicTransfer() {
  logger.info('=== Demo 1: Basic Token Transfer ===');
  
  try {
    // Initialize SDK
    await initializeProtonSDK();
    logger.info('SDK initialized successfully');
    
    // Check sender balance
    const senderBalance = await getBalance(config.account.name);
    logger.info(`Sender balance: ${senderBalance}`);
    
    // Demo recipient (you can change this to a real account)
    const demoRecipient = 'dochuong';
    const transferAmount = '0.1000 XPR'; // Small amount for demo
    
    // Check if recipient exists
    const recipientExists = await accountExists(demoRecipient);
    if (!recipientExists) {
      logger.warn(`Demo recipient ${demoRecipient} does not exist`);
      logger.info('This is expected for demo purposes');
      return;
    }
    
    // Perform transfer
    logger.info(`Transferring ${transferAmount} to ${demoRecipient}...`);
    const result = await transferToken(demoRecipient, transferAmount, 'Demo transfer');
    
    if (result.success) {
      logger.info('Transfer successful!');
      logger.info(`Transaction ID: ${result.transactionId}`);
      logger.info(`Block Number: ${result.blockNumber}`);
      
      // Check new balance
      const newBalance = await getBalance(config.account.name);
      logger.info(`New sender balance: ${newBalance}`);
    } else {
      logger.error(`Transfer failed: ${result.error}`);
    }
    
  } catch (error) {
    logger.error('Demo failed:', error.message);
  }
}

/**
 * Demo 2: Batch Transfer
 * 
 * This demo shows how to send multiple transfers in a single transaction.
 * This is more efficient than sending individual transfers and can save on fees.
 */
async function demoBatchTransfer() {
  logger.info('=== Demo 2: Batch Transfer ===');
  
  try {
    await initializeProtonSDK();
    
    // Create demo transfers
    const transfers = [
      {
        to: 'dochuong',
        amount: '0.0500 XPR',
        memo: 'Batch transfer 1'
      },
      {
        to: 'dochuong',
        amount: '0.0500 XPR',
        memo: 'Batch transfer 2'
      }
    ];
    
    logger.info(`Preparing batch transfer of ${transfers.length} transactions`);
    
    // Validate all recipients exist
    for (const transfer of transfers) {
      const exists = await accountExists(transfer.to);
      if (!exists) {
        logger.warn(`Recipient ${transfer.to} does not exist - skipping batch demo`);
        return;
      }
    }
    
    // Execute batch transfer
    const result = await batchTransfer(transfers);
    
    if (result.success) {
      logger.info('Batch transfer successful!');
      logger.info(`Transaction ID: ${result.transactionId}`);
      logger.info(`Block Number: ${result.blockNumber}`);
    } else {
      logger.error(`Batch transfer failed: ${result.error}`);
    }
    
  } catch (error) {
    logger.error('Batch demo failed:', error.message);
  }
}

/**
 * Demo 3: Error Handling
 * 
 * This demo shows common error scenarios and how to handle them properly.
 * It demonstrates defensive programming practices for blockchain applications.
 */
async function demoErrorHandling() {
  logger.info('=== Demo 3: Error Handling ===');
  
  try {
    await initializeProtonSDK();
    
    // Test 1: Invalid account name
    logger.info('Test 1: Invalid account name');
    try {
      await getBalance('invalid-account-name!');
    } catch (error) {
      logger.info(`Expected error: ${error.message}`);
    }
    
    // Test 2: Non-existent account
    logger.info('Test 2: Non-existent account');
    try {
      await getBalance('nonexistent123');
    } catch (error) {
      logger.info(`Expected error: ${error.message}`);
    }
    
    // Test 3: Invalid amount format
    logger.info('Test 3: Invalid amount format');
    try {
      const result = await transferToken('dochuong', 'invalid-amount', 'Test');
      if (!result.success) {
        logger.info(`Expected error: ${result.error}`);
      }
    } catch (error) {
      logger.info(`Expected error: ${error.message}`);
    }
    
    // Test 4: Insufficient funds (if applicable)
    logger.info('Test 4: Large amount transfer (might fail due to insufficient funds)');
    try {
      const result = await transferToken('dochuong', '999999.0000 XPR', 'Test large amount');
      if (!result.success) {
        logger.info(`Expected error: ${result.error}`);
      }
    } catch (error) {
      logger.info(`Expected error: ${error.message}`);
    }
    
  } catch (error) {
    logger.error('Error handling demo failed:', error.message);
  }
}

/**
 * Demo 4: Account Information
 * 
 * This demo shows how to retrieve and display account information.
 * This is useful for checking account status, resources, and permissions.
 */
async function demoAccountInfo() {
  logger.info('=== Demo 4: Account Information ===');
  
  try {
    await initializeProtonSDK();
    
    // Get sender account info
    logger.info('Getting sender account information...');
    const senderInfo = await getAccountInfo(config.account.name);
    
    logger.info('Sender Account Details:');
    logger.info(`  Account Name: ${senderInfo.account_name}`);
    logger.info(`  Created: ${senderInfo.created}`);
    logger.info(`  RAM Usage: ${senderInfo.ram_usage}/${senderInfo.ram_quota}`);
    logger.info(`  CPU Limit: ${senderInfo.cpu_limit.used}/${senderInfo.cpu_limit.max}`);
    logger.info(`  Net Limit: ${senderInfo.net_limit.used}/${senderInfo.net_limit.max}`);
    
    // Get balance
    const balance = await getBalance(config.account.name);
    logger.info(`  Balance: ${balance}`);
    
    // Check if demo account exists
    const demoAccount = 'dochuong';
    const exists = await accountExists(demoAccount);
    logger.info(`Demo account ${demoAccount} exists: ${exists}`);
    
    if (exists) {
      const demoBalance = await getBalance(demoAccount);
      logger.info(`Demo account balance: ${demoBalance}`);
    }
    
  } catch (error) {
    logger.error('Account info demo failed:', error.message);
  }
}

/**
 * Demo 5: Network Information
 * 
 * This demo shows network information and configuration details.
 * This is useful for understanding the current network setup.
 */
async function demoNetworkInfo() {
  logger.info('=== Demo 5: Network Information ===');
  
  try {
    await initializeProtonSDK();
    
    logger.info('Network Configuration:');
    logger.info(`  Endpoint: ${config.blockchain.endpoint}`);
    logger.info(`  Chain ID: ${config.blockchain.chainId}`);
    logger.info(`  Network Type: ${getNetworkType().toUpperCase()}`);
    logger.info(`  Token Contract: ${config.token.contract}`);
    logger.info(`  Token Symbol: ${config.token.symbol}`);
    logger.info(`  Token Precision: ${config.token.precision}`);
    
    logger.info('Transaction Configuration:');
    logger.info(`  Blocks Behind: ${config.transaction.blocksBehind}`);
    logger.info(`  Expire Seconds: ${config.transaction.expireSeconds}`);
    
    logger.info('Account Configuration:');
    logger.info(`  From Account: ${config.account.name}`);
    logger.info(`  Private Key: ${config.account.privateKey ? '***configured***' : 'not configured'}`);
    
  } catch (error) {
    logger.error('Network info demo failed:', error.message);
  }
}

/**
 * Run all demos
 */
async function runAllDemos() {
  logger.info('🚀 Starting XPR Token Transfer CLI Demos');
  logger.info('=' .repeat(60));
  
  await demoNetworkInfo();
  logger.info('');
  
  await demoAccountInfo();
  logger.info('');
  
  await demoBasicTransfer();
  logger.info('');
  
  await demoBatchTransfer();
  logger.info('');
  
  await demoErrorHandling();
  logger.info('');
  
  logger.info('=' .repeat(60));
  logger.info('All demos completed!');
}

/**
 * Main function
 */
async function main() {
  const demoName = process.argv[2] || 'all';
  
  try {
    switch (demoName) {
      case 'basic':
        await demoBasicTransfer();
        break;
      case 'batch':
        await demoBatchTransfer();
        break;
      case 'error-handling':
        await demoErrorHandling();
        break;
      case 'account-info':
        await demoAccountInfo();
        break;
      case 'network-info':
        await demoNetworkInfo();
        break;
      case 'all':
        await runAllDemos();
        break;
      default:
        logger.info('Available demos:');
        logger.info('  basic - Basic token transfer');
        logger.info('  batch - Batch transfer example');
        logger.info('  error-handling - Error handling scenarios');
        logger.info('  account-info - Account information retrieval');
        logger.info('  network-info - Network information');
        logger.info('  all - Run all demos');
        logger.info('');
        logger.info('Usage: node demo.js [demo-name]');
        break;
    }
  } catch (error) {
    logger.error('Demo failed:', error.message);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  demoBasicTransfer,
  demoBatchTransfer,
  demoErrorHandling,
  demoAccountInfo,
  demoNetworkInfo,
  runAllDemos,
};
