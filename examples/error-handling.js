#!/usr/bin/env node

/**
 * Error Handling Example
 * 
 * This example demonstrates proper error handling techniques for blockchain applications.
 * It shows common error scenarios and how to handle them gracefully.
 * 
 * Key concepts:
 * - Defensive programming
 * - Graceful error handling
 * - User-friendly error messages
 * - Retry logic
 * - Validation
 * 
 * Usage: node examples/error-handling.js
 */

const { initializeProtonSDK, getBalance, transferToken, getAccountInfo, accountExists } = require('../chain/token-transfer');
const { logger, validateAccountName, parseAmount } = require('../utils');
const { config } = require('../config');

async function errorHandlingExample() {
  try {
    logger.info('=== Error Handling Example ===');
    
    // Initialize SDK
    await initializeProtonSDK();
    
    // Example 1: Input Validation
    logger.info('Example 1: Input Validation');
    
    // Test invalid account names
    const invalidAccounts = [
      'invalid-account-name!',  // Contains invalid characters
      'TOOLONGACCOUNTNAME',     // Too long
      '',                       // Empty
      '1234567890123',          // Too long
      'UPPERCASE',              // Uppercase not allowed
      'account with spaces'     // Spaces not allowed
    ];
    
    for (const account of invalidAccounts) {
      try {
        validateAccountName(account);
        logger.info(`Account '${account}' is valid`);
      } catch (error) {
        logger.info(`Account '${account}' is invalid: ${error.message}`);
      }
    }
    
    // Test invalid amounts
    const invalidAmounts = [
      'invalid-amount',
      '1.0000',
      '1.0000 USD',
      '-1.0000 XPR',
      '0 XPR',
      '1.12345 XPR'  // Too many decimal places
    ];
    
    for (const amount of invalidAmounts) {
      try {
        parseAmount(amount);
        logger.info(`Amount '${amount}' is valid`);
      } catch (error) {
        logger.info(`Amount '${amount}' is invalid: ${error.message}`);
      }
    }
    
    // Example 2: Network Errors
    logger.info('Example 2: Network Errors');
    
    // Test non-existent account
    try {
      await getBalance('nonexistent123');
    } catch (error) {
      logger.info(`Expected error for non-existent account: ${error.message}`);
    }
    
    // Test account info for non-existent account
    try {
      await getAccountInfo('nonexistent123');
    } catch (error) {
      logger.info(`Expected error for non-existent account info: ${error.message}`);
    }
    
    // Example 3: Transfer Errors
    logger.info('Example 3: Transfer Errors');
    
    // Test transfer to non-existent account
    try {
      const result = await transferToken('nonexistent123', '1.0000 XPR', 'Test');
      if (!result.success) {
        logger.info(`Expected transfer error: ${result.error}`);
      }
    } catch (error) {
      logger.info(`Expected transfer error: ${error.message}`);
    }
    
    // Test transfer with invalid amount
    try {
      const result = await transferToken('dochuong', 'invalid-amount', 'Test');
      if (!result.success) {
        logger.info(`Expected amount error: ${result.error}`);
      }
    } catch (error) {
      logger.info(`Expected amount error: ${error.message}`);
    }
    
    // Test transfer with insufficient funds (large amount)
    try {
      const result = await transferToken('dochuong', '999999999.0000 XPR', 'Test large amount');
      if (!result.success) {
        logger.info(`Expected insufficient funds error: ${result.error}`);
      }
    } catch (error) {
      logger.info(`Expected insufficient funds error: ${error.message}`);
    }
    
    // Example 4: Defensive Programming
    logger.info('Example 4: Defensive Programming');
    
    // Safe balance check with error handling
    async function safeGetBalance(accountName) {
      try {
        // Validate input first
        validateAccountName(accountName);
        
        // Check if account exists
        const exists = await accountExists(accountName);
        if (!exists) {
          return { success: false, error: 'Account does not exist' };
        }
        
        // Get balance
        const balance = await getBalance(accountName);
        return { success: true, balance: balance };
        
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    
    // Test safe balance check
    const balanceResult = await safeGetBalance('dochuong');
    if (balanceResult.success) {
      logger.info(`Safe balance check successful: ${balanceResult.balance}`);
    } else {
      logger.info(`Safe balance check failed: ${balanceResult.error}`);
    }
    
    // Example 5: Retry Logic
    logger.info('Example 5: Retry Logic');
    
    // Custom retry function for demonstration
    async function retryOperation(operation, maxRetries = 3) {
      let lastError;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          logger.info(`Attempt ${i + 1} failed: ${error.message}`);
          
          if (i < maxRetries - 1) {
            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, i) * 1000;
            logger.info(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      throw lastError;
    }
    
    // Test retry logic with a failing operation
    try {
      await retryOperation(async () => {
        // This will fail, but retry logic will handle it
        throw new Error('Simulated network error');
      });
    } catch (error) {
      logger.info(`Retry logic completed: ${error.message}`);
    }
    
    // Example 6: Error Recovery
    logger.info('Example 6: Error Recovery');
    
    // Function that handles errors gracefully
    async function robustTransfer(toAccount, amount, memo = '') {
      try {
        // Step 1: Validate inputs
        validateAccountName(toAccount);
        parseAmount(amount);
        
        // Step 2: Check if recipient exists
        const exists = await accountExists(toAccount);
        if (!exists) {
          return {
            success: false,
            error: 'Recipient account does not exist',
            code: 'ACCOUNT_NOT_FOUND'
          };
        }
        
        // Step 3: Check sender balance
        const balance = await getBalance(config.account.name);
        const balanceAmount = parseFloat(balance[0]?.split(' ')[0] || '0');
        const transferAmount = parseFloat(amount.split(' ')[0]);
        
        if (balanceAmount < transferAmount) {
          return {
            success: false,
            error: 'Insufficient funds',
            code: 'INSUFFICIENT_FUNDS',
            currentBalance: balance[0],
            requiredAmount: amount
          };
        }
        
        // Step 4: Perform transfer
        const result = await transferToken(toAccount, amount, memo);
        return result;
        
      } catch (error) {
        return {
          success: false,
          error: error.message,
          code: 'UNKNOWN_ERROR'
        };
      }
    }
    
    // Test robust transfer
    const robustResult = await robustTransfer('dochuong', '0.1000 XPR', 'Robust transfer test');
    if (robustResult.success) {
      logger.info('Robust transfer successful!');
    } else {
      logger.info(`Robust transfer failed: ${robustResult.error} (Code: ${robustResult.code})`);
    }
    
    logger.info('=== Error Handling Example Complete ===');
    
  } catch (error) {
    logger.error('Error handling example failed:', error.message);
  }
}

// Run the example
if (require.main === module) {
  errorHandlingExample();
}

module.exports = { errorHandlingExample };
