param(
  [string]$Repository = 'techzoneadapter-droid/ReelTara',
  [string]$KeyAlias = 'reeltara-upload',
  [string]$KeyPath = '',
  [string]$ApiOrigin = '',
  [string]$GitHubCli = 'gh',
  [string]$JavaHome = $env:JAVA_HOME
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Run in a LOCAL console without transcripts. Passwords use hidden input;
# private values go only to encrypted GitHub Actions Secrets via standard input.
function Invoke-PrivateProcess($Executable, $Arguments, $InputText = $null, $PrivateEnv = @{}) {
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo.FileName = $Executable
  $process.StartInfo.Arguments = $Arguments
  $process.StartInfo.UseShellExecute = $false
  $process.StartInfo.CreateNoWindow = $true
  $process.StartInfo.RedirectStandardInput = $true
  $process.StartInfo.RedirectStandardOutput = $true
  $process.StartInfo.RedirectStandardError = $true
  foreach ($name in $PrivateEnv.Keys) { $process.StartInfo.EnvironmentVariables[$name] = $PrivateEnv[$name] }
  try {
    [void]$process.Start()
    if ($null -ne $InputText) { $process.StandardInput.Write($InputText) }
    $process.StandardInput.Close()
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    [void]$stdoutTask.Result; [void]$stderrTask.Result
    if ($process.ExitCode -ne 0) {
      $reason = if (($stdoutTask.Result + $stderrTask.Result) -match 'Illegal char|InvalidPath') { 'Windows path encoding error. Select an ASCII-only key path.' }
      elseif (($stdoutTask.Result + $stderrTask.Result) -match 'password was incorrect|tampered with|Cannot recover key|UnrecoverableKey') { 'The keystore or private-key password is incorrect.' }
      elseif (($stdoutTask.Result + $stderrTask.Result) -match 'already exists') { 'The alias already exists. Reuse the existing key.' }
      elseif (($stdoutTask.Result + $stderrTask.Result) -match 'does not exist') { 'Selected key file or alias does not exist.' }
      else { 'Private operation failed. Check key, alias, passwords and GitHub permissions locally.' }
      throw $reason
    }
  } finally { $process.Dispose() }
}
function Convert-PrivateText([Security.SecureString]$Value) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
$keytool = if ($JavaHome) { Join-Path $JavaHome 'bin/keytool.exe' } else { (Get-Command keytool -ErrorAction Stop).Source }
if (-not (Test-Path -LiteralPath $keytool)) { throw 'JDK 21 keytool is required.' }
$gh = (Get-Command $GitHubCli -ErrorAction Stop).Source
try { Invoke-PrivateProcess $gh 'auth status' }
catch {
  # Native stderr redirected by PowerShell 5.1 becomes a terminating error under
  # ErrorActionPreference=Stop. Inherit the LOCAL console directly for login.
  $login = New-Object System.Diagnostics.Process
  $login.StartInfo.FileName = $gh
  $login.StartInfo.Arguments = 'auth login --hostname github.com --git-protocol https --web'
  $login.StartInfo.UseShellExecute = $false
  try {
    [void]$login.Start(); $login.WaitForExit()
    if ($login.ExitCode -ne 0) { throw 'GitHub login failed.' }
  } finally { $login.Dispose() }
}
if (-not $KeyPath) {
  $documentsKey = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ReelTara-Upload-Key/reeltara-upload.jks'
  # keytool on this Windows system loses Unicode path characters. Preserve any
  # previous Documents key, but put NEW keys at an ASCII path outside the repo.
  $localKey = Join-Path $env:LOCALAPPDATA 'ReelTara/Signing/reeltara-upload.jks'
  $KeyPath = if (Test-Path -LiteralPath $documentsKey) { $documentsKey } else { $localKey }
}
Write-Host 'REELTARA - PRIVATE ANDROID UPLOAD KEY SETUP' -ForegroundColor Cyan
Write-Host 'If this app has already been uploaded to Play, reuse its upload key.'
if (-not (Test-Path -LiteralPath $KeyPath)) {
  $existing = Read-Host 'Existing upload key elsewhere? Enter full path, or Enter if none exists'
  if ($existing) { $KeyPath = $existing.Trim('"') }
}
$create = -not (Test-Path -LiteralPath $KeyPath)
if ($create) {
  if ((Read-Host 'No existing key selected. Type CREATE to create a NEW upload key') -cne 'CREATE') { throw 'Key creation cancelled.' }
  [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $KeyPath))
} else {
  Write-Host "Reusing existing key: $KeyPath" -ForegroundColor Yellow
  $aliasInput = Read-Host "Alias (Enter for $KeyAlias)"
  if ($aliasInput) { $KeyAlias = $aliasInput }
}
if ($KeyAlias -notmatch '^[a-zA-Z0-9._-]+$') { throw 'Unsupported alias characters.' }
if ($KeyPath.Contains('"')) { throw 'Invalid key path.' }
$storeSecure = Read-Host 'Keystore password (hidden)' -AsSecureString
$keySecure = Read-Host 'Private key password (hidden; Enter = same as keystore)' -AsSecureString
$storePassword = $null; $keyPassword = $null; $base64 = $null
try {
  $storePassword = Convert-PrivateText $storeSecure
  $keyPassword = if ($keySecure.Length) { Convert-PrivateText $keySecure } else { $storePassword }
  if ($storePassword.Length -lt 6 -or $keyPassword.Length -lt 6) { throw 'Passwords need at least 6 characters.' }
  if ($create) {
    Write-Host 'Creating upload key locally...' -ForegroundColor Yellow
    $confirmation = Read-Host 'Confirm keystore password (hidden)' -AsSecureString
    try { if ((Convert-PrivateText $confirmation) -cne $storePassword) { throw 'Passwords do not match.' } }
    finally { $confirmation.Dispose() }
  }
  $privateEnv = @{ REELTARA_STORE_PASSWORD = $storePassword; REELTARA_KEY_PASSWORD = $keyPassword }
  if ($create) {
    Invoke-PrivateProcess $keytool "-genkeypair -keystore `"$KeyPath`" -alias $KeyAlias -keyalg RSA -keysize 4096 -validity 10000 -storetype JKS -dname `"CN=NVB Tech, O=NVB Technology and Services, C=VN`" -storepass:env REELTARA_STORE_PASSWORD -keypass:env REELTARA_KEY_PASSWORD" $null $privateEnv
  }
  # Checks the EXACT store and private-key passwords that will be uploaded.
  Write-Host 'Verifying selected key and both passwords...' -ForegroundColor Yellow
  Invoke-PrivateProcess $keytool "-certreq -keystore `"$KeyPath`" -alias $KeyAlias -storepass:env REELTARA_STORE_PASSWORD -keypass:env REELTARA_KEY_PASSWORD" $null $privateEnv
  $base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($KeyPath))
  foreach ($entry in @(@('ANDROID_KEYSTORE_BASE64',$base64),@('ANDROID_KEYSTORE_PASSWORD',$storePassword),@('ANDROID_KEY_ALIAS',$KeyAlias),@('ANDROID_KEY_PASSWORD',$keyPassword))) {
    Invoke-PrivateProcess $gh "secret set $($entry[0]) -R $Repository" $entry[1]
    Write-Host "Configured encrypted Actions Secret: $($entry[0])" -ForegroundColor Green
  }
  if ($ApiOrigin) {
    $uri = [Uri]$ApiOrigin
    if ($uri.Scheme -ne 'https' -or $uri.UserInfo -or $uri.AbsolutePath -ne '/' -or $uri.Query -or $uri.Fragment) { throw 'Expected HTTPS origin.' }
    Invoke-PrivateProcess $gh "variable set REELTARA_API_ORIGIN -R $Repository --body $($uri.GetLeftPart([UriPartial]::Authority))"
  }
  $statusFolder = Join-Path $PSScriptRoot '../.cache'
  [void](New-Item -ItemType Directory -Force -Path $statusFolder)
  @{ configuredAt = [DateTime]::UtcNow.ToString('o'); repository = $Repository; status = 'secrets-configured'; createdNewKey = $create } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $statusFolder 'signing-status.json') -Encoding UTF8
  Write-Host "SUCCESS. Keep this key and passwords in an OFFLINE backup: $KeyPath" -ForegroundColor Green
  Write-Host 'No workflow dispatched. Build the verified release commit explicitly.'
} finally {
  $storePassword = $null; $keyPassword = $null; $base64 = $null; $privateEnv = $null; $entry = $null
  $storeSecure.Dispose(); $keySecure.Dispose()
}
