# XPR Token Transfer CLI

> CLI tool for sending XPR tokens on Proton blockchain with enhanced security, performance, and monitoring.

## Overview

This project demonstrates how to:
- Connect to Proton blockchain
- Send XPR tokens securely
- Check balance and account information
- Handle batch transfers
- Error handling and retry logic
- Security enhancements (encryption, validation)
- Performance optimization (caching, connection pooling)
- Monitoring and health checks

## Project Structure

```
├── chain/token-transfer.js    # Core blockchain functions
├── config/index.js           # Configuration
├── utils/                    # Utilities
│   ├── index.js             # Logger & helpers
│   ├── security.js          # Security features
│   ├── performance.js       # Performance optimization
│   └── monitoring.js        # Health checks & metrics
├── examples/                 # Usage examples
├── docs/                     # Documentation
├── index.js                  # CLI interface
├── test.js                   # Test suite
└── demo.js                   # Demo script
```

## Installation

```bash
# Clone and install
git clone <repository-url>
cd Token_Transfer_Script
npm install

# Configuration
cp env.example .env
# Edit .env with your private key and account
```

Configure `.env`:
```env
BLOCKCHAIN_ENDPOINT=https://testnet.protonchain.com
CHAIN_ID=71ee83bcf52142d61019d95f9cc5427ba54a02d8
PRIVATE_KEY=your_private_key_here
FROM_ACCOUNT=your_account_name
LOG_LEVEL=info
```

## Usage

### Check connection
```bash
npm test                    # Test all functions
node index.js --network     # Network information
```

### Check balance
```bash
node index.js --balance                           # Your balance
node index.js --check-balance receiver_account    # Other account balance
```

### Send tokens
```bash
# Simple send
node index.js --to receiver --amount "1.0000 XPR"

# Send with memo
node index.js --to receiver --amount "1.0000 XPR" --memo "Payment"
```

### Batch transfer
Create `transfers.json` file:
```json
[
  {"to": "receiver1", "amount": "1.0000 XPR", "memo": "Payment 1"},
  {"to": "receiver2", "amount": "2.0000 XPR", "memo": "Payment 2"}
]
```

```bash
node index.js --batch transfers.json
```

## API Reference

### Core Functions

```javascript
const { initializeProtonSDK, getBalance, transferToken, batchTransfer } = require('./chain/token-transfer');

// Initialize SDK
await initializeProtonSDK();

// Get balance
const balance = await getBalance('account_name', 'XPR');

// Send tokens
const result = await transferToken('receiver', '1.0000 XPR', 'Payment');

// Batch transfer
const transfers = [
  { to: 'receiver1', amount: '1.0000 XPR', memo: 'Payment 1' },
  { to: 'receiver2', amount: '2.0000 XPR', memo: 'Payment 2' }
];
const result = await batchTransfer(transfers);
```

## Learning Path

1. **Basic**: Read `config/index.js`, `utils/index.js`, run `npm test`
2. **Core**: Read `chain/token-transfer.js` - understand blockchain interactions
3. **Advanced**: Batch transfers, error handling, retry logic
4. **CLI**: Read `index.js` - understand commands, try different options

## Troubleshooting

### Common Issues
- **"Account does not exist"**: `node index.js --exists account_name`
- **"Insufficient funds"**: `node index.js --balance`
- **"Invalid private key"**: Check `.env` file
- **"Network connection failed"**: Check `BLOCKCHAIN_ENDPOINT`

### Debug Mode
```env
LOG_LEVEL=debug
```
```bash
tail -f transfer.log
```

## Best Practices

### Security
- Never commit private keys
- Use environment variables
- Private key encryption with password
- Input validation and sanitization
- Rate limiting for API calls
- Test on testnet first

### Error Handling
- Always check `result.success`
- Implement retry logic with exponential backoff
- Comprehensive error categorization
- Defensive programming patterns
- Log errors with detailed context

### Performance
- Use batch transfers when possible
- Connection pooling for RPC calls
- Intelligent caching with TTL
- Request batching and optimization
- Performance monitoring and metrics
- Monitor gas fees

### Monitoring
- Health checks for system components
- Real-time metrics collection
- Alert system with notifications
- Performance tracking and reporting

## Testing

```bash
# Test suite
npm test

# Test individual functions
node -e "require('./test.js').testEnvironment()"
node -e "require('./test.js').testSDKInitialization()"

# Test new features
npm run security-test
npm run performance-test

# Run examples
node examples/basic-usage.js
node examples/batch-payments.js
node examples/error-handling.js
```

## References

- [Proton Documentation](https://docs.protonchain.com/)
- [@proton/js SDK](https://github.com/ProtonProtocol/proton-js)
- [XPR Network](https://xprnetwork.org/)

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License

## Support

- Create issue on GitHub
- Join XPR Network Discord
- Read documentation

---

**Note**: This is an example project for educational purposes. Always test on testnet before using on mainnet.
