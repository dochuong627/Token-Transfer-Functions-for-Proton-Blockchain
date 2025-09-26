/**
 * Configuration module for Proton blockchain
 * Following XPR Network developer examples standards
 */

require('dotenv').config();

const config = {
  // Blockchain configuration
  blockchain: {
    endpoint: process.env.BLOCKCHAIN_ENDPOINT || 'https://proton-public-testnet.neftyblocks.com',
    chainId: process.env.CHAIN_ID || '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd',
  },

  // Account configuration
  account: {
    privateKey: process.env.PRIVATE_KEY,
    name: process.env.FROM_ACCOUNT,
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Token configuration
  token: {
    contract: 'eosio.token',
    symbol: 'XPR',
    precision: 4,
  },

  // Transaction configuration
  transaction: {
    blocksBehind: 3,
    expireSeconds: 30,
  },
};

/**
 * Validate configuration
 */
function validateConfig() {
  const errors = [];

  if (!config.account.privateKey) {
    errors.push('PRIVATE_KEY is required');
  }

  if (!config.account.name) {
    errors.push('FROM_ACCOUNT is required');
  }

  if (!config.blockchain.endpoint) {
    errors.push('BLOCKCHAIN_ENDPOINT is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Get network type (mainnet/testnet)
 */
function getNetworkType() {
  if (config.blockchain.endpoint.includes('testnet')) {
    return 'testnet';
  }
  return 'mainnet';
}

/**
 * Get Proton API configuration
 */
function getProtonConfig() {
  return {
    endpoints: [config.blockchain.endpoint],
    chainId: config.blockchain.chainId,
    appName: 'XPR Token Transfer CLI',
    appVersion: '1.0.0',
  };
}

module.exports = {
  config,
  validateConfig,
  getNetworkType,
  getProtonConfig,
};
