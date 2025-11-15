#!/usr/bin/env node

/**
 * Script to create GitHub issues for code review findings
 * 
 * This script reads CODE_REVIEW_ISSUES.md and creates individual GitHub issues
 * for each problem found during the code review.
 * 
 * Usage:
 *   node create-issues.js
 * 
 * Prerequisites:
 *   - GitHub CLI (gh) must be installed and authenticated
 *   - Must be run from the repository root
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define issues to create based on CODE_REVIEW_ISSUES.md
const issues = [
  {
    title: '🔴 CRITICAL: JWT secret uses fallback \'dev-secret\' in production',
    body: `## Problem
The JWT authentication middleware in \`server/src/middlewares/auth.js:14\` uses a hardcoded fallback secret \`'dev-secret'\` when the \`JWT_SECRET\` environment variable is not set.

\`\`\`javascript
const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
\`\`\`

## Impact
- **Critical Security Risk**: In production, if \`JWT_SECRET\` is not configured, anyone can forge valid JWT tokens using the known 'dev-secret'
- Complete authentication bypass
- Unauthorized access to all protected endpoints

## Solution
1. Remove the fallback value
2. Add startup validation to ensure \`JWT_SECRET\` is configured
3. Ensure the secret is at least 32 characters long
4. Fail fast on startup if not properly configured

## Related Files
- \`server/src/middlewares/auth.js\`

## Priority
Critical - Should be fixed immediately`,
    labels: ['security', 'critical', 'backend', 'bugfix']
  },
  {
    title: '🔴 HIGH: Twilio signature verification bypass when auth token not set',
    body: `## Problem
The Twilio signature verification in \`server/src/routes/twilioRoutes.js:18-21\` is bypassed when \`TWILIO_AUTH_TOKEN\` is not set, allowing unauthenticated requests to the SMS webhook.

## Impact
- In misconfigured environments, attackers could send fake SMS responses
- WTP (Willingness To Pay) data could be corrupted
- SMS conversation logs could be spoofed

## Solution
1. Consider failing fast on startup if Twilio webhooks are enabled but credentials are missing
2. Add clear documentation about security implications
3. Log warnings at application startup, not just per-request
4. Consider making Twilio configuration required for production deployments

## Related Files
- \`server/src/routes/twilioRoutes.js\`

## Priority
High - Should be addressed in next sprint`,
    labels: ['security', 'high', 'backend', 'bugfix']
  },
  {
    title: 'Extract magic numbers to named constants',
    body: `## Problem
Multiple magic numbers are hardcoded throughout the codebase without descriptive names:

- \`server/src/services/rideService.js:61\` - Price: \`5000\` cents
- \`server/src/services/analyticsService.js:8\` - Timeout: \`10000\` ms
- \`server/src/services/analyticsService.js:10\` - Max retries: \`3\`
- \`server/src/services/analyticsService.js:11\` - Initial delay: \`1000\` ms
- \`server/src/controllers/rideController.js:74\` - Keepalive: \`25000\` ms
- \`server/src/services/analyticsService.js:261\` - Cache cleanup: \`3600000\` ms
- Dispatch radius: \`15\` miles

## Impact
- Reduced code maintainability
- Difficult to understand intent
- Hard to change values consistently
- No single source of truth for configuration

## Solution
Create a constants module or extract to the top of each file:

\`\`\`javascript
// constants.js or at top of file
const FLAT_RATE_PRICE_CENTS = 5000;
const AIRTABLE_TIMEOUT_MS = 10000;
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const SSE_KEEPALIVE_INTERVAL_MS = 25000;
const SMS_CACHE_TTL_MS = 3600000; // 1 hour
const DISPATCH_RADIUS_MILES = 15;
\`\`\`

## Priority
Medium - Should be addressed in next 2-3 sprints`,
    labels: ['refactor', 'medium', 'backend', 'code-quality']
  },
  {
    title: 'Standardize error handling patterns across services',
    body: `## Problem
Error handling patterns are inconsistent across the codebase:
- Some catch blocks ignore errors silently
- Some return null on error
- Some throw errors
- Some log errors but continue

Examples:
- \`server/src/services/rideService.js:226-229\` - Catches and logs but doesn't rethrow
- \`server/src/routes/twilioRoutes.js:88-97\` - Catches all errors and returns 200
- \`server/src/services/paymentService.js:125\` - Empty catch on save

## Impact
- Difficult to debug issues
- Inconsistent API behavior
- Potential silent failures
- Unclear error propagation

## Solution
1. Establish error handling guidelines:
   - When to throw
   - When to log and continue
   - When to return error values
2. Create shared error handling utilities
3. Document patterns in CONTRIBUTING.md
4. Consider using error classes for different error types

## Priority
Medium - Should be addressed in next 2-3 sprints`,
    labels: ['refactor', 'medium', 'backend', 'frontend', 'code-quality']
  },
  {
    title: 'Implement comprehensive input validation',
    body: `## Problem
Some endpoints lack comprehensive input validation for:
- Phone number format validation (E.164)
- Price amount bounds checking
- Coordinate precision validation
- String length limits for text fields
- Email format validation
- Enum value validation

## Impact
- Potential for invalid data in database
- API errors that could be prevented
- Security vulnerabilities (injection attacks)
- Poor user experience

## Solution
1. Use Joi validation consistently across all endpoints
2. Validate phone numbers match E.164 format
3. Add bounds checking for numeric inputs
4. Limit string lengths to prevent abuse
5. Validate coordinates are within valid ranges
6. Create reusable validation schemas

## Priority
High - Should be addressed in next sprint`,
    labels: ['enhancement', 'high', 'backend', 'security']
  },
  {
    title: 'Add JSDoc comments to all public functions',
    body: `## Problem
Many critical functions lack JSDoc documentation:
- \`server/src/services/rideService.js\` - \`requestRide\`, \`updateRideStatus\`
- \`server/src/controllers/rideController.js\` - Most controller functions
- \`server/src/services/dispatchService.js\` - Dispatch functions
- Various other service and utility functions

## Impact
- Reduced code maintainability
- Harder for new developers to understand
- No IntelliSense documentation in IDEs
- Unclear function contracts

## Solution
Add JSDoc comments with:
- Function description
- \`@param\` for all parameters with types
- \`@returns\` with return type
- \`@throws\` for error cases
- Example usage where helpful

Example:
\`\`\`javascript
/**
 * Request a new ride for a rider
 * @param {Object} params - Ride request parameters
 * @param {string} params.riderId - Rider's user ID
 * @param {Object} params.pickup - Pickup location {lat, lng, address}
 * @param {Object} params.dropoff - Dropoff location {lat, lng, address}
 * @param {string} [params.bikeType='bike'] - Type of bike (bike|ebike|cargo|other)
 * @param {string} [params.notes] - Optional notes
 * @returns {Promise<Ride>} Created ride object
 * @throws {Error} If validation fails or rider not found
 */
