param([Parameter(Mandatory=$true)][string]$PlanFile)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$p = Get-Content -LiteralPath $PlanFile -Raw -Encoding UTF8 | ConvertFrom-Json
function Full([string]$value) { [IO.Path]::GetFullPath($value).TrimEnd('\') }
function Within([string]$file,[string]$root) { (Full $file).StartsWith((Full $root)+'\',[StringComparison]::OrdinalIgnoreCase) }
if ($p.token -notmatch '^[a-f0-9]{32}$') { throw 'Invalid update token' }
$transaction = Full $p.transaction
$install = Full $p.installDir
$parent = [IO.Path]::GetDirectoryName($install)
if ($install -eq [IO.Path]::GetPathRoot($install).TrimEnd('\') -or (Full ([IO.Path]::GetDirectoryName($p.currentExe))) -ne $install) { throw 'Invalid install directory' }
if ($transaction -ne (Full (Join-Path (Join-Path $p.userData 'updates') $p.token)) -or -not (Within $p.packagePath (Join-Path $p.userData 'updates'))) { throw 'Invalid update cache' }
if ((Full $p.userData) -eq $install -or (Within $p.userData $install)) { throw 'Game files must be separate from the user profile' }
$stage = Join-Path $parent ('.magic-update-'+$p.token)
$backup = Join-Path $parent ('.magic-backup-'+$p.token)
$ready = Join-Path $transaction 'ready.json'
$receipt = Join-Path $transaction 'result.json'
$exeName = [IO.Path]::GetFileName($p.currentExe)
$moved = $false
$installed = $false
$newProcess = $null
[IO.File]::WriteAllText((Join-Path $transaction 'helper-ready'),'ready')
function Move-Retry([string]$from,[string]$to) {
 if ((Full ([IO.Path]::GetDirectoryName($from))) -ne (Full $parent) -or (Full ([IO.Path]::GetDirectoryName($to))) -ne (Full $parent)) { throw 'Unsafe move target' }
 for ($i=0; $i -lt 60; $i++) {
  try { Move-Item -LiteralPath $from -Destination $to; return } catch { if ($i -eq 59) { throw }; Start-Sleep -Milliseconds 250 }
 }
}
try {
 $inputFile=[IO.File]::OpenRead($p.packagePath);$hasher=[Security.Cryptography.SHA256]::Create()
 try { $digest=[BitConverter]::ToString($hasher.ComputeHash($inputFile)).Replace('-','').ToLowerInvariant() } finally { $inputFile.Dispose();$hasher.Dispose() }
 if ($digest -ne $p.release.sha256) { throw 'Package checksum mismatch' }
 if (Test-Path -LiteralPath $stage) { throw 'Stage already exists' }
 if (Test-Path -LiteralPath $backup) { throw 'Backup already exists' }
 [IO.Directory]::CreateDirectory($stage) | Out-Null
 $archive = [IO.Compression.ZipFile]::OpenRead($p.packagePath)
 try {
  $total = [long]0
  if ($archive.Entries.Count -gt 20000) { throw 'Too many package entries' }
  foreach ($entry in $archive.Entries) {
   $parts = $entry.FullName.Replace('\','/').Split('/')
   if ($parts[0] -ne $p.release.folder -or $parts -contains '..' -or $entry.FullName.Contains(':') -or (($entry.ExternalAttributes -shr 16) -band 61440) -eq 40960) { throw 'Unsafe archive entry' }
   $total += $entry.Length
   if ($total -gt 2147483648) { throw 'Package is too large' }
   $relative = ($parts | Select-Object -Skip 1) -join '\'
   if (-not $relative) { continue }
   $target = Full (Join-Path $stage $relative)
   if (-not (Within $target $stage)) { throw 'Archive path escaped stage' }
   if ($entry.FullName.EndsWith('/')) { [IO.Directory]::CreateDirectory($target) | Out-Null; continue }
   [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
   [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$target,$false)
  }
 } finally { $archive.Dispose() }
 $version = Get-Content -LiteralPath (Join-Path $stage 'VERSION.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 if ($version.clientVersion -ne $p.release.version -or $version.gameVersion -ne $p.release.gameVersion -or $version.protocolVersion -ne $p.release.protocolVersion -or -not (Test-Path -LiteralPath (Join-Path $stage $exeName)) -or -not (Test-Path -LiteralPath (Join-Path $stage 'resources\app.asar'))) { throw 'Incomplete update package' }
 $old = Get-Process -Id $p.pid -ErrorAction SilentlyContinue
 if ($old -and (Full $old.Path) -ne (Full $p.currentExe)) { throw 'Process identity changed' }
 for ($i=0; $i -lt 150; $i++) {
  $old = Get-Process -Id $p.pid -ErrorAction SilentlyContinue
  if (-not $old) { break }
  if ((Full $old.Path) -ne (Full $p.currentExe)) { throw 'Process identity changed' }
  Start-Sleep -Milliseconds 200
 }
 if ($old) { throw 'Game did not exit' }
 Move-Retry $install $backup; $moved=$true
 Move-Retry $stage $install; $installed=$true
 $newProcess=Start-Process -FilePath (Join-Path $install $exeName) -ArgumentList @('--update-ack',('"'+$ready+'"')) -WorkingDirectory $install -PassThru
 for ($i=0; $i -lt 300; $i++) {
  if (Test-Path -LiteralPath $ready) { break }
  $newProcess.Refresh(); if ($newProcess.HasExited) { throw 'New game exited during startup' }
  Start-Sleep -Milliseconds 200
 }
 if (-not (Test-Path -LiteralPath $ready)) { throw 'New game startup timeout' }
 $ack=Get-Content -LiteralPath $ready -Raw -Encoding UTF8 | ConvertFrom-Json
 if ($ack.clientVersion -ne $p.release.version -or $ack.gameVersion -ne $p.release.gameVersion) { throw 'New game version did not match' }
 @{ok=$true;version=$ack.clientVersion;gameVersion=$ack.gameVersion;pid=$ack.pid;origin=$ack.origin;backup=$backup} | ConvertTo-Json | Set-Content -LiteralPath $receipt -Encoding UTF8
} catch {
 $failure=$_.Exception.Message
 if ($newProcess -and -not $newProcess.HasExited) {
  if ((Full $newProcess.Path) -eq (Full (Join-Path $install $exeName))) { Stop-Process -Id $newProcess.Id; $newProcess.WaitForExit(10000) | Out-Null }
 }
 if ($moved) {
  if ($installed) { Move-Retry $install $stage }
  Move-Retry $backup $install
 }
 @{ok=$false;error=$failure;rolledBack=$moved} | ConvertTo-Json | Set-Content -LiteralPath $receipt -Encoding UTF8
 if ($moved -or -not (Get-Process -Id $p.pid -ErrorAction SilentlyContinue)) { Start-Process -FilePath (Join-Path $install $exeName) -ArgumentList '--update-failed' -WorkingDirectory $install | Out-Null }
}
