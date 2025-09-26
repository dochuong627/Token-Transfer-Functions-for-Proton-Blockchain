/**
 * Token Transfer Functions for Proton Blockchain
 * 
 * This module provides core functionality for interacting with Proton blockchain
 * using the official @proton/js SDK. It demonstrates best practices for:
 * 
 * - SDK initialization and configuration
 * - Token transfers (single and batch)
 * - Account information retrieval
 * - Balance checking
 * - Error handling and retry logic
 * 
 * Key Concepts:
 * - Proton uses EOSIO-based architecture
 * - Transactions require proper authorization
 * - All amounts must include precision (e.g., "1.0000 XPR")
 * - Account names follow specific rules (1-12 chars, lowercase + numbers 1-5)
 * 
 * @author XPR Network Developer Examples
 * @version 1.0.0
 */

const { Api, JsonRpc, JsSignatureProvider } = require('@proton/js');
const { TextEncoder, TextDecoder } = require('util');
const { config, validateConfig } = require('../config');
const { logger, formatAmount, parseAmount, validateAccountName, formatTransactionResult, formatError, retry, hashForLogging } = require('../utils');
const { validateAccountNameSecure, validateAmountSecure, sanitizeInput } = require('../utils/security');
const { withPerformanceMonitoring } = require('../utils/performance');

let api = null;

/**
 * Initialize Proton SDK
 * 
 * This function sets up the connection to Proton blockchain by:
 * 1. Validating configuration (private key, endpoint, etc.)
 * 2. Creating a signature provider for transaction signing
 * 3. Setting up RPC client for blockchain communication
 * 4. Initializing the main API client
 * 
 * The API client is the main interface for all blockchain operations.
 * It handles transaction signing, serialization, and network communication.
 * 
 * @returns {Api} Initialized Proton API client
 * @throws {Error} If configuration is invalid or connection fails
 * 
 * @example
 * ```javascript
 * const api = await initializeProtonSDK();
 * // Now you can use api for blockchain operations
 * ```
 */
async function initializeProtonSDK() {
  try {
    // Step 1: Validate configuration
    validateConfig();
    
    // Step 2: Create signature provider
    // This handles transaction signing using your private key
    const signatureProvider = new JsSignatureProvider([config.account.privateKey]);
    
    // Step 3: Create RPC client
    // This handles communication with the blockchain node
    const rpc = new JsonRpc([config.blockchain.endpoint]);
    
    // Step 4: Initialize main API client
    // This combines RPC, signing, and serialization
    api = new Api({
      rpc: rpc,
      signatureProvider: signatureProvider,
      textDecoder: new TextDecoder(), // For string encoding/decoding
      textEncoder: new TextEncoder(), // Required for transaction serialization
    });
    
    logger.info('Proton SDK initialized successfully');
    logger.info(`Network: ${config.blockchain.endpoint}`);
    logger.info(`Chain ID: ${config.blockchain.chainId}`);
    
    return api;
  } catch (error) {
    logger.error('Failed to initialize Proton SDK:', error.message);
    throw error;
  }
}

/**
 * Get Proton SDK instance
 */
function getProtonSDK() {
  if (!api) {
    throw new Error('Proton SDK not initialized. Call initializeProtonSDK() first.');
  }
  return api;
}

/**
 * Get account balance
 * @param {string} accountName - Account name
 * @param {string} symbol - Token symbol (default: XPR)
 */
async function getBalance(accountName, symbol = 'XPR') {
  try {
    // Enhanced validation
    if (!validateAccountNameSecure(accountName)) {
      throw new Error('Invalid account name format');
    }
    
    // Sanitize inputs
    const sanitizedAccountName = sanitizeInput(accountName);
    const sanitizedSymbol = sanitizeInput(symbol);
    
    const api = getProtonSDK();
    const balance = await api.rpc.get_currency_balance('eosio.token', sanitizedAccountName, sanitizedSymbol);
    
    // Log with hashed account name for privacy
    logger.info(`Balance for ${hashForLogging(accountName)}: ${balance}`);
    return balance;
  } catch (error) {
    logger.error(`Failed to get balance for ${hashForLogging(accountName)}:`, error.message);
    throw error;
  }
}

