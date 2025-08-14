# Walrus API

A Node.js API that scrapes and serves real-time Walrus blockchain data including storage prices, write prices, storage capacity, and epoch information.

## 🚀 Features

- **Real-time Data Scraping**: Automatically scrapes Walrus blockchain data from multiple sources
- **Smart Caching**: 24-hour cache with daily updates at 00:00 UTC
- **Rate Limiting**: Built-in protection against abuse (10 requests per 15 minutes)
- **Security**: Helmet security headers, CORS protection, input validation
- **Health Monitoring**: Health check endpoint for deployment monitoring
- **Fallback System**: Multiple data sources with automatic failover

## 📊 API Endpoints

### Get Walrus Data
```
GET /api/walrus-data
```
Returns current Walrus blockchain metrics including:
- Storage price (FROST/MiB/EPOCH)
- Write price (FROST/MiB)
- Storage capacity and usage
- Current epoch information

### Health Check
```
GET /health
```
Returns server health status and uptime information.

### Last Update
```
GET /api/last-update
```
Returns information about when data was last updated and cache status.

## 🛠️ Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run the server:**
```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL_DEV` | Development frontend URL | `http://localhost:5173` |
| `FRONTEND_URL_PROD` | Production frontend URL | - |
| `SCRAPE_TIMEOUT` | Scraping timeout (ms) | `30000` |
| `CACHE_TTL` | Cache time-to-live (seconds) | `86400` |
| `LOG_LEVEL` | Logging level | `info` |

## 🧪 Testing

```bash
# Run all tests
npm test

# Quick test
npm run test:quick

# Test scraper only
npm run test:scraper
```

## 📈 Data Sources

The API scrapes data from:
- [Walruscan](https://walruscan.com/mainnet/home)
- [Walrus Staking](https://stake-wal.wal.app/)

## 🔒 Security Features

- **Rate Limiting**: 10 requests per 15 minutes per IP
- **CORS Protection**: Configurable allowed origins
- **Security Headers**: Helmet.js security middleware
- **Input Validation**: All scraped data is validated and sanitized
- **Error Handling**: Comprehensive error handling with minimal information disclosure

## 🚀 Deployment

### Render.com (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy with automatic builds

### Environment Setup for Production
```bash
NODE_ENV=production
PORT=10000
FRONTEND_URL_PROD=https://your-frontend-domain.com
```

## 📝 API Response Format

```json
{
  "success": true,
  "data": {
    "storagePrice": {
      "value": 11000,
      "unit": "FROST/MiB/EPOCH",
      "display": "11,000"
    },
    "writePrice": {
      "value": 20000,
      "unit": "FROST/MiB",
      "display": "20,000"
    },
    "storageCapacity": {
      "used": 644,
      "total": 4167,
      "percentage": 15.46,
      "display": "644 / 4,167 TB"
    },
    "epoch": {
      "number": 123,
      "display": "Epoch 123"
    },
    "dataSource": "realtime",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "source": "cache",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "responseTime": "15ms"
}
```

## 🔄 Data Update Schedule

- **Automatic Updates**: Daily at 00:00 UTC
- **Cache Duration**: 24 hours
- **Fallback**: Multiple data sources with automatic failover
- **Manual Refresh**: Cache refreshes on server restart

## 🐛 Troubleshooting

### Common Issues

1. **Scraping Fails**: Check if target websites are accessible
2. **High Memory Usage**: Adjust `MAX_MEMORY_USAGE` in environment
3. **Rate Limiting**: Increase limits or implement API keys
4. **CORS Errors**: Update `FRONTEND_URL_*` variables

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and debug information.

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions, please open a GitHub issue.