async function requestRide({ riderId, pickup, dropoff, bikeType, notes }) {
  // ...
}
\`\`\`

## Priority
Low - Nice to have, improve incrementally`,
    labels: ['documentation', 'low', 'backend', 'frontend']
  },
  {
    title: 'Replace console.error with Winston logger',
    body: `## Problem
\`server/src/services/rideService.js:228\` uses \`console.error\` instead of the configured Winston logger:

\`\`\`javascript
console.error('Failed to send WTP SMS:', error);
\`\`\`

## Impact
- Inconsistent logging
- Logs not captured by logging infrastructure
- Missing structured logging benefits
- Harder to aggregate and analyze logs

## Solution
Replace with:
\`\`\`javascript
logger.error('Failed to send WTP SMS', { error: error.message, stack: error.stack });
\`\`\`

Search for other instances:
\`\`\`bash
grep -r "console\\." server/src --exclude-dir=tests
\`\`\`

## Priority
Low - Should be fixed during next refactoring pass`,
    labels: ['refactor', 'low', 'backend', 'code-quality']
  },
  {
    title: 'Migrate from ESLint RC to flat config',
    body: `## Problem
The codebase uses deprecated ESLint RC configuration format (\`.eslintrc.cjs\`). ESLint warns that support will be removed in v10.0.0.

## Impact
- Future incompatibility with ESLint v10+
- Missing new ESLint features
- Deprecation warnings in CI/CD

## Solution
1. Migrate to flat config (\`eslint.config.js\`) format
2. Test to ensure all rules still work
3. Update CI/CD scripts if needed
4. Remove \`ESLINT_USE_FLAT_CONFIG=false\` from package.json scripts

## Resources
- [ESLint Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide)

## Priority
Low - Can wait until ESLint v10 is closer to release`,
    labels: ['tooling', 'low', 'refactor']
  },
  {
    title: 'Fix failing Twilio WTP integration tests',
    body: `## Problem
8 tests in \`server/src/tests/integration/twilioWtp.test.js\` are failing:
- Tests expect \`wtpResponse\` to be 'YES' but receive \`null\`
- WTP response recording not working in test environment

## Likely Causes
- Test database state issues
- Missing test data setup
- Async timing issues in test execution
- Mock configuration problems

## Solution
1. Review test setup and teardown
2. Ensure test data is properly initialized
3. Check database state between tests
4. Verify mock configurations
5. Consider adding explicit waits for async operations

## Priority
Medium - Tests should be fixed to maintain code quality`,
    labels: ['testing', 'medium', 'backend', 'bugfix']
  },
  {
    title: 'Fix failing ride lifecycle integration tests',
    body: `## Problem
2 tests in \`server/src/tests/integration/rideLifecycle.test.js\` are failing due to Stripe configuration:
- \`runs from request to completion\` - Gets 500 instead of 201
- \`streams ride status updates to connected clients\` - Timeout

Error: "Stripe configuration missing: STRIPE_SECRET_KEY"

## Solution
1. Mock Stripe service in integration tests
2. Or provide test Stripe configuration
3. Use Stripe test mode API keys
4. Ensure test environment variables are properly set
5. Consider using \`stripe-mock\` for testing

## Priority
Medium - Tests should be fixed to maintain code quality`,
    labels: ['testing', 'medium', 'backend', 'bugfix']
  },
  {
    title: 'Create comprehensive environment variables documentation',
    body: `## Problem
While \`.env.example\` files exist, there's no comprehensive documentation of all required and optional environment variables with their purposes and security implications.

## Impact
- Difficult for new developers to set up
- Unclear security requirements
- Potential for misconfiguration
- Missing production deployment guidance

## Solution
Create \`docs/CONFIGURATION.md\` with:

1. **Required Variables**
   - \`JWT_SECRET\` - Purpose, security requirements (min 32 chars)
   - \`MONGODB_URI\` - Connection string format
   - \`REDIS_URL\` - Connection string format

2. **Optional Variables**
   - \`STRIPE_SECRET_KEY\` - When needed, test vs prod
   - \`TWILIO_*\` - When needed, security implications
   - \`AIRTABLE_*\` - When needed, rate limits

3. **Security Considerations**
   - Never commit secrets
   - Use strong, random values
   - Rotate secrets regularly
   - Different secrets per environment

4. **Environment-Specific Settings**
   - Development defaults
   - Test configuration
   - Production requirements

## Priority
Low - Nice to have for improved developer experience`,
    labels: ['documentation', 'low']
  },
  {
    title: 'Create comprehensive security documentation',
    body: `## Problem
Security best practices and considerations are not comprehensively documented in the repository.

## Impact
- Unclear security expectations
- Potential for security misconfigurations
- No guidance for security testing
- Missing incident response procedures

## Solution
Create \`docs/SECURITY.md\` with:

1. **Security Requirements**
   - Required configurations
   - Environment variable security
   - Secrets management

2. **Threat Model**
   - Identified threats
   - Mitigation strategies
   - Security boundaries

3. **Security Testing**
   - Running security scans
   - Penetration testing guidelines
   - Vulnerability reporting

4. **Incident Response**
   - Security contact information
   - Response procedures
   - Disclosure policy

5. **Compliance**
   - PII handling (already partially documented)
   - Data retention
   - Regulatory considerations

## Priority
Medium - Important for production deployment`,
    labels: ['documentation', 'security', 'medium']
  },
  {
    title: 'Consider dependency injection for better testability',
    body: `## Problem
Several services use global singleton patterns for external clients (Stripe, Twilio, Airtable), which can make testing difficult and create hidden dependencies.

Examples:
- \`server/src/services/paymentService.js\` - Global \`stripeClient\`
- \`server/src/services/smsService.js\` - Global \`twilioClient\`
- \`server/src/services/analyticsService.js\` - Global \`airtableBase\`

## Impact
- Harder to write unit tests
- Hidden dependencies between modules
- Difficult to mock in tests
- Coupling to implementation details

## Solution
Consider dependency injection pattern:

\`\`\`javascript
class RideService {
  constructor({ paymentService, smsService, analyticsService }) {
    this.paymentService = paymentService;
    this.smsService = smsService;
    this.analyticsService = analyticsService;
  }
  
  async requestRide(params) {
    // Use injected services
    await this.paymentService.createIntent(ride);
  }
}

// In tests
const mockPaymentService = { createIntent: jest.fn() };
const rideService = new RideService({ 
  paymentService: mockPaymentService 
});
\`\`\`

## Priority
Low - Nice to have, consider during major refactoring`,
    labels: ['refactor', 'low', 'backend', 'architecture']
  },
  {
    title: 'Improve SMS cache to prevent memory leaks',
    body: `## Problem
The \`smsLogCache\` Set in \`server/src/services/analyticsService.js:13\` could grow indefinitely:
- Uses \`setTimeout\` for cleanup which could fail
- No maximum size limit
- Risk of memory leak in long-running processes

\`\`\`javascript
const smsLogCache = new Set();
// ...
setTimeout(() => smsLogCache.delete(messageSid), 3600000); // 1 hour
\`\`\`

## Impact
- Potential memory leak
- No bounds on memory usage
- Could affect long-running production deployments

## Solution
Options:
1. Use an LRU cache library with maximum size
2. Use a time-windowed Set with periodic cleanup
3. Add monitoring for cache size
4. Consider moving to Redis for distributed caching

Example with LRU cache:
\`\`\`javascript
const LRU = require('lru-cache');
const smsLogCache = new LRU({
  max: 10000, // Maximum 10k entries
  ttl: 3600000 // 1 hour TTL
});
\`\`\`

## Priority
Low - Monitor in production, address if becomes an issue`,
    labels: ['enhancement', 'low', 'backend', 'performance']
  }
];

console.log('GitHub Issues to Create:');
console.log('========================\n');

console.log(`Total: ${issues.length} issues\n`);

issues.forEach((issue, index) => {
  console.log(`${index + 1}. ${issue.title}`);
  console.log(`   Labels: ${issue.labels.join(', ')}`);
  console.log();
});

console.log('\nTo create these issues, use the GitHub web interface or CLI:');
console.log('https://github.com/PetrefiedThunder/SupportCarr/issues/new\n');

console.log('Or use GitHub CLI (gh) - example:');
console.log('gh issue create --title "Issue title" --body "Issue body" --label "label1,label2"\n');

// Uncomment to actually create issues (requires gh CLI):
// console.log('\nCreating issues...\n');
// issues.forEach((issue, index) => {
//   try {
//     const labels = issue.labels.join(',');
//     const command = `gh issue create --title "${issue.title.replace(/"/g, '\\"')}" --label "${labels}" --body "${issue.body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
//     const result = execSync(command, { encoding: 'utf-8' });
//     console.log(`✅ Created issue ${index + 1}: ${result.trim()}`);
//   } catch (error) {
//     console.error(`❌ Failed to create issue ${index + 1}:`, error.message);
//   }
// });