/**
 * Transfer XPR tokens between accounts
 * 
 * This function demonstrates the core token transfer process on Proton blockchain:
 * 1. Validates account names and amount format
 * 2. Creates a transfer action with proper authorization
 * 3. Executes the transaction with retry logic
 * 4. Returns formatted result with transaction details
 * 
 * Key Concepts:
 * - Actions are the basic units of operations on EOSIO-based blockchains
 * - Each action requires proper authorization (actor + permission)
 * - Transactions can contain multiple actions
 * - Amounts must include precision (e.g., "1.0000 XPR")
 * 
 * @param {string} toAccount - Recipient account name (1-12 chars, lowercase + numbers 1-5)
 * @param {string} amount - Amount to transfer with precision (e.g., "1.0000 XPR")
 * @param {string} memo - Optional memo/note for the transfer
 * @returns {Object} Result object with success status and transaction details
 * 
 * @example
 * ```javascript
 * // Simple transfer
 * const result = await transferToken('receiver', '1.0000 XPR');
 * 
 * // Transfer with memo
 * const result = await transferToken('receiver', '1.0000 XPR', 'Payment for services');
 * 
 * if (result.success) {
 *   console.log('Transaction ID:', result.transactionId);
 * } else {
 *   console.error('Transfer failed:', result.error);
 * }
 * ```
 */
async function transferToken(toAccount, amount, memo = '') {
  try {
    // Step 1: Enhanced input validation
    if (!validateAccountNameSecure(toAccount)) {
      throw new Error('Invalid recipient account name format');
    }
    
    if (!validateAccountNameSecure(config.account.name)) {
      throw new Error('Invalid sender account name format');
    }
    
    // Validate amount with enhanced checks
    const amountValidation = validateAmountSecure(amount);
    if (!amountValidation.valid) {
      throw new Error(amountValidation.error);
    }
    
    // Sanitize inputs
    const sanitizedToAccount = sanitizeInput(toAccount);
    const sanitizedMemo = sanitizeInput(memo);
    
    // Parse amount to ensure proper format
    const { amount: amountValue, symbol } = parseAmount(amount);
    
    logger.info(`Transferring ${amount} from ${hashForLogging(config.account.name)} to ${hashForLogging(toAccount)}`);
    
    const api = getProtonSDK();
    
    // Step 2: Create transfer action
    // Actions are the basic units of operations on EOSIO-based blockchains
    const action = {
      account: config.token.contract,    // Contract that handles token transfers
      name: 'transfer',                  // Action name (defined in the contract)
      authorization: [{                  // Required permissions
        actor: config.account.name,      // Account performing the action
        permission: 'active',            // Permission level (usually 'active')
      }],
      data: {                           // Action data
        from: config.account.name,       // Sender account
        to: sanitizedToAccount,          // Recipient account
        quantity: amount,                // Amount with precision
        memo: sanitizedMemo,             // Optional memo
      },
    };
    
    logger.info('Transfer action:', JSON.stringify(action, null, 2));
    
    // Step 3: Execute transaction with retry logic
    // Retry logic helps handle temporary network issues
    const result = await retry(async () => {
      return await api.transact({
        actions: [action]                // Array of actions (can contain multiple)
      }, {
        expireSeconds: config.transaction.expireSeconds,  // Transaction expiration
        blocksBehind: config.transaction.blocksBehind     // Block reference for TAPOS
      });
    });
    
    // Step 4: Format and return result
    const formattedResult = formatTransactionResult(result);
    logger.info('Transfer successful!');
    logger.info(`Transaction ID: ${formattedResult.transactionId}`);
    logger.info(`Block Number: ${formattedResult.blockNumber}`);
    
    return formattedResult;
    
  } catch (error) {
    logger.error('Transfer failed:', error.message);
    return formatError(error);
  }
}

