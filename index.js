#!/usr/bin/env node

/**
 * XPR Token Transfer CLI
 * Following XPR Network developer examples standards
 * 
 * Usage: node index.js --to <account> --amount <amount> [--memo <memo>]
 */

const { Command } = require('commander');
const { initializeProtonSDK, getBalance, transferToken, getAccountInfo, accountExists, batchTransfer } = require('./chain/token-transfer');
const { logger, formatAmount } = require('./utils');
const { config, getNetworkType } = require('./config');

const program = new Command();

program
  .name('xpr-transfer')
  .description('CLI script for sending XPR tokens on Proton blockchain')
  .version('1.0.0');

program
  .option('-t, --to <account>', 'Recipient account')
  .option('-a, --amount <amount>', 'Token amount (e.g., 1.0000 XPR)')
  .option('-m, --memo <memo>', 'Transaction memo')
  .option('-b, --balance', 'Check sender account balance')
  .option('--check-balance <account>', 'Check specific account balance')
  .option('--account-info <account>', 'View detailed account information')
  .option('--batch <file>', 'Send batch transfer from JSON file')
  .option('--exists <account>', 'Check if account exists')
  .option('--network', 'Display current network information');

program.parse();

const options = program.opts();

/**
 * Main function
 */
async function main() {
  try {
    logger.info('XPR Token Transfer CLI');
    logger.info('=' .repeat(50));
    
    // Initialize Proton SDK
    await initializeProtonSDK();
    
    const networkType = getNetworkType();
    logger.info(`Network: ${networkType.toUpperCase()}`);
    logger.info(`From Account: ${config.account.name}`);
    
    // Handle different commands
    if (options.network) {
      await showNetworkInfo();
    } else if (options.balance) {
      await checkSenderBalance();
    } else if (options.checkBalance) {
      await checkSpecificBalance(options.checkBalance);
    } else if (options.accountInfo) {
      await showAccountInfo(options.accountInfo);
    } else if (options.exists) {
      await checkAccountExists(options.exists);
    } else if (options.batch) {
      await handleBatchTransfer(options.batch);
    } else if (options.to && options.amount) {
      await handleSingleTransfer(options.to, options.amount, options.memo);
    } else {
      showHelp();
    }
    
  } catch (error) {
    logger.error('Error:', error.message);
    process.exit(1);
  }
}

/**
 * Show network information
 */
async function showNetworkInfo() {
  logger.info('Network Information:');
  logger.info(`Endpoint: ${config.blockchain.endpoint}`);
  logger.info(`Chain ID: ${config.blockchain.chainId}`);
  logger.info(`Network Type: ${getNetworkType().toUpperCase()}`);
  logger.info(`Token Contract: ${config.token.contract}`);
  logger.info(`Token Symbol: ${config.token.symbol}`);
}

/**
 * Check sender balance
 */
async function checkSenderBalance() {
  logger.info(`Checking balance for ${config.account.name}...`);
  
  try {
    const balance = await getBalance(config.account.name);
    logger.info(`Balance: ${balance}`);
  } catch (error) {
    logger.error(`Failed to get balance: ${error.message}`);
  }
}

/**
 * Check specific account balance
 */
async function checkSpecificBalance(accountName) {
  logger.info(`Checking balance for ${accountName}...`);
  
  try {
    const balance = await getBalance(accountName);
    logger.info(`Balance: ${balance}`);
  } catch (error) {
    logger.error(`Failed to get balance: ${error.message}`);
  }
}

/**
 * Show account information
 */
async function showAccountInfo(accountName) {
  logger.info(`Getting account info for ${accountName}...`);
  
  try {
    const accountInfo = await getAccountInfo(accountName);
    logger.info('Account information retrieved successfully');
  } catch (error) {
    logger.error(`Failed to get account info: ${error.message}`);
  }
}

/**
 * Check if account exists
 */
async function checkAccountExists(accountName) {
  logger.info(`Checking if account ${accountName} exists...`);
  
  try {
    const exists = await accountExists(accountName);
    if (exists) {
      logger.info(`Account ${accountName} exists`);
    } else {
      logger.info(`Account ${accountName} does not exist`);
    }
  } catch (error) {
    logger.error(`Failed to check account: ${error.message}`);
  }
}

/**
 * Handle single transfer
 */
