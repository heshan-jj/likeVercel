$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:3001/api"
$testEmail = "test@example.com"
$testPassword = "password123"

Write-Host "`n[1] Testing Backend Health..."
$res = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
Write-Host "Health check response: $($res | ConvertTo-Json -Compress)"

Write-Host "`n[2] Testing User Registration..."
$regBody = @{
    email = $testEmail
    password = $testPassword
    name = "Test User"
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json"
    Write-Host "Registration successful"
} catch {
    Write-Host "User might already exist. Trying login..."
}

Write-Host "`n[3] Testing User Login..."
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $res.accessToken
Write-Host "Login successful. Token obtained."

$headers = @{
    Authorization = "Bearer $token"
}

Write-Host "`n[4] Testing GET /api/vps (Empty List)..."
$res = Invoke-RestMethod -Uri "$baseUrl/vps" -Method Get -Headers $headers
Write-Host "VPS List: $($res | ConvertTo-Json -Compress)"

Write-Host "`n[5] Testing POST /api/vps (Create VPS)..."
$createBody = @{
    name = "Test VPS"
    host = "192.168.1.100"
    port = 22
    username = "root"
    authType = "password"
    password = "secretpassword"
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "$baseUrl/vps" -Method Post -Body $createBody -Headers $headers -ContentType "application/json"
$vpsId = $res.profile.id
Write-Host "Created VPS with ID: $vpsId"

Write-Host "`n[6] Testing GET /api/vps (List with 1 item)..."
$res = Invoke-RestMethod -Uri "$baseUrl/vps" -Method Get -Headers $headers
Write-Host "VPS List length: $($res.profiles.Count)"

Write-Host "`nAll tests completed successfully!"
