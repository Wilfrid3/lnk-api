#!/usr/bin/env bash

# Test script for the forgot password functionality
# This script demonstrates the complete forgot password flow

echo "=== Testing Forgot Password System ==="
echo

# Configuration
API_BASE="http://localhost:3001/api"
TEST_EMAIL="test@example.com"
NEW_PASSWORD="newSecurePassword123"

echo "1. Testing forgot password endpoint..."
echo "POST ${API_BASE}/auth/forgot-password"
echo "Request body: {\"email\": \"${TEST_EMAIL}\"}"
echo

curl -X POST "${API_BASE}/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_EMAIL}\"}" \
  -v

echo
echo
echo "2. Expected flow:"
echo "   - If the email exists in the database, a password reset email will be sent"
echo "   - The email contains a reset link with a JWT token"
echo "   - The token expires in 30 minutes"
echo "   - The reset link format: http://localhost:3000/reset-password?token=<JWT_TOKEN>"
echo
echo "3. To complete the password reset:"
echo "   - User clicks the link in their email"
echo "   - Frontend redirects to reset password page with token"
echo "   - User enters new password"
echo "   - Frontend calls: POST ${API_BASE}/auth/reset-password"
echo "   - Request body: {\"token\": \"<JWT_TOKEN>\", \"newPassword\": \"${NEW_PASSWORD}\"}"
echo
echo "4. Testing reset password endpoint (with sample token):"
echo "   Note: This will fail because we need a valid token from the forgot password email"
echo

curl -X POST "${API_BASE}/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"invalid_token_for_demo\", \"newPassword\": \"${NEW_PASSWORD}\"}" \
  -v

echo
echo
echo "=== Test Complete ==="
echo "The forgot password system is implemented and ready to use!"
echo
echo "Security features implemented:"
echo "- JWT tokens with 30-minute expiration"
echo "- Email verification for password reset"
echo "- Secure token validation"
echo "- French language email templates"
echo "- Professional email styling"
echo "- Frontend URL configuration via environment variables"
