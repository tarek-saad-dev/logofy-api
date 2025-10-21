# Simple Logo Thumbnails API Test (PowerShell)
# Tests the basic functionality of the Logo Thumbnails API

$BaseUrl = "http://localhost:3000"
$ApiPath = "/api/logo/thumbnails"
$GamingCategoryId = "e8a45f2f-0c09-43dd-9741-fca53a074be8"

Write-Host "🚀 Starting Logo Thumbnails API Test" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

$TestResults = @{
    Passed = 0
    Failed = 0
    Total = 0
}

function Assert-Test {
    param([bool]$Condition, [string]$Message)
    
    $TestResults.Total++
    
    if ($Condition) {
        $TestResults.Passed++
        Write-Host "✅ $Message" -ForegroundColor Green
    } else {
        $TestResults.Failed++
        Write-Host "❌ $Message" -ForegroundColor Red
    }
}

function Test-ApiEndpoint {
    param([string]$Url, [string]$TestName)
    
    try {
        Write-Host "`n🧪 $TestName" -ForegroundColor Magenta
        $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 10
        $jsonData = $response.Content | ConvertFrom-Json
        
        Assert-Test ($response.StatusCode -eq 200) "Status code should be 200"
        Assert-Test ($jsonData.success -eq $true) "Response should have success: true"
        Assert-Test ($jsonData.PSObject.Properties.Name -contains "data") "Response should have data field"
        Assert-Test ($jsonData.PSObject.Properties.Name -contains "pagination") "Response should have pagination field"
        
        return $jsonData
    } catch {
        Write-Host "❌ Error in $TestName`: $($_.Exception.Message)" -ForegroundColor Red
        $TestResults.Failed++
        $TestResults.Total++
        return $null
    }
}

# Test 1: Basic functionality
$response1 = Test-ApiEndpoint "$BaseUrl$ApiPath" "Basic Functionality"

# Test 2: English language
$response2 = Test-ApiEndpoint "$BaseUrl$ApiPath?lang=en" "English Language"

if ($response2) {
    Assert-Test ($response2.language -eq "en") "Language should be 'en'"
    Assert-Test ($response2.direction -eq "ltr") "Direction should be 'ltr'"
}

# Test 3: Arabic language
$response3 = Test-ApiEndpoint "$BaseUrl$ApiPath?lang=ar" "Arabic Language"

if ($response3) {
    Assert-Test ($response3.language -eq "ar") "Language should be 'ar'"
    Assert-Test ($response3.direction -eq "rtl") "Direction should be 'rtl'"
}

# Test 4: Pagination
$response4 = Test-ApiEndpoint "$BaseUrl$ApiPath?page=1&limit=5" "Pagination"

if ($response4) {
    Assert-Test ($response4.pagination.page -eq 1) "Page should be 1"
    Assert-Test ($response4.pagination.limit -eq 5) "Limit should be 5"
}

# Test 5: Category filtering
$response5 = Test-ApiEndpoint "$BaseUrl$ApiPath?category_id=$GamingCategoryId" "Category Filtering"

if ($response5) {
    if ($response5.data.Count -gt 0) {
        $firstCategory = $response5.data[0]
        Assert-Test ($firstCategory.category.id -eq $GamingCategoryId) "All logos should belong to gaming category"
    }
}

# Test 6: Combined parameters
$response6 = Test-ApiEndpoint "$BaseUrl$ApiPath?lang=ar&page=1&limit=3&category_id=$GamingCategoryId" "Combined Parameters"

if ($response6) {
    Assert-Test ($response6.language -eq "ar") "Language should be Arabic"
    Assert-Test ($response6.pagination.page -eq 1) "Page should be 1"
    Assert-Test ($response6.pagination.limit -eq 3) "Limit should be 3"
}

# Print summary
Write-Host "`n" + "=" * 50 -ForegroundColor Cyan
Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "Total Tests: $($TestResults.Total)" -ForegroundColor White
Write-Host "✅ Passed: $($TestResults.Passed)" -ForegroundColor Green
Write-Host "❌ Failed: $($TestResults.Failed)" -ForegroundColor Red
Write-Host "📈 Success Rate: $([math]::Round(($TestResults.Passed / $TestResults.Total) * 100, 2))%" -ForegroundColor Cyan

if ($TestResults.Failed -eq 0) {
    Write-Host "`n🎉 All tests passed! The Logo Thumbnails API is working correctly." -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Some tests failed. Please check the API implementation." -ForegroundColor Yellow
}
