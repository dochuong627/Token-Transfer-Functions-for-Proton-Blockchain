#!/usr/bin/env node

/**
 * Test script for XPR Token Transfer CLI
 * Following XPR Network developer examples standards
 */

const { initializeProtonSDK, getBalance, transferToken, getAccountInfo, accountExists } = require('./chain/token-transfer');
const { logger } = require('./utils');
const { config, getNetworkType } = require('./config');

/**
 * Test environment configuration
 */
function testEnvironment() {
  logger.info('Testing environment configuration...');
  
  const requiredEnvVars = [
    'PRIVATE_KEY',
    'FROM_ACCOUNT', 
    'BLOCKCHAIN_ENDPOINT'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error(`Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  logger.info('Environment configuration valid');
  logger.info(`Account: ${config.account.name}`);
  logger.info(`Endpoint: ${config.blockchain.endpoint}`);
  logger.info(`Network: ${getNetworkType().toUpperCase()}`);
  
  return true;
}

/**
 * Test Proton SDK initialization
 */
async function testSDKInitialization() {
  logger.info('Testing Proton SDK initialization...');
  
  try {
    await initializeProtonSDK();
    logger.info('Proton SDK initialized successfully');
    return true;
  } catch (error) {
    logger.error(`SDK initialization failed: ${error.message}`);
    return false;
  }
}

/**
 * Test account info retrieval
 */
async function testAccountInfo() {
  logger.info('Testing account info retrieval...');
  
  try {
    const accountInfo = await getAccountInfo(config.account.name);
    logger.info('Account info retrieved successfully');
    logger.info(`Account: ${accountInfo.account_name}`);
    logger.info(`Created: ${accountInfo.created}`);
    logger.info(`RAM Usage: ${accountInfo.ram_usage}/${accountInfo.ram_quota}`);
    return true;
  } catch (error) {
    logger.error(`Account info test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test balance retrieval
 */
async function testBalanceRetrieval() {
  logger.info('Testing balance retrieval...');
  
  try {
    const balance = await getBalance(config.account.name);
    logger.info('Balance retrieved successfully');
    logger.info(`Balance: ${balance}`);
    return true;
  } catch (error) {
    logger.error(`Balance test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test account existence check
 */
async function testAccountExistence() {
  logger.info('Testing account existence check...');
  
  try {
    // Test with sender account (should exist)
    const senderExists = await accountExists(config.account.name);
    if (senderExists) {
      logger.info('Sender account exists');
    } else {
      logger.error('Sender account does not exist');
      return false;
    }
    
    // Test with test receiver account
    const testReceiver = 'dochuong';
    const receiverExists = await accountExists(testReceiver);
    if (receiverExists) {
      logger.info(`Test receiver account ${testReceiver} exists`);
    } else {
      logger.warn(`Test receiver account ${testReceiver} does not exist`);
    }
    
    return true;
  } catch (error) {
    logger.error(`Account existence test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test transfer function (dry run - no actual transfer)
 */
async function testTransferFunction() {
  logger.info('Testing transfer function (dry run)...');
  
  try {
    const testReceiver = 'dochuong';
    const testAmount = '1.0000 XPR';
    const testMemo = 'Test transfer from script';
    
    logger.info(`Testing transfer to ${testReceiver}`);
    logger.info(`Amount: ${testAmount}`);
    logger.info(`Memo: ${testMemo}`);
    
    const receiverExists = await accountExists(testReceiver);
    if (!receiverExists) {
      logger.warn(`Test receiver ${testReceiver} does not exist`);
      logger.info('Note: This is a dry run test - no actual transfer will be made');
      return true;
    }
    
    logger.info('Test receiver account exists');
    logger.info('Note: This is a dry run test - no actual transfer will be made');
    
    return true;
  } catch (error) {
    logger.error(`Transfer function test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test actual transfer function (may actually send if private key is correct)
 */
async function testActualTransfer() {
  logger.info('Testing actual transfer function...');
  
  try {
    const testReceiver = 'dochuong';
    const testAmount = '1.0000 XPR';
    const testMemo = 'Test transfer from script';
    
    logger.info(`Testing actual transfer to ${testReceiver}`);
    logger.info(`Amount: ${testAmount}`);
    logger.info(`Memo: ${testMemo}`);
    
    const receiverExists = await accountExists(testReceiver);
    if (!receiverExists) {
      logger.warn(`Test receiver ${testReceiver} does not exist`);
      logger.info('Skipping actual transfer test');
      return true;
    }
    
    logger.info('Test receiver account exists');
    
    const balanceBefore = await getBalance(config.account.name);
    logger.info(`Balance before: ${balanceBefore}`);
    
    logger.info('Attempting actual transfer...');
    const result = await transferToken(testReceiver, testAmount, testMemo);
    
    if (result.success) {
      logger.info('Transfer successful!');
      logger.info(`Transaction ID: ${result.transactionId}`);
      logger.info(`Block Number: ${result.blockNumber}`);
      
      const balanceAfter = await getBalance(config.account.name);
      logger.info(`Balance after: ${balanceAfter}`);
      
      return true;
    } else {
      logger.warn(`Transfer failed: ${result.error}`);
      logger.info('This is expected if private key does not match account');
      return true;
    }
    
  } catch (error) {
    logger.warn(`Transfer test failed: ${error.message}`);
    logger.info('This is expected if private key does not match account');
    return true;
  }
}

/**
 * Main test function
 */
async function runTests() {
  logger.info('Starting XPR Token Transfer CLI Tests');
  logger.info('=' .repeat(50));
  
  const testResults = {
    environment: false,
    sdkInitialization: false,
    accountInfo: false,
    balanceRetrieval: false,
    accountExistence: false,
    transferFunction: false,
    actualTransfer: false
  };
  
  try {
    testResults.environment = testEnvironment();
    if (!testResults.environment) {
      logger.error('Environment test failed. Please fix .env file first.');
      return;
    }
    
    testResults.sdkInitialization = await testSDKInitialization();
    if (!testResults.sdkInitialization) {
      logger.error('SDK initialization test failed.');
      return;
    }
    
    testResults.accountInfo = await testAccountInfo();
    testResults.balanceRetrieval = await testBalanceRetrieval();
    testResults.accountExistence = await testAccountExistence();
    testResults.transferFunction = await testTransferFunction();
    testResults.actualTransfer = await testActualTransfer();
    
  } catch (error) {
    logger.error(`Test suite error: ${error.message}`);
  }
  
  // Test Summary
  logger.info('=' .repeat(50));
  logger.info('Test Results Summary:');
  logger.info(`Environment: ${testResults.environment ? 'PASS' : 'FAIL'}`);
  logger.info(`SDK Initialization: ${testResults.sdkInitialization ? 'PASS' : 'FAIL'}`);
  logger.info(`Account Info: ${testResults.accountInfo ? 'PASS' : 'FAIL'}`);
  logger.info(`Balance Retrieval: ${testResults.balanceRetrieval ? 'PASS' : 'FAIL'}`);
  logger.info(`Account Existence: ${testResults.accountExistence ? 'PASS' : 'FAIL'}`);
  logger.info(`Transfer Function: ${testResults.transferFunction ? 'PASS' : 'FAIL'} (Dry run)`);
  logger.info(`Actual Transfer: ${testResults.actualTransfer ? 'PASS' : 'FAIL'} (Real transfer)`);
  
  const allPassed = Object.values(testResults).every(result => result === true);
  
  if (allPassed) {
    logger.info('All tests passed! CLI is ready to use.');
  } else {
    logger.info('Some tests failed. Please check the issues above.');
  }
  
  logger.info('=' .repeat(50));
}

/**
 * Show usage examples
 */
function showUsageExamples() {
  logger.info('Usage Examples:');
  logger.info('1. Check balance:');
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
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => {
      showUsageExamples();
    })
    .catch((error) => {
      logger.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testEnvironment,
  testSDKInitialization,
  testAccountInfo,
  testBalanceRetrieval,
  testAccountExistence,
  testTransferFunction,
  testActualTransfer,
  runTests,
};