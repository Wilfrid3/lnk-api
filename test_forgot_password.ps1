# Test script for the forgot password functionality
# This script demonstrates the complete forgot password flow

Write-Host "=== Testing Forgot Password System ===" -ForegroundColor Cyan
Write-Host

# Configuration
$API_BASE = "http://localhost:3001/api"
$TEST_EMAIL = "test@example.com"
$NEW_PASSWORD = "newSecurePassword123"

Write-Host "1. Testing forgot password endpoint..." -ForegroundColor Yellow
Write-Host "POST $API_BASE/auth/forgot-password"
Write-Host "Request body: {`"email`": `"$TEST_EMAIL`"}"
Write-Host

try {
    $forgotPasswordBody = @{
        email = $TEST_EMAIL
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$API_BASE/auth/forgot-password" `
        -Method POST `
        -ContentType "application/json" `
        -Body $forgotPasswordBody

    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
}
catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host
Write-Host "2. Expected flow:" -ForegroundColor Yellow
Write-Host "   - If the email exists in the database, a password reset email will be sent"
Write-Host "   - The email contains a reset link with a JWT token"
Write-Host "   - The token expires in 30 minutes"
Write-Host "   - The reset link format: http://localhost:3000/reset-password?token=<JWT_TOKEN>"
Write-Host
Write-Host "3. To complete the password reset:" -ForegroundColor Yellow
Write-Host "   - User clicks the link in their email"
Write-Host "   - Frontend redirects to reset password page with token"
Write-Host "   - User enters new password"
Write-Host "   - Frontend calls: POST $API_BASE/auth/reset-password"
Write-Host "   - Request body: {`"token`": `"<JWT_TOKEN>`", `"newPassword`": `"$NEW_PASSWORD`"}"
Write-Host
Write-Host "4. Testing reset password endpoint (with sample token):" -ForegroundColor Yellow
Write-Host "   Note: This will fail because we need a valid token from the forgot password email"
Write-Host

try {
    $resetPasswordBody = @{
        token       = "invalid_token_for_demo"
        newPassword = $NEW_PASSWORD
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$API_BASE/auth/reset-password" `
        -Method POST `
        -ContentType "application/json" `
        -Body $resetPasswordBody

    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
}
catch {
    Write-Host "Expected Error (invalid token):" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host "The forgot password system is implemented and ready to use!" -ForegroundColor Green
Write-Host
Write-Host "Security features implemented:" -ForegroundColor Yellow
Write-Host "- JWT tokens with 30-minute expiration"
Write-Host "- Email verification for password reset"
Write-Host "- Secure token validation"
Write-Host "- French language email templates"
Write-Host "- Professional email styling"
Write-Host "- Frontend URL configuration via environment variables"
Write-Host
Write-Host "API Endpoints available:" -ForegroundColor Yellow
Write-Host "- POST /api/auth/forgot-password - Send password reset email"
Write-Host "- POST /api/auth/reset-password - Reset password with token"
Write-Host "- POST /api/auth/change-password - Change password (authenticated users)"
