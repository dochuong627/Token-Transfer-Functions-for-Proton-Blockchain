/**
 * Security utilities for XPR Token Transfer CLI
 * 
 * This module provides security functions for:
 * - Private key encryption/decryption
 * - Input validation and sanitization
 * - Secure configuration management
 * - Password hashing and verification
 * 
 * @author XPR Network Developer Examples
 * @version 1.0.0
 */

const crypto = require('crypto');
const { logger } = require('./logger');

/**
 * Encryption configuration
 */
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Generate a random encryption key
 * @returns {string} Base64 encoded encryption key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - User password
 * @param {string} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 */
function deriveKeyFromPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt private key
 * @param {string} privateKey - Private key to encrypt
 * @param {string} password - Encryption password
 * @returns {Object} Encrypted data with salt, iv, tag, and encrypted key
 */
function encryptPrivateKey(privateKey, password) {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from password
    const key = deriveKeyFromPassword(password, salt);
    
    // Create cipher
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
    cipher.setAAD(Buffer.from('xpr-transfer-cli', 'utf8'));
    
    // Encrypt private key
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: ENCRYPTION_ALGORITHM
    };
  } catch (error) {
    logger.error('Failed to encrypt private key:', error.message);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt private key
 * @param {Object} encryptedData - Encrypted data object
 * @param {string} password - Decryption password
 * @returns {string} Decrypted private key
 */
function decryptPrivateKey(encryptedData, password) {
  try {
    // Parse encrypted data
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const encrypted = encryptedData.encrypted;
    
    // Derive key from password
    const key = deriveKeyFromPassword(password, salt);
    
    // Create decipher
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
    decipher.setAAD(Buffer.from('xpr-transfer-cli', 'utf8'));
    decipher.setAuthTag(tag);
    
    // Decrypt private key
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Failed to decrypt private key:', error.message);
    throw new Error('Decryption failed - invalid password or corrupted data');
  }
}

/**
 * Validate private key format
 * @param {string} privateKey - Private key to validate
 * @returns {boolean} True if valid
 */
function validatePrivateKeyFormat(privateKey) {
  if (!privateKey || typeof privateKey !== 'string') {
    return false;
  }
  
  // Check for common private key formats
  const patterns = [
    /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/, // WIF format
    /^[0-9a-fA-F]{64}$/, // Hex format
    /^PVT_[A-Za-z0-9_]{50,}$/ // Proton format
  ];
  
  return patterns.some(pattern => pattern.test(privateKey));
}

/**
 * Sanitize input to prevent injection attacks
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>\"'&]/g, '') // Remove HTML/XML characters
    .replace(/[;|&$`]/g, '')  // Remove shell injection characters
    .trim()
    .substring(0, 1000); // Limit length
}

/**
 * Validate account name with enhanced security checks
 * @param {string} accountName - Account name to validate
 * @returns {boolean} True if valid
 */
function validateAccountNameSecure(accountName) {
  if (!accountName || typeof accountName !== 'string') {
    return false;
  }
  
  // Basic length check
  if (accountName.length < 1 || accountName.length > 12) {
    return false;
  }
  
  // Character set validation (Proton account rules)
  if (!/^[a-z1-5]+$/.test(accountName)) {
    return false;
  }
  
  // Check for reserved names
  const reservedNames = [
    'eosio', 'proton', 'system', 'admin', 'root', 'null', 'undefined'
  ];
  
  if (reservedNames.includes(accountName.toLowerCase())) {
    return false;
  }
  
  return true;
}

/**
 * Validate amount format with enhanced checks
 * @param {string} amount - Amount to validate
 * @returns {Object} Validation result
 */
function validateAmountSecure(amount) {
  if (!amount || typeof amount !== 'string') {
    return { valid: false, error: 'Amount is required' };
  }
  
  // Parse amount
  const parts = amount.trim().split(' ');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid amount format. Expected: "1.0000 XPR"' };
  }
  
  const [amountStr, symbol] = parts;
  
  // Validate symbol
  if (symbol !== 'XPR') {
    return { valid: false, error: 'Only XPR tokens are supported' };
  }
  
  // Validate amount value
  const amountValue = parseFloat(amountStr);
  if (isNaN(amountValue) || amountValue < 0) {
    return { valid: false, error: 'Invalid amount value' };
  }
  
  // Check precision
  const decimalParts = amountStr.split('.');
  if (decimalParts.length === 2 && decimalParts[1].length !== 4) {
    return { valid: false, error: 'Amount must have exactly 4 decimal places' };
  }
  
  // Check for reasonable limits
  if (amountValue > 1000000) {
    return { valid: false, error: 'Amount too large (max: 1,000,000 XPR)' };
  }
  
  return { valid: true, amount: amountValue, symbol: symbol };
}

/**
 * Generate secure random string
 * @param {number} length - Length of random string
 * @returns {string} Random string
 */
function generateSecureRandom(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data for logging (one-way)
 * @param {string} data - Data to hash
 * @returns {string} Hashed data
 */
function hashForLogging(data) {
  if (!data) return '***';
  
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex').substring(0, 8) + '***';
}

/**
 * Rate limiting for API calls
 */
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Clean old requests
    if (this.requests.has(identifier)) {
      const userRequests = this.requests.get(identifier);
      const validRequests = userRequests.filter(time => time > windowStart);
      this.requests.set(identifier, validRequests);
      
      if (validRequests.length >= this.maxRequests) {
        return false;
      }
    }
    
    // Add current request
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    this.requests.get(identifier).push(now);
    
    return true;
  }
}

/**
 * Security configuration validator
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateSecurityConfig(config) {
  const errors = [];
  const warnings = [];
  
  // Check private key
  if (!config.account?.privateKey) {
    errors.push('Private key is required');
  } else if (!validatePrivateKeyFormat(config.account.privateKey)) {
    errors.push('Invalid private key format');
  }
  
  // Check account name
  if (!config.account?.name) {
    errors.push('Account name is required');
  } else if (!validateAccountNameSecure(config.account.name)) {
    errors.push('Invalid account name format');
  }
  
  // Check endpoint
  if (!config.blockchain?.endpoint) {
    errors.push('Blockchain endpoint is required');
  } else if (!config.blockchain.endpoint.startsWith('https://')) {
    warnings.push('Using non-HTTPS endpoint is not recommended');
  }
  
  // Check for testnet usage
  if (config.blockchain?.endpoint?.includes('testnet')) {
    warnings.push('Using testnet - ensure this is intended for production');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

module.exports = {
  generateEncryptionKey,
  deriveKeyFromPassword,
  encryptPrivateKey,
  decryptPrivateKey,
  validatePrivateKeyFormat,
  sanitizeInput,
  validateAccountNameSecure,
  validateAmountSecure,
  generateSecureRandom,
  hashForLogging,
  RateLimiter,
  validateSecurityConfig,
};
