param(
  [string]$Repository = "techzoneadapter-droid/ReelTara",
  [string]$KeyAlias = "reeltara-upload",
  [string]$ApiOrigin = ""
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Find-Keytool {
  $found = Get-Command keytool -ErrorAction SilentlyContinue
  if ($found) { return $found.Source }
  $candidates = @(
    (Join-Path $env:ProgramFiles "Android\Android Studio\jbr\bin\keytool.exe"),
    (Join-Path $env:ProgramFiles "Java\jdk-21\bin\keytool.exe")
  )
  if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME "bin\keytool.exe") }
  foreach ($item in $candidates) { if (Test-Path $item) { return $item } }
  throw "Khong tim thay keytool. Cai Android Studio (kem JBR) hoac JDK 21 truoc."
}

function Secure-ToText([System.Security.SecureString]$Secure) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Set-GitHubSecret([string]$Name, [string]$Value) {
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo.FileName = (Get-Command gh).Source
  $p.StartInfo.UseShellExecute = $false
  $p.StartInfo.RedirectStandardInput = $true
  $p.StartInfo.RedirectStandardOutput = $true
  $p.StartInfo.RedirectStandardError = $true
  # PowerShell 5.1 / .NET Framework compatible; no password enters command-line arguments.
  $p.StartInfo.Arguments = "secret set $Name -R $Repository"
  [void]$p.Start()
  $p.StandardInput.Write($Value)
  $p.StandardInput.Close()
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw "Khong the cai Secret $Name tren GitHub: $stderr" }
  Write-Host "Da cai Secret: $Name" -ForegroundColor Green
}

Write-Host "REELTARA - TAO KHOA KY ANDROID AN TOAN" -ForegroundColor Cyan
$keytool = Find-Keytool
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "Can cai GitHub CLI (gh) tu https://cli.github.com/ truoc khi chay script."
}
& gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Dang nhap GitHub tren may cua ban..." -ForegroundColor Yellow
  & gh auth login
  if ($LASTEXITCODE -ne 0) { throw "Dang nhap GitHub khong thanh cong." }
}

$folder = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "ReelTara-Upload-Key"
[void](New-Item -ItemType Directory -Force -Path $folder)
$file = Join-Path $folder "reeltara-upload.jks"
if (Test-Path $file) {
  Write-Host "Da co file upload key: $file" -ForegroundColor Yellow
  Write-Host "Se SU DUNG LAI khoa cu. Khong duoc thay khoa upload giua cac lan cap nhat."
} else {
  Write-Host "Keytool se yeu cau ban dat MAT KHAU, nhap 2 lan. Giu an toan."
  Write-Host "Khi hoi MAT KHAU CHO KEY $KeyAlias, nhan Enter de dung chung mat khau kho."
  & $keytool -genkeypair -v -keystore $file -alias $KeyAlias -keyalg RSA -keysize 4096 -validity 10000 -storetype JKS -dname "CN=NVB Tech, OU=Mobile, O=NVB Technology and Services, L=Thanh Hoa, C=VN"
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $file)) { throw "Tao upload keystore that bai." }
}

$storeSecure = Read-Host "Nhap lai mat khau keystore vua tao" -AsSecureString
$storePassword = Secure-ToText $storeSecure
if ([string]::IsNullOrWhiteSpace($storePassword)) { throw "Mat khau rong." }
$keyPassword = $storePassword
Write-Host "Dang xac minh upload keystore..." -ForegroundColor Yellow
# Validate without putting passwords on any command line. keytool prompts interactively.
& $keytool -list -keystore $file -alias $KeyAlias
if ($LASTEXITCODE -ne 0) { throw "Keystore/alias khong hop le." }

Write-Host "Upload 4 secrets qua GitHub CLI, khong hien thi mat khau..." -ForegroundColor Yellow
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($file))
Set-GitHubSecret "ANDROID_KEYSTORE_BASE64" $base64
Set-GitHubSecret "ANDROID_KEYSTORE_PASSWORD" $storePassword
Set-GitHubSecret "ANDROID_KEY_ALIAS" $KeyAlias
Set-GitHubSecret "ANDROID_KEY_PASSWORD" $keyPassword
$storePassword = $null; $keyPassword = $null; $base64 = $null

if (-not $ApiOrigin) { $ApiOrigin = Read-Host "URL Vercel backend HTTPS (nhan Enter neu chua trien khai)" }
if ($ApiOrigin) {
  try { $uri = [Uri]$ApiOrigin } catch { throw "URL backend khong hop le." }
  if ($uri.Scheme -ne "https" -or $uri.AbsolutePath -ne "/" -or $uri.Query -or $uri.Fragment -or -not $uri.Host) { throw "Can URL HTTPS origin, vi du https://reeltara-nvb.vercel.app, khong co path." }
  & gh variable set "REELTARA_API_ORIGIN" -R $Repository -b $ApiOrigin
  if ($LASTEXITCODE -ne 0) { throw "Khong cai duoc REELTARA_API_ORIGIN." }
  Write-Host "Da cai bien REELTARA_API_ORIGIN: $ApiOrigin" -ForegroundColor Green
}

Write-Host "QUAN TRONG: Hay copy file .jks sang USB bao mat va cat giu offline." -ForegroundColor Yellow
Write-Host "Duong dan khoa: $file"
& gh workflow run "android-build.yml" -R $Repository
if ($LASTEXITCODE -ne 0) { throw "Khong khoi chay duoc GitHub Actions." }
Write-Host "Da kich hoat build AAB. Xem Actions > ReelTara Android QA and bundles." -ForegroundColor Green
Write-Host "Khong chia se file .jks hay mat khau voi bat ky ai."
