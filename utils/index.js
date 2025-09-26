/**
 * Utility functions for XPR Token Transfer CLI
 * Following XPR Network developer examples standards
 */

const { logger } = require('./logger');
const { hashForLogging } = require('./security');

/**
 * Format amount for token transfer
 * @param {number|string} amount - Token amount
 * @param {string} symbol - Token symbol (default: XPR)
 * @param {number} precision - Token precision (default: 4)
 */
function formatAmount(amount, symbol = 'XPR', precision = 4) {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount < 0) {
    throw new Error('Invalid amount');
  }
  
  return `${numAmount.toFixed(precision)} ${symbol}`;
}

/**
 * Parse amount from string format
 * @param {string} amountString - String amount (e.g., "1.0000 XPR")
 */
function parseAmount(amountString) {
  const parts = amountString.trim().split(' ');
  if (parts.length !== 2) {
    throw new Error('Invalid amount format. Expected: "1.0000 XPR"');
  }
  
  const amount = parseFloat(parts[0]);
  const symbol = parts[1];
  
  if (isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount value');
  }
  
  return { amount, symbol };
}

/**
 * Validate account name
 * @param {string} accountName - Account name
 */
function validateAccountName(accountName) {
  if (!accountName || typeof accountName !== 'string') {
    throw new Error('Account name is required');
  }
  
  // Proton account name rules
  if (accountName.length < 1 || accountName.length > 12) {
    throw new Error('Account name must be 1-12 characters');
  }
  
  if (!/^[a-z1-5]+$/.test(accountName)) {
    throw new Error('Account name can only contain lowercase letters and numbers 1-5');
  }
  
  return true;
}

/**
 * Format transaction result
 * @param {Object} result - Transaction result
 */
function formatTransactionResult(result) {
  return {
    success: true,
    transactionId: result.transaction_id,
    blockId: result.processed.block_id,
    blockNumber: result.processed.block_num,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format error message
 * @param {Error} error - Error object
 */
function formatError(error) {
  const commonErrors = {
    'insufficient funds': 'Insufficient XPR in account',
    'account does not exist': 'Account does not exist',
    'invalid private key': 'Invalid private key',
    'insufficient ram': 'Insufficient RAM to execute transaction',
    'transaction expired': 'Transaction has expired',
    'invalid signature': 'Invalid signature',
    'missing required authority': 'Missing required authority',
  };
  
  const errorMessage = error.message.toLowerCase();
  const translatedMessage = commonErrors[errorMessage] || error.message;
  
  return {
    success: false,
    error: translatedMessage,
    originalError: error.message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sleep function
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 */
async function retry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      logger.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

module.exports = {
  logger,
  formatAmount,
  parseAmount,
  validateAccountName,
  formatTransactionResult,
  formatError,
  sleep,
  retry,
  hashForLogging,
};
