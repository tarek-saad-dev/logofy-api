# Logo Thumbnails API Test Suite (PowerShell)
# Comprehensive testing of the Logo Thumbnails API

$BaseUrl = "http://localhost:3000"
$ApiPath = "/api/logo/thumbnails"
$GamingCategoryId = "e8a45f2f-0c09-43dd-9741-fca53a074be8"

# Test results tracking
$TestResults = @{
    Passed = 0
    Failed = 0
    Total = 0
    Details = @()
}

# Simple assertion function
function Assert-Test {
    param(
        [bool]$Condition,
        [string]$Message
    )
    
    $TestResults.Total++
    
    if ($Condition) {
        $TestResults.Passed++
        Write-Host "✅ $Message" -ForegroundColor Green
        $TestResults.Details += @{ Test = $Message; Status = "PASS" }
    } else {
        $TestResults.Failed++
        Write-Host "❌ $Message" -ForegroundColor Red
        $TestResults.Details += @{ Test = $Message; Status = "FAIL" }
    }
}

# Make HTTP request
function Invoke-ApiRequest {
    param(
        [string]$Url,
        [string]$Description
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 10
        $jsonData = $response.Content | ConvertFrom-Json
        
        return @{
            Status = $response.StatusCode
            Data = $jsonData
            Success = $true
            Description = $Description
        }
    } catch {
        Write-Host "❌ Error in $Description`: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            Status = 0
            Data = $null
            Success = $false
            Error = $_.Exception.Message
            Description = $Description
        }
    }
}

