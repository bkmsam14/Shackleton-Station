# tunnel-watchdog.ps1 - keeps the game online through a Cloudflare quick tunnel.
#
#  - Serves dist-tunnel/ (build it first: npx vite build --base=/ --outDir dist-tunnel) with
#    `vite preview` on port 4173, and runs `cloudflared tunnel --url http://localhost:4173`.
#  - Every 15 s it checks the local server AND the public address; whatever stopped is restarted.
#  - While it runs, it asks Windows not to idle-sleep (like a video player does; no settings change).
#  - The current public address is in .tunnel/url.txt, the history in .tunnel/watchdog.log.
#
# A quick tunnel gets a NEW random address whenever cloudflared has to restart.
# Stop it: Stop-Process -Id (Get-Content .tunnel\watchdog.pid)  (then stop node/cloudflared too).
param([int]$Port = 4173, [int]$Every = 15)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root '.tunnel'
New-Item -ItemType Directory -Force $dir | Out-Null
$log = Join-Path $dir 'watchdog.log'
$urlFile = Join-Path $dir 'url.txt'
$site = Join-Path $root 'dist-tunnel'
$vite = Join-Path $root 'node_modules\vite\bin\vite.js'
$cf = @("${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe", "$env:ProgramFiles\cloudflared\cloudflared.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1

function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Add-Content -Path $log -Encoding utf8 }
function Test-Url($u, $t) {
  try { return (Invoke-WebRequest -UseBasicParsing $u -TimeoutSec $t).StatusCode -eq 200 } catch { return $false }
}

# no idle sleep while the watchdog runs (ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
Add-Type -Namespace Win32 -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
function Stay-Awake { [void][Win32.Power]::SetThreadExecutionState([uint32]'0x80000001') }

$PID | Set-Content -Path (Join-Path $dir 'watchdog.pid')
Log "watchdog started (pid $PID), site $site, cloudflared $cf"
if (-not $cf) { Log 'cloudflared.exe not found - install it: winget install Cloudflare.cloudflared'; exit 1 }
if (-not (Test-Path (Join-Path $site 'index.html'))) { Log "no build in $site - run: npx vite build --base=/ --outDir dist-tunnel"; exit 1 }

$server = $null; $tunnel = $null; $url = $null; $fails = 0
while ($true) {
  Stay-Awake

  # 1. the local game server
  if (-not (Test-Url "http://localhost:$Port/" 5)) {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
    Log 'game server not answering -> starting it'
    $server = Start-Process node -ArgumentList "`"$vite`" preview --outDir `"$site`" --port $Port --strictPort" `
      -WorkingDirectory $root -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $dir 'server.out.log') -RedirectStandardError (Join-Path $dir 'server.err.log')
    Start-Sleep 5
  }

  # 2. the tunnel: running, has an address, and the address answers from the internet
  $restart = (-not $tunnel) -or $tunnel.HasExited -or (-not $url)
  if ($tunnel -and $tunnel.HasExited) { Log "cloudflared stopped (exit $($tunnel.ExitCode))" }
  if (-not $restart) {
    if (Test-Url $url 20) { if ($fails) { Log 'public address answers again' }; $fails = 0 }
    else { $fails++; Log "public address not answering ($fails/4)" }
    if ($fails -ge 4) { $restart = $true; Log 'tunnel unreachable for about a minute -> restarting cloudflared' }
  }
  if ($restart) {
    if ($tunnel -and -not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue }
    $tlog = Join-Path $dir 'cloudflared.log'
    Remove-Item $tlog -ErrorAction SilentlyContinue
    $tunnel = Start-Process $cf -ArgumentList "tunnel --no-autoupdate --url http://localhost:$Port" `
      -WindowStyle Hidden -PassThru -RedirectStandardError $tlog -RedirectStandardOutput (Join-Path $dir 'cloudflared.out.log')
    $url = $null; $fails = 0
    for ($i = 0; $i -lt 45 -and -not $url -and -not $tunnel.HasExited; $i++) {
      Start-Sleep 2
      $m = Select-String -Path $tlog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($m) { $url = $m.Matches[0].Value }
    }
    if ($url) { Set-Content -Path $urlFile -Value $url -Encoding utf8; Log "tunnel up: $url" }
    else { Log 'cloudflared gave no address - will retry' }
  }

  Start-Sleep $Every
}
