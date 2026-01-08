# Rate Limiting Configuration

All rate limiters in NutriVault are now fully configurable via environment variables.

## Environment Variables

Add these to your `backend/.env` file:

```bash
# ============================================
# RATE LIMITING CONFIGURATION
# ============================================
# Set any *_MAX value to 0 for infinite (no rate limiting)
# Time windows are in milliseconds

# API Rate Limiter (General endpoints)
API_RATE_LIMIT_MAX=100                    # Max requests per window (0 = infinite)
API_RATE_LIMIT_WINDOW_MS=900000           # 15 minutes in milliseconds

# Authentication Rate Limiter (Login/Register)
AUTH_RATE_LIMIT_MAX=50                    # Max requests per window (0 = infinite)
AUTH_RATE_LIMIT_WINDOW_MS=900000          # 15 minutes in milliseconds

# Report Rate Limiter
REPORT_RATE_LIMIT_MAX=50                  # Max requests per window (0 = infinite)
REPORT_RATE_LIMIT_WINDOW_MS=900000        # 15 minutes in milliseconds

# Password Reset Rate Limiter
PASSWORD_RESET_RATE_LIMIT_MAX=3           # Max requests per window (0 = infinite)
PASSWORD_RESET_RATE_LIMIT_WINDOW_MS=3600000  # 1 hour in milliseconds

# Export Rate Limiter
EXPORT_RATE_LIMIT_MAX=10                  # Max requests per window (0 = infinite)
EXPORT_RATE_LIMIT_WINDOW_MS=3600000       # 1 hour in milliseconds

# Global Rate Limiter (Fallback protection)
GLOBAL_RATE_LIMIT_MAX=500                 # Max requests per window (0 = infinite)
GLOBAL_RATE_LIMIT_WINDOW_MS=900000        # 15 minutes in milliseconds
```

## Quick Reference

### Common Time Windows (in milliseconds)
- 1 minute = 60000
- 5 minutes = 300000
- 15 minutes = 900000
- 30 minutes = 1800000
- 1 hour = 3600000
- 1 day = 86400000

### Disabling Rate Limits

To disable rate limiting for specific endpoints:

```bash
# Disable API rate limiting (infinite requests allowed)
API_RATE_LIMIT_MAX=0

# Disable all rate limiting
API_RATE_LIMIT_MAX=0
AUTH_RATE_LIMIT_MAX=0
REPORT_RATE_LIMIT_MAX=0
PASSWORD_RESET_RATE_LIMIT_MAX=0
EXPORT_RATE_LIMIT_MAX=0
GLOBAL_RATE_LIMIT_MAX=0
```

### Recommended Settings

#### Development
```bash
API_RATE_LIMIT_MAX=0                      # No limits
AUTH_RATE_LIMIT_MAX=0                     # No limits
REPORT_RATE_LIMIT_MAX=0                   # No limits
PASSWORD_RESET_RATE_LIMIT_MAX=0           # No limits
EXPORT_RATE_LIMIT_MAX=0                   # No limits
GLOBAL_RATE_LIMIT_MAX=0                   # No limits
```

#### Production (Moderate)
```bash
API_RATE_LIMIT_MAX=500                    # 500 requests per 15 minutes
AUTH_RATE_LIMIT_MAX=10                    # 10 login attempts per 15 minutes
REPORT_RATE_LIMIT_MAX=100                 # 100 reports per 15 minutes
PASSWORD_RESET_RATE_LIMIT_MAX=5           # 5 reset attempts per hour
EXPORT_RATE_LIMIT_MAX=20                  # 20 exports per hour
GLOBAL_RATE_LIMIT_MAX=1000                # 1000 total requests per 15 minutes
```

#### Production (Strict)
```bash
API_RATE_LIMIT_MAX=100                    # 100 requests per 15 minutes
AUTH_RATE_LIMIT_MAX=5                     # 5 login attempts per 15 minutes
REPORT_RATE_LIMIT_MAX=50                  # 50 reports per 15 minutes
PASSWORD_RESET_RATE_LIMIT_MAX=3           # 3 reset attempts per hour
EXPORT_RATE_LIMIT_MAX=10                  # 10 exports per hour
GLOBAL_RATE_LIMIT_MAX=500                 # 500 total requests per 15 minutes
```

## Implementation Details

- Rate limiting is **always disabled** when `NODE_ENV=test` to allow test suites to run
- Setting any `*_MAX` variable to `0` disables that specific rate limiter
- If environment variables are not set, sensible defaults are used
- Rate limit headers are returned: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

## Testing Your Configuration

After updating your `.env` file, restart your backend server:

```bash
cd backend
npm start
```

Check the rate limiting is working by making requests and observing the response headers:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Time when the limit resets (Unix timestamp)

When the limit is exceeded, you'll receive a `429 Too Many Requests` response.
