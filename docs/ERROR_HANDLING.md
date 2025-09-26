# Error Handling Guide

This guide covers common errors you might encounter when using the XPR Token Transfer CLI and how to handle them properly.

## Table of Contents

1. [Common Error Types](#common-error-types)
2. [Configuration Errors](#configuration-errors)
3. [Network Errors](#network-errors)
4. [Transaction Errors](#transaction-errors)
5. [Account Errors](#account-errors)
6. [Best Practices](#best-practices)
7. [Debugging Tips](#debugging-tips)

## Common Error Types

### 1. Configuration Errors

#### Missing Environment Variables
```
Error: Configuration errors: PRIVATE_KEY is required
```

**Solution:**
- Check your `.env` file
- Ensure all required variables are set
- Copy from `env.example` if needed

#### Invalid Private Key
```
Error: Invalid private key format
```

**Solution:**
- Verify private key format (should start with '5' for WIF format)
- Check for extra spaces or characters
- Ensure private key matches your account

#### Invalid Endpoint
```
Error: Failed to connect to blockchain endpoint
```

**Solution:**
- Check `BLOCKCHAIN_ENDPOINT` in `.env`
- Try alternative endpoints:
  - Testnet: `https://testnet.protonchain.com`
  - Mainnet: `https://proton.greymass.com`

### 2. Network Errors

#### Connection Timeout
```
Error: Request timeout
```

**Solution:**
- Check internet connection
- Try different endpoint
- Increase timeout in configuration

#### Rate Limiting
```
Error: Too many requests
```

**Solution:**
- Implement delays between requests
- Use retry logic with exponential backoff
- Consider using multiple endpoints

### 3. Transaction Errors

#### Insufficient Funds
```
Error: insufficient funds
```

**Solution:**
- Check account balance
- Ensure you have enough XPR for transfer + fees
- Account for RAM, CPU, and NET costs

#### Invalid Amount Format
```
Error: Invalid amount format. Expected: "1.0000 XPR"
```

**Solution:**
- Use proper format: `"amount.0000 XPR"`
- Include 4 decimal places
- Use uppercase XPR symbol

#### Transaction Expired
```
Error: transaction expired
```

**Solution:**
- Increase `expireSeconds` in configuration
- Retry the transaction
- Check network congestion

### 4. Account Errors

#### Account Does Not Exist
```
Error: Account does not exist
```

**Solution:**
- Verify account name spelling
- Check if account is created
- Use `--exists` command to verify

#### Invalid Account Name
```
Error: Account name must be 1-12 characters
```

**Solution:**
- Use 1-12 characters
- Only lowercase letters and numbers 1-5
- No special characters or spaces

#### Permission Denied
```
Error: missing required authority
```

**Solution:**
- Ensure private key matches account
- Check account permissions
- Verify you're using the correct account

## Best Practices

### 1. Defensive Programming

```javascript
// Always validate inputs
function safeTransfer(toAccount, amount, memo = '') {
  try {
    // Validate inputs
    validateAccountName(toAccount);
    parseAmount(amount);
    
    // Check if recipient exists
    const exists = await accountExists(toAccount);
    if (!exists) {
      return { success: false, error: 'Recipient account does not exist' };
    }
    
    // Perform transfer
    return await transferToken(toAccount, amount, memo);
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### 2. Retry Logic

```javascript
async function retryOperation(operation, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        // Exponential backoff
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

### 3. Error Logging

```javascript
// Log errors with context
try {
  const result = await transferToken(toAccount, amount, memo);
  if (!result.success) {
    logger.error('Transfer failed', {
      toAccount,
      amount,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  }
} catch (error) {
  logger.error('Transfer exception', {
    toAccount,
    amount,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
}
```

## Debugging Tips

### 1. Enable Debug Logging

```env
LOG_LEVEL=debug
```

### 2. Check Log Files

```bash
# View recent logs
tail -f transfer.log

# Search for errors
grep -i error transfer.log
```

### 3. Test Network Connection

```bash
# Test basic connectivity
node index.js --network

# Test account access
node index.js --balance
```

### 4. Validate Configuration

```bash
# Run test suite
npm test

# Test specific functions
node -e "require('./test.js').testEnvironment()"
```

## Error Recovery Strategies

### 1. Network Issues
- Implement retry logic
- Use multiple endpoints
- Add circuit breaker pattern

### 2. Transaction Failures
- Check account balance
- Verify recipient account
- Retry with different parameters

### 3. Configuration Problems
- Validate environment variables
- Check file permissions
- Verify network access

## Common Solutions

### Quick Fixes

1. **Restart the application**
2. **Check .env file**
3. **Verify network connection**
4. **Update dependencies**
5. **Clear log files**

### Advanced Troubleshooting

1. **Enable debug mode**
2. **Check blockchain status**
3. **Verify account permissions**
4. **Test with minimal amounts**
5. **Use testnet first**

## Getting Help

If you encounter errors not covered in this guide:

1. Check the [main README](../README.md)
2. Review the [examples](../examples/)
3. Run the test suite: `npm test`
4. Check log files for detailed error information
5. Create an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Log file excerpts

## Prevention

### Before Production

1. **Test thoroughly on testnet**
2. **Implement proper error handling**
3. **Add monitoring and alerting**
4. **Use proper logging**
5. **Have rollback procedures**

### Regular Maintenance

1. **Monitor log files**
2. **Update dependencies**
3. **Check network status**
4. **Verify account health**
5. **Test error scenarios**