async function handleSingleTransfer(toAccount, amount, memo) {
  logger.info(`Preparing transfer...`);
  logger.info(`To: ${toAccount}`);
  logger.info(`Amount: ${amount}`);
  logger.info(`Memo: ${memo || '(none)'}`);
  
  // Check if recipient account exists
  logger.info('Checking recipient account...');
  const exists = await accountExists(toAccount);
  if (!exists) {
    logger.error(`Recipient account ${toAccount} does not exist`);
    return;
  }
  logger.info(`Recipient account ${toAccount} exists`);
  
  // Check sender balance
  logger.info('Checking sender balance...');
  const senderBalance = await getBalance(config.account.name);
  logger.info(`Sender balance: ${senderBalance}`);
  
  // Execute transfer
  logger.info('Executing transfer...');
  const result = await transferToken(toAccount, amount, memo);
  
  if (result.success) {
    logger.info('Transfer completed successfully!');
    logger.info(`Transaction ID: ${result.transactionId}`);
    logger.info(`Block Number: ${result.blockNumber}`);
    
    // Check balance after transfer
    logger.info('Checking balance after transfer...');
    const newBalance = await getBalance(config.account.name);
    logger.info(`New balance: ${newBalance}`);
  } else {
    logger.error(`Transfer failed: ${result.error}`);
  }
}

/**
 * Handle batch transfer
 */
async function handleBatchTransfer(filePath) {
  logger.info(`Processing batch transfer from ${filePath}...`);
  
  try {
    const fs = require('fs');
    const batchData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!Array.isArray(batchData)) {
      throw new Error('Batch file must contain an array of transfer objects');
    }
    
    logger.info(`Found ${batchData.length} transfers to process`);
    
    // Validate all transfers first
    for (let i = 0; i < batchData.length; i++) {
      const transfer = batchData[i];
      if (!transfer.to || !transfer.amount) {
        throw new Error(`Transfer ${i + 1} is missing required fields (to, amount)`);
      }
      
      // Check if recipient exists
      const exists = await accountExists(transfer.to);
      if (!exists) {
        logger.warn(`Recipient account ${transfer.to} does not exist (transfer ${i + 1})`);
      }
    }
    
    // Execute batch transfer
    const result = await batchTransfer(batchData);
    
    if (result.success) {
      logger.info('Batch transfer completed successfully!');
      logger.info(`Transaction ID: ${result.transactionId}`);
      logger.info(`Block Number: ${result.blockNumber}`);
    } else {
      logger.error(`Batch transfer failed: ${result.error}`);
    }
    
  } catch (error) {
    logger.error(`Batch transfer error: ${error.message}`);
  }
}

/**
 * Show help information
 */
function showHelp() {
  logger.info('Usage Examples:');
  logger.info('');
  logger.info('1. Check sender balance:');
  logger.info('   node index.js --balance');
  logger.info('');
  logger.info('2. Send XPR:');
  logger.info('   node index.js --to receiver --amount "1.0000 XPR"');
  logger.info('');
  logger.info('3. Send with memo:');
  logger.info('   node index.js --to receiver --amount "1.0000 XPR" --memo "Payment"');
  logger.info('');
  logger.info('4. Check specific account balance:');
  logger.info('   node index.js --check-balance receiver');
  logger.info('');
  logger.info('5. Get account information:');
  logger.info('   node index.js --account-info receiver');
  logger.info('');
  logger.info('6. Check if account exists:');
  logger.info('   node index.js --exists receiver');
  logger.info('');
  logger.info('7. Show network information:');
  logger.info('   node index.js --network');
  logger.info('');
  logger.info('8. Batch transfer from file:');
  logger.info('   node index.js --batch transfers.json');
  logger.info('');
  logger.info('Batch file format (transfers.json):');
  logger.info('   [');
  logger.info('     {"to": "receiver1", "amount": "1.0000 XPR", "memo": "Payment 1"},');
  logger.info('     {"to": "receiver2", "amount": "2.0000 XPR", "memo": "Payment 2"}');
  logger.info('   ]');
}

// Run main function
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  showNetworkInfo,
  checkSenderBalance,
  checkSpecificBalance,
  showAccountInfo,
  checkAccountExists,
  handleSingleTransfer,
  handleBatchTransfer,
};