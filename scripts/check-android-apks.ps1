$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sdkPath = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$aaptPath = Join-Path $sdkPath 'build-tools\35.0.0\aapt2.exe'
foreach ($variant in @('debug', 'release')) {
    $apkPath = if ($variant -eq 'debug') { 'android/app/build/outputs/apk/debug/app-debug.apk' } else { 'android/app/build/outputs/apk/release/app-release-unsigned.apk' }
    $archive = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $apkPath).Path)
    try {
        $entry = $archive.GetEntry('assets/capacitor.config.json')
        if (!$entry) { throw "$variant APK missing Capacitor config" }
        $reader = [IO.StreamReader]::new($entry.Open())
        try { $config = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
        $manifest = (& $aaptPath dump xmltree $apkPath --file AndroidManifest.xml) -join "`n"
        if ($LASTEXITCODE -ne 0) { throw 'aapt2 manifest inspection failed' }
        if ($variant -eq 'debug') {
            if ($config.server.url -notmatch '^http://localhost:(518[8-9]|519[0-9])$') { throw 'Debug APK lost Live Reload URL' }
            $sessionPath = '.cache/android-usb/session.json'
            if (Test-Path -LiteralPath $sessionPath) {
                $session = Get-Content -LiteralPath $sessionPath -Raw | ConvertFrom-Json
                if ($config.server.url -ne $session.url) { throw 'Debug APK URL differs from the active Vite preview port' }
            }
            if ($manifest -notmatch 'com\.reeltara\.app\.debug') { throw 'Debug package is not isolated' }
            if (!$archive.GetEntry('res/xml/usb_network_security.xml')) { throw 'Debug missing network security policy' }
        } else {
            if ($config.server.url -or $config.server.cleartext -or $config.android.allowMixedContent) { throw 'Release APK contains development networking config' }
            if ($manifest -notmatch 'usesCleartextTraffic[^\r\n]*(?:=false\b|0x0\b)') { throw 'Release does not explicitly deny cleartext' }
            if ($manifest -match 'networkSecurityConfig|com\.reeltara\.app\.debug') { throw 'Release manifest contains debug config' }
            if ($archive.GetEntry('res/xml/usb_network_security.xml')) { throw 'Release includes debug network resource' }
        }
        foreach ($asset in $archive.Entries | Where-Object { $_.FullName -match '^assets/public/.*\.(js|html)$' }) {
            $reader = [IO.StreamReader]::new($asset.Open())
            try { $webText = $reader.ReadToEnd() } finally { $reader.Dispose() }
            if ($webText -match 'TMDB_READ_ACCESS_TOKEN') { throw "$variant web bundle contains server credential variable" }
        }
        Write-Output "PASS: $variant packaged configuration and manifest; no server credential variable in web assets."
    } finally { $archive.Dispose() }
}

# AAB uses the same release variant; its manifest is protobuf rather than APK
# binary XML. Check the bundle's own assets/resources and the merged manifest
# generated specifically for the release bundle task.
$bundlePath = 'android/app/build/outputs/bundle/release/app-release.aab'
if (Test-Path -LiteralPath $bundlePath) {
    $archive = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $bundlePath).Path)
    try {
        $entry = $archive.GetEntry('base/assets/capacitor.config.json')
        if (!$entry) { throw 'Release AAB missing Capacitor config' }
        $reader = [IO.StreamReader]::new($entry.Open())
        try { $config = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
        if ($config.server.url -or $config.server.cleartext -or $config.android.allowMixedContent) { throw 'Release AAB contains development networking config' }
        if ($archive.Entries | Where-Object { $_.FullName -match 'usb_network_security' }) { throw 'Release AAB includes debug network resource' }
        $bundleManifestPath = 'android/app/build/intermediates/bundle_manifest/release/processApplicationManifestReleaseForBundle/AndroidManifest.xml'
        $manifest = Get-Content -LiteralPath $bundleManifestPath -Raw
        if ($manifest -notmatch 'usesCleartextTraffic="false"' -or $manifest -match 'networkSecurityConfig|com\.reeltara\.app\.debug') { throw 'Release bundle merged manifest contains debug networking config' }
        Write-Output 'PASS: release AAB assets/resources and bundle merged manifest contain no development networking config.'
    } finally { $archive.Dispose() }
}