/**
 * Get account info
 * @param {string} accountName - Account name
 */
async function getAccountInfo(accountName) {
  try {
    // Enhanced validation
    if (!validateAccountNameSecure(accountName)) {
      throw new Error('Invalid account name format');
    }
    
    // Sanitize input
    const sanitizedAccountName = sanitizeInput(accountName);
    
    const api = getProtonSDK();
    const accountInfo = await api.rpc.get_account(sanitizedAccountName);
    
    logger.info(`Account info for ${hashForLogging(accountName)}:`);
    logger.info(`  Created: ${accountInfo.created}`);
    logger.info(`  RAM Usage: ${accountInfo.ram_usage}/${accountInfo.ram_quota}`);
    logger.info(`  CPU Limit: ${accountInfo.cpu_limit.used}/${accountInfo.cpu_limit.max}`);
    logger.info(`  Net Limit: ${accountInfo.net_limit.used}/${accountInfo.net_limit.max}`);
    
    return accountInfo;
  } catch (error) {
    logger.error(`Failed to get account info for ${hashForLogging(accountName)}:`, error.message);
    throw error;
  }
}

/**
 * Check if account exists
 * @param {string} accountName - Account name
 */
async function accountExists(accountName) {
  try {
    await getAccountInfo(accountName);
    return true;
  } catch (error) {
    if (error.message.includes('does not exist')) {
      return false;
    }
    throw error;
  }
}

/**
 * Get transaction info
 * @param {string} transactionId - Transaction ID
 */
async function getTransactionInfo(transactionId) {
  try {
    const api = getProtonSDK();
    const transaction = await api.rpc.get_transaction(transactionId);
    
    logger.info(`Transaction info for ${transactionId}:`);
    logger.info(`  Block Number: ${transaction.block_num}`);
    logger.info(`  Block Time: ${transaction.block_time}`);
    logger.info(`  Status: ${transaction.status}`);
    
    return transaction;
  } catch (error) {
    logger.error(`Failed to get transaction info for ${transactionId}:`, error.message);
    throw error;
  }
}

/**
 * Batch transfer multiple accounts
 * @param {Array} transfers - Array of transfer objects
 * @param {string} transfers[].to - Recipient account
 * @param {string} transfers[].amount - Token amount
 * @param {string} transfers[].memo - Memo (optional)
 */
async function batchTransfer(transfers) {
  try {
    if (!Array.isArray(transfers) || transfers.length === 0) {
      throw new Error('Transfers array is required');
    }
    
    logger.info(`Starting batch transfer of ${transfers.length} transactions`);
    
    const api = getProtonSDK();
    const actions = [];
    
    // Create actions for each transfer
    for (const transfer of transfers) {
      validateAccountName(transfer.to);
      parseAmount(transfer.amount);
      
      const action = {
        account: config.token.contract,
        name: 'transfer',
        authorization: [{
          actor: config.account.name,
          permission: 'active',
        }],
        data: {
          from: config.account.name,
          to: transfer.to,
          quantity: transfer.amount,
          memo: transfer.memo || '',
        },
      };
      
      actions.push(action);
    }
    
    logger.info(`Created ${actions.length} transfer actions`);
    
    // Execute batch transaction - following official examples
    const result = await retry(async () => {
      return await api.transact({
        actions: actions
      }, {
        expireSeconds: config.transaction.expireSeconds,
        blocksBehind: config.transaction.blocksBehind
      });
    });
    
    const formattedResult = formatTransactionResult(result);
    logger.info('Batch transfer successful!');
    logger.info(`Transaction ID: ${formattedResult.transactionId}`);
    logger.info(`Block Number: ${formattedResult.blockNumber}`);
    
    return formattedResult;
    
  } catch (error) {
    logger.error('Batch transfer failed:', error.message);
    return formatError(error);
  }
}

module.exports = {
  initializeProtonSDK,
  getProtonSDK,
  getBalance,
  transferToken,
  getAccountInfo,
  accountExists,
  getTransactionInfo,
  batchTransfer,
};
