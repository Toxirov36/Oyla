param([string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if (-not (Test-Path -LiteralPath (Join-Path $PostgresBin 'initdb.exe'))) { throw 'PostgreSQL binaries not found. Supply -PostgresBin or use Docker Compose.' }
$env:PG_BIN = $PostgresBin
node scripts/local-postgres.mjs
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed.' }
$redisRoot = Join-Path $projectRoot '.local\redis\Redis-7.4.7-Windows-x64-cygwin'
$redisExe = Join-Path $redisRoot 'redis-server.exe'
if (-not (Test-Path -LiteralPath $redisExe)) {
  $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/redis-windows/redis-windows/releases/tags/7.4.7'
  $asset = $release.assets | Where-Object { $_.name -eq 'Redis-7.4.7-Windows-x64-cygwin.zip' }
  if (-not $asset) { throw 'Redis release asset not available.' }
  $archivePath = Join-Path $projectRoot '.local\redis.zip'
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $archivePath
  if ($asset.digest -and $asset.digest.StartsWith('sha256:')) {
    $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $asset.digest.Substring(7)) { throw 'Redis archive checksum mismatch.' }
  }
  Expand-Archive -LiteralPath $archivePath -DestinationPath (Join-Path $projectRoot '.local\redis') -Force
}
$redisCli = Join-Path $redisRoot 'redis-cli.exe'
$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$ping = & $redisCli -h 127.0.0.1 -p 56379 ping 2>$null
$ErrorActionPreference = $previousErrorAction
if ($ping -ne 'PONG') {
  Start-Process -FilePath $redisExe -ArgumentList '--bind','127.0.0.1','--port','56379','--save','""','--appendonly','no' -WorkingDirectory $redisRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.local\redis.log') -RedirectStandardError (Join-Path $projectRoot '.local\redis-error.log')
}
Write-Output 'Local infrastructure ready: PostgreSQL 55432, Redis 56379. Configuration is in apps/api/.env.'
