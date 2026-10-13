$ErrorActionPreference = 'Stop'

# Use the installed SDK; never reinstall Android Studio for a stale PATH.
$candidates = @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User'),
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
)
$sdkPath = $candidates | Where-Object {
    $_ -and (Test-Path -LiteralPath (Join-Path $_ 'platform-tools\adb.exe'))
} | Select-Object -First 1
if (!$sdkPath) { throw 'ADB not found. Install Platform-Tools from the Google Android SDK Manager.' }
$toolsPath = Join-Path $sdkPath 'platform-tools'
$adbPath = Join-Path $toolsPath 'adb.exe'
& $adbPath version
if ($LASTEXITCODE -ne 0) { throw 'Installed adb.exe could not run.' }

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($userPath -split ';') -notcontains $toolsPath) {
    $userPath = ($userPath.TrimEnd(';') + ';' + $toolsPath).TrimStart(';')
    [Environment]::SetEnvironmentVariable('Path', $userPath, 'User')
}
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdkPath, 'User')
if (($env:Path -split ';') -notcontains $toolsPath) { $env:Path = $toolsPath + ';' + $env:Path }
$env:ANDROID_HOME = $sdkPath

# New PowerShell sessions must work even under an already-running VS Code
# process that inherited the old environment. Preserve existing profile bytes.
$documentsPath = [Environment]::GetFolderPath('MyDocuments')
$profileBlock = @'

# BEGIN ReelTara ADB PATH
$reelTaraSdkPath = [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User')
if (!$reelTaraSdkPath) { $reelTaraSdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$reelTaraToolsPath = Join-Path $reelTaraSdkPath 'platform-tools'
if (Test-Path -LiteralPath (Join-Path $reelTaraToolsPath 'adb.exe')) {
    if (($env:Path -split ';') -notcontains $reelTaraToolsPath) { $env:Path = $reelTaraToolsPath + ';' + $env:Path }
    if (!$env:ANDROID_HOME) { $env:ANDROID_HOME = $reelTaraSdkPath }
}
# END ReelTara ADB PATH

'@
foreach ($folder in @('WindowsPowerShell', 'PowerShell')) {
    $directory = Join-Path $documentsPath $folder
    $profilePath = Join-Path $directory 'profile.ps1'
    if ((Test-Path -LiteralPath $profilePath) -and ([IO.File]::ReadAllText($profilePath).Contains('# BEGIN ReelTara ADB PATH'))) { continue }
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
    $encoding = [Text.UTF8Encoding]::new($false)
    if (Test-Path -LiteralPath $profilePath) {
        $bytes = [IO.File]::ReadAllBytes($profilePath)
        if ($bytes.Length -ge 2 -and $bytes[0] -eq 255 -and $bytes[1] -eq 254) { $encoding = [Text.Encoding]::Unicode }
        elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 254 -and $bytes[1] -eq 255) { $encoding = [Text.Encoding]::BigEndianUnicode }
    }
    [IO.File]::AppendAllText($profilePath, $profileBlock, $encoding)
    Write-Output "Updated PowerShell profile: $profilePath"
}

# Notify Explorer and other Windows applications about the user environment.
if (!('ReelTaraEnvironmentNotice' -as [type])) {
    Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class ReelTaraEnvironmentNotice {
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr SendMessageTimeout(IntPtr window, uint message,
        UIntPtr wParam, string lParam, uint flags, uint timeout, out UIntPtr result);
}
'@
}
$noticeResult = [UIntPtr]::Zero
[void][ReelTaraEnvironmentNotice]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, 'Environment', 2, 3000, [ref]$noticeResult)
Write-Output 'ADB PATH configured for the user and new PowerShell sessions.'
adb devices -l
