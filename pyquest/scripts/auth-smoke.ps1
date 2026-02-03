# Auth smoke test (PowerShell)
# Requires dev server running at http://localhost:3000

$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:3000"
$email = "test@pyquest.dev"
$password = "password123"
$name = "Test User"

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "[1/5] Sign up" -ForegroundColor Cyan
$signupBody = @{ name = $name; email = $email; password = $password } | ConvertTo-Json
try {
  $signupResp = Invoke-WebRequest -Uri "$baseUrl/api/auth/signup" -Method POST -Body $signupBody -ContentType "application/json" -WebSession $session -UseBasicParsing
  Write-Host "signup status: $($signupResp.StatusCode)" -ForegroundColor Green
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "signup status: $status" -ForegroundColor Yellow
}

Write-Host "[2/5] CSRF" -ForegroundColor Cyan
$csrfResp = Invoke-WebRequest -Uri "$baseUrl/api/auth/csrf" -UseBasicParsing -WebSession $session
$csrfToken = (ConvertFrom-Json $csrfResp.Content).csrfToken
Write-Host "csrf status: $($csrfResp.StatusCode)" -ForegroundColor Green

Write-Host "[3/5] Sign in (credentials)" -ForegroundColor Cyan
$form = "csrfToken=$csrfToken&email=$email&password=$password&callbackUrl=$baseUrl/dashboard&json=true"
$signinResp = Invoke-WebRequest -Uri "$baseUrl/api/auth/callback/credentials" -Method POST -Body $form -ContentType "application/x-www-form-urlencoded" -WebSession $session -MaximumRedirection 0 -ErrorAction SilentlyContinue -UseBasicParsing
Write-Host "signin status: $($signinResp.StatusCode)" -ForegroundColor Green

Write-Host "[4/6] Session" -ForegroundColor Cyan
$sessionResp = Invoke-WebRequest -Uri "$baseUrl/api/auth/session" -UseBasicParsing -WebSession $session
Write-Host "session status: $($sessionResp.StatusCode)" -ForegroundColor Green
Write-Host "session body: $($sessionResp.Content)"

Write-Host "[5/6] Protected route (/dashboard)" -ForegroundColor Cyan
$dashResp = Invoke-WebRequest -Uri "$baseUrl/dashboard" -UseBasicParsing -WebSession $session -MaximumRedirection 0 -ErrorAction SilentlyContinue
Write-Host "dashboard status: $($dashResp.StatusCode)" -ForegroundColor Green

Write-Host "[6/6] Logout" -ForegroundColor Cyan
$csrfResp2 = Invoke-WebRequest -Uri "$baseUrl/api/auth/csrf" -UseBasicParsing -WebSession $session
$csrfToken2 = (ConvertFrom-Json $csrfResp2.Content).csrfToken
$signoutForm = "csrfToken=$csrfToken2&callbackUrl=$baseUrl/auth/signin&json=true"
$signoutResp = Invoke-WebRequest -Uri "$baseUrl/api/auth/signout" -Method POST -Body $signoutForm -ContentType "application/x-www-form-urlencoded" -WebSession $session -MaximumRedirection 0 -ErrorAction SilentlyContinue -UseBasicParsing
Write-Host "signout status: $($signoutResp.StatusCode)" -ForegroundColor Green

$sessionAfter = Invoke-WebRequest -Uri "$baseUrl/api/auth/session" -UseBasicParsing -WebSession $session
Write-Host "session after logout status: $($sessionAfter.StatusCode)" -ForegroundColor Green
Write-Host "session after logout body: $($sessionAfter.Content)"