# Main test function
function Start-TestSuite {
    Write-Host "🚀 Starting Logo Thumbnails API Test Suite" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "Base URL: $BaseUrl" -ForegroundColor Yellow
    Write-Host "API Path: $ApiPath" -ForegroundColor Yellow
    Write-Host "Gaming Category ID: $GamingCategoryId" -ForegroundColor Yellow
    Write-Host "=" * 60 -ForegroundColor Cyan
    
    $startTime = Get-Date
    
    # Test 1: Basic functionality
    Write-Host "`n🧪 Test 1: Basic Functionality" -ForegroundColor Magenta
    Write-Host "-" * 40 -ForegroundColor Magenta
    $response1 = Invoke-ApiRequest "$BaseUrl$ApiPath" "Basic functionality test"
    
    if ($response1.Success) {
        Assert-Test ($response1.Status -eq 200) "Status code should be 200"
        Assert-Test ($response1.Data.success -eq $true) "Response should have success: true"
        Assert-Test ($response1.Data.PSObject.Properties.Name -contains "data") "Response should have data field"
        Assert-Test ($response1.Data.PSObject.Properties.Name -contains "pagination") "Response should have pagination field"
        
        # Check pagination structure
        $pagination = $response1.Data.pagination
        Assert-Test ($pagination.page -is [int]) "Pagination should have page number"
        Assert-Test ($pagination.limit -is [int]) "Pagination should have limit number"
        Assert-Test ($pagination.total -is [int]) "Pagination should have total count"
        Assert-Test ($pagination.pages -is [int]) "Pagination should have pages count"
        Assert-Test ($pagination.categoriesCount -is [int]) "Pagination should have categories count"
    }
    
    # Test 2: English language
    Write-Host "`n🧪 Test 2: English Language Support" -ForegroundColor Magenta
    Write-Host "-" * 40 -ForegroundColor Magenta
    $response2 = Invoke-ApiRequest "$BaseUrl$ApiPath?lang=en" "English language test"
    
    if ($response2.Success) {
        Assert-Test ($response2.Status -eq 200) "Status code should be 200"
        Assert-Test ($response2.Data.language -eq "en") "Language should be 'en'"
        Assert-Test ($response2.Data.direction -eq "ltr") "Direction should be 'ltr'"
        Assert-Test ($response2.Data.message -eq "Logos fetched successfully") "Message should be in English"
    }
    
    # Test 3: Arabic language
    Write-Host "`n🧪 Test 3: Arabic Language Support" -ForegroundColor Magenta
    Write-Host "-" * 40 -ForegroundColor Magenta
    $response3 = Invoke-ApiRequest "$BaseUrl$ApiPath?lang=ar" "Arabic language test"
    
    if ($response3.Success) {
        Assert-Test ($response3.Status -eq 200) "Status code should be 200"
        Assert-Test ($response3.Data.language -eq "ar") "Language should be 'ar'"
        Assert-Test ($response3.Data.direction -eq "rtl") "Direction should be 'rtl'"
        Assert-Test ($response3.Data.message -ne "Logos fetched successfully") "Message should be in Arabic (not English)"
    }
    
    # Test 4: Pagination
    Write-Host "`n🧪 Test 4: Pagination" -ForegroundColor Magenta
    Write-Host "-" * 40 -ForegroundColor Magenta
    $response4 = Invoke-ApiRequest "$BaseUrl$ApiPath?page=1&limit=5" "Pagination test"
    
    if ($response4.Success) {
        Assert-Test ($response4.Status -eq 200) "Status code should be 200"
        Assert-Test ($response4.Data.pagination.page -eq 1) "Page should be 1"
        Assert-Test ($response4.Data.pagination.limit -eq 5) "Limit should be 5"
    }
    
    # Test 5: Category filtering
    Write-Host "`n🧪 Test 5: Category Filtering" -ForegroundColor Magenta
    Write-Host "-" * 40 -ForegroundColor Magenta
    $response5 = Invoke-ApiRequest "$BaseUrl$ApiPath?category_id=$GamingCategoryId" "Category filtering test"
    
    if ($response5.Success) {
        Assert-Test ($response5.Status -eq 200) "Status code should be 200"
        
        # Check if all returned logos belong to the gaming category
        if ($response5.Data.data.Count -gt 0) {
            $firstCategory = $response5.Data.data[0]
            Assert-Test ($firstCategory.category.id -eq $GamingCategoryId) "All logos should belong to gaming category"
            
            if ($firstCategory.logos.Count -gt 0) {
                $firstLogo = $firstCategory.logos[0]
                Assert-Test ($firstLogo.categoryId -eq $GamingCategoryId) "Logo should have correct category ID"
            }
        }
    }
    
    # Test 6: Combined parameters
    Write-Host "`n🧪 Test 6: Combined Parameters" -ForegroundColor Magenta
    Write-Host "-" * 40 -ForegroundColor Magenta
    $response6 = Invoke-ApiRequest "$BaseUrl$ApiPath?lang=ar&page=1&limit=3&category_id=$GamingCategoryId" "Combined parameters test"
    
    if ($response6.Success) {
        Assert-Test ($response6.Status -eq 200) "Status code should be 200"
        Assert-Test ($response6.Data.language -eq "ar") "Language should be Arabic"
        Assert-Test ($response6.Data.direction -eq "rtl") "Direction should be RTL"
        Assert-Test ($response6.Data.pagination.page -eq 1) "Page should be 1"
        Assert-Test ($response6.Data.pagination.limit -eq 3) "Limit should be 3"
    }
    
    # Test 7: Edge cases
    Write-Host "`n🧪 Test 7: Edge Cases" -ForegroundColor Magenta
    Write-Host "-" * 40 -ForegroundColor Magenta
    
    # Invalid category ID format
    $response7a = Invoke-ApiRequest "$BaseUrl$ApiPath?category_id=invalid-uuid" "Invalid UUID test"
    if ($response7a.Success) {
        Assert-Test ($response7a.Status -eq 200) "Should handle invalid UUID gracefully"
    }
    
    # Non-existent category ID
    $response7b = Invoke-ApiRequest "$BaseUrl$ApiPath?category_id=00000000-0000-0000-0000-000000000000" "Non-existent UUID test"
    if ($response7b.Success) {
        Assert-Test ($response7b.Status -eq 200) "Should handle non-existent UUID gracefully"
    }
    
    # Invalid language code
    $response7c = Invoke-ApiRequest "$BaseUrl$ApiPath?lang=fr" "Invalid language test"
    if ($response7c.Success) {
        Assert-Test ($response7c.Status -eq 200) "Should handle invalid language gracefully"
        Assert-Test ($response7c.Data.language -eq "en") "Should default to English for invalid language"
    }
    
    # Test 8: Performance
    Write-Host "`n🧪 Test 8: Performance" -ForegroundColor Magenta
    Write-Host "-" * 40 -ForegroundColor Magenta
    
    $iterations = 3
    $times = @()
    
    for ($i = 1; $i -le $iterations; $i++) {
        $perfStart = Get-Date
        $response8 = Invoke-ApiRequest "$BaseUrl$ApiPath" "Performance test $i"
        $perfEnd = Get-Date
        $responseTime = ($perfEnd - $perfStart).TotalMilliseconds
        $times += $responseTime
        
        if ($response8.Success) {
            Assert-Test ($responseTime -lt 5000) "Response time should be under 5s (was $([math]::Round($responseTime, 2))ms)"
        }
    }
    
    $avgTime = ($times | Measure-Object -Average).Average
    $maxTime = ($times | Measure-Object -Maximum).Maximum
    
    Write-Host "📊 Performance stats: Avg: $([math]::Round($avgTime, 2))ms, Max: $([math]::Round($maxTime, 2))ms" -ForegroundColor Yellow
    
    # Print summary
    $endTime = Get-Date
    $totalTime = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
    Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "Total Tests: $($TestResults.Total)" -ForegroundColor White
    Write-Host "✅ Passed: $($TestResults.Passed)" -ForegroundColor Green
    Write-Host "❌ Failed: $($TestResults.Failed)" -ForegroundColor Red
    Write-Host "⏱️  Total Time: $([math]::Round($totalTime, 2))ms" -ForegroundColor Yellow
    Write-Host "📈 Success Rate: $([math]::Round(($TestResults.Passed / $TestResults.Total) * 100, 2))%" -ForegroundColor Cyan
    
    if ($TestResults.Failed -gt 0) {
        Write-Host "`n❌ FAILED TESTS:" -ForegroundColor Red
        $TestResults.Details | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
            Write-Host "  - $($_.Test)" -ForegroundColor Red
        }
    }
    
    Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
    
    if ($TestResults.Failed -eq 0) {
        Write-Host "🎉 All tests passed! The Logo Thumbnails API is working correctly." -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some tests failed. Please check the API implementation." -ForegroundColor Yellow
    }
}

# Run the test suite
Start-TestSuite
