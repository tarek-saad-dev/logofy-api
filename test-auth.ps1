# PowerShell script to test authentication endpoints
$baseUrl = "http://localhost:3000/api/auth"
$token = $null
$testEmail = "test_$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$testPassword = "testpassword123"

Write-Host "🧪 Testing Authentication Endpoints`n" -ForegroundColor Cyan
Write-Host "=" * 60

# Test 1: Register User
Write-Host "`n[1] Testing Register Endpoint..." -ForegroundColor Yellow
$registerBody = @{
    email = $testEmail
    password = $testPassword
    name = "Test User"
    display_name = "Test Display"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/register" -Method Post -Body $registerBody -ContentType "application/json"
    if ($registerResponse.success) {
        Write-Host "✅ Register: SUCCESS" -ForegroundColor Green
        Write-Host "   User ID: $($registerResponse.data.user.id)"
        Write-Host "   Email: $($registerResponse.data.user.email)"
        $token = $registerResponse.data.token
        Write-Host "   Token received: $($token.Substring(0, [Math]::Min(50, $token.Length)))..."
    } else {
        Write-Host "❌ Register: FAILED - $($registerResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Register: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Test 2: Try duplicate registration
Write-Host "`n[2] Testing Duplicate Registration (should fail)..." -ForegroundColor Yellow
try {
    $dupResponse = Invoke-RestMethod -Uri "$baseUrl/register" -Method Post -Body $registerBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "❌ Duplicate Register: FAILED - Should have returned 409" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 409) {
        Write-Host "✅ Duplicate Register: Correctly rejected (409)" -ForegroundColor Green
    } else {
        Write-Host "❌ Duplicate Register: Wrong status code - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

# Test 3: Login
Write-Host "`n[3] Testing Login Endpoint..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Body $loginBody -ContentType "application/json"
    if ($loginResponse.success) {
        Write-Host "✅ Login: SUCCESS" -ForegroundColor Green
        $token = $loginResponse.data.token
    } else {
        Write-Host "❌ Login: FAILED - $($loginResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Login: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Get Current User
Write-Host "`n[4] Testing Get Current User (with token)..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}
try {
    $meResponse = Invoke-RestMethod -Uri "$baseUrl/me" -Method Get -Headers $headers
    if ($meResponse.success) {
        Write-Host "✅ Get Current User: SUCCESS" -ForegroundColor Green
        Write-Host "   User: $($meResponse.data.user.email)"
        if ($meResponse.data.user.password_hash) {
            Write-Host "⚠️  WARNING: password_hash exposed in response!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Get Current User: FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get Current User: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Get Current User without token
Write-Host "`n[5] Testing Get Current User (without token - should fail)..." -ForegroundColor Yellow
try {
    $meResponse = Invoke-RestMethod -Uri "$baseUrl/me" -Method Get -ErrorAction Stop
    Write-Host "❌ Get Current User (no token): Should have failed" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ Get Current User (no token): Correctly rejected (401)" -ForegroundColor Green
    } else {
        Write-Host "❌ Get Current User (no token): Wrong status - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

# Test 6: Refresh Token
Write-Host "`n[6] Testing Refresh Token..." -ForegroundColor Yellow
try {
    $refreshResponse = Invoke-RestMethod -Uri "$baseUrl/refresh" -Method Post -Headers $headers
    if ($refreshResponse.success) {
        Write-Host "✅ Refresh Token: SUCCESS" -ForegroundColor Green
        $token = $refreshResponse.data.token
    } else {
        Write-Host "❌ Refresh Token: FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Refresh Token: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Change Password
Write-Host "`n[7] Testing Change Password..." -ForegroundColor Yellow
$changePasswordBody = @{
    currentPassword = $testPassword
    newPassword = "newpassword123"
} | ConvertTo-Json

try {
    $changeResponse = Invoke-RestMethod -Uri "$baseUrl/change-password" -Method Post -Body $changePasswordBody -Headers $headers -ContentType "application/json"
    if ($changeResponse.success) {
        Write-Host "✅ Change Password: SUCCESS" -ForegroundColor Green
        
        # Verify new password works
        $newLoginBody = @{
            email = $testEmail
            password = "newpassword123"
        } | ConvertTo-Json
        
        $verifyLogin = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Body $newLoginBody -ContentType "application/json"
        if ($verifyLogin.success) {
            Write-Host "✅ Password Change Verified: Can login with new password" -ForegroundColor Green
            $token = $verifyLogin.data.token
        }
    } else {
        Write-Host "❌ Change Password: FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Change Password: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Login with wrong password
Write-Host "`n[8] Testing Login with Wrong Password (should fail)..." -ForegroundColor Yellow
$wrongLoginBody = @{
    email = $testEmail
    password = "wrongpassword"
} | ConvertTo-Json

try {
    $wrongResponse = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Body $wrongLoginBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "❌ Wrong Password Login: Should have failed" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ Wrong Password Login: Correctly rejected (401)" -ForegroundColor Green
    }
}

Write-Host "`n" + ("=" * 60)
Write-Host "✅ All Authentication Tests Completed!" -ForegroundColor Green
Write-Host "`nTest User Email: $testEmail"
Write-Host "Final Token: $($token.Substring(0, [Math]::Min(50, $token.Length)))..."
Write-Host "`n💡 Use this token in Postman/your API client:" -ForegroundColor Cyan
Write-Host "   Authorization: Bearer $token"

