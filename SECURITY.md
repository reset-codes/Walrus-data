# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by:

1. **DO NOT** create a public GitHub issue
2. Email the maintainer directly (check package.json for contact info)
3. Include detailed information about the vulnerability
4. Allow reasonable time for the issue to be addressed

## Security Features

This API includes several security measures:

- **Rate Limiting**: 10 requests per 15 minutes per IP
- **CORS Protection**: Configurable allowed origins
- **Security Headers**: Helmet.js middleware
- **Input Validation**: All data is validated and sanitized
- **Error Handling**: Minimal information disclosure
- **No Authentication Required**: Public API with no sensitive data

## Security Considerations

- This API scrapes public blockchain data only
- No user data or sensitive information is stored
- All scraped data is validated before serving
- Rate limiting prevents abuse
- CORS prevents unauthorized cross-origin requests

## Best Practices for Deployment

1. Always use HTTPS in production
2. Set appropriate CORS origins
3. Monitor rate limiting logs
4. Keep dependencies updated
5. Use environment variables for configuration
6. Enable security headers via Helmet.js