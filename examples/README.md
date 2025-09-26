# Examples Directory

This directory contains practical examples demonstrating various use cases of the XPR Token Transfer CLI.

## Available Examples

### 1. Basic Usage (`basic-usage.js`)
Demonstrates the most common operations:
- SDK initialization
- Balance checking
- Account information retrieval
- Basic token transfer

**Usage:**
```bash
node examples/basic-usage.js
```

### 2. Batch Payments (`batch-payments.js`)
Shows how to send multiple payments in a single transaction:
- Payroll systems
- Airdrops
- Bulk payments
- Reward distributions

**Usage:**
```bash
node examples/batch-payments.js
```

### 3. Error Handling (`error-handling.js`)
Demonstrates proper error handling techniques:
- Input validation
- Network error handling
- Defensive programming
- Retry logic
- Error recovery

**Usage:**
```bash
node examples/error-handling.js
```

## Running Examples

### Prerequisites
1. Configure your `.env` file with valid credentials
2. Ensure you have some XPR tokens for testing
3. Install dependencies: `npm install`

### Running All Examples
```bash
# Run all examples
node examples/basic-usage.js
node examples/batch-payments.js
node examples/error-handling.js
```

### Customizing Examples
You can modify the examples to:
- Change recipient accounts
- Adjust transfer amounts
- Add your own use cases
- Test different scenarios

## Learning Path

1. **Start with Basic Usage** - Understand core concepts
2. **Try Batch Payments** - Learn about efficiency
3. **Study Error Handling** - Master defensive programming
4. **Create Your Own** - Build custom examples

## Notes

- Examples use demo accounts that may not exist
- Some transfers will fail intentionally to demonstrate error handling
- Always test on testnet before using on mainnet
- Modify examples to use real accounts for actual testing

## Contributing

Feel free to add your own examples:
1. Create a new `.js` file in this directory
2. Follow the existing naming convention
3. Include proper documentation
4. Test your example thoroughly
5. Submit a pull request
