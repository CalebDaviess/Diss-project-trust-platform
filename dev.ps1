<#
.SYNOPSIS
    Boot the whole Trust Platform locally on Windows with one command.

.DESCRIPTION
    Starts all three application services (Quarkus Dev Services automatically
    starts PostgreSQL + Kafka in Docker containers):
      1. detection-engine        FastAPI ML scorer     http://localhost:8000/docs
      2. accountability-service  Quarkus backend API   http://localhost:8081/q/dev
      3. player-portal           React/Vite frontend   http://localhost:5173

.EXAMPLE
    .\dev.ps1
    .\dev.ps1 -NoOpen
    .\dev.ps1 -EnginePort 8000 -ApiPort 8081 -PortalPort 5173
#>
[CmdletBinding()]
param(
    [int]$EnginePort = 8000,
    [int]$ApiPort = 8081,
    [int]$PortalPort = 5173,
    [switch]$NoReload,
    [switch]$NoOpen,
    [switch]$NoDocker
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Boot([string]$Message) {
    Write-Host "[boot] $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
    Write-Host "[boot] $Message" -ForegroundColor Red
}

Write-Boot "Trust Platform - local boot (Windows)"

# --- Container runtime check (PostgreSQL + Kafka via Quarkus Dev Services) ---
$useLocalH2 = $NoDocker.IsPresent
if (-not $useLocalH2) {
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        Write-Warn "Docker not found on PATH - falling back to local H2 + in-memory messaging."
        $useLocalH2 = $true
    } else {
        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            & docker info *> $null
            if ($LASTEXITCODE -ne 0) {
                Write-Warn "Docker daemon is not running - falling back to local H2 + in-memory messaging (start Docker Desktop for Postgres + Kafka)."
                $useLocalH2 = $true
            }
        } finally {
            $ErrorActionPreference = $prevEap
        }
    }
}

# --- 1) detection-engine: venv + deps + trained model ------------------------
$engineDir = Join-Path $Root "detection-engine"
$venvPy = Join-Path $engineDir ".venv\Scripts\python.exe"
$venvPip = Join-Path $engineDir ".venv\Scripts\pip.exe"
$venvUvicorn = Join-Path $engineDir ".venv\Scripts\uvicorn.exe"
$modelPath = Join-Path $engineDir "models\model.joblib"

if (-not (Test-Path $venvUvicorn)) {
    Write-Boot "detection-engine: creating venv + installing deps (first run only)..."
    Push-Location $engineDir
    try {
        python -m venv .venv
        & $venvPip install --quiet -e ".[dev]"
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $modelPath)) {
    Write-Boot "detection-engine: no trained model found - training one now..."
    Push-Location $engineDir
    try {
        & $venvPy -m detection_engine.train
    } finally {
        Pop-Location
    }
}

# --- 2) accountability-service: JWT keys + Maven -----------------------------
$apiDir = Join-Path $Root "accountability-service"
$jwtDir = Join-Path $apiDir "src\main\resources\jwt"
$privKey = Join-Path $jwtDir "privateKey.pem"
$pubKey = Join-Path $jwtDir "publicKey.pem"

if (-not ((Test-Path $privKey) -and (Test-Path $pubKey))) {
    $openssl = Get-Command openssl -ErrorAction SilentlyContinue
    if (-not $openssl -and (Test-Path "C:\Program Files\Git\usr\bin\openssl.exe")) {
        $openssl = Get-Item "C:\Program Files\Git\usr\bin\openssl.exe"
    }
    if ($openssl) {
        Write-Boot "accountability-service: generating dev RS256 JWT keypair..."
        New-Item -ItemType Directory -Force -Path $jwtDir | Out-Null
        & $openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out $privKey 2>$null
        & $openssl rsa -in $privKey -pubout -out $pubKey 2>$null
    } else {
        Write-Warn "OpenSSL not found and JWT keys are missing in $jwtDir"
    }
}

$mvnCmd = $null
if (Test-Path (Join-Path $apiDir "mvnw.cmd")) {
    $mvnCmd = Join-Path $apiDir "mvnw.cmd"
} elseif (Get-Command mvn -ErrorAction SilentlyContinue) {
    $mvnCmd = (Get-Command mvn).Source
} elseif (Test-Path (Join-Path $env:USERPROFILE ".m2\tools\apache-maven-3.9.9\bin\mvn.cmd")) {
    $mvnCmd = Join-Path $env:USERPROFILE ".m2\tools\apache-maven-3.9.9\bin\mvn.cmd"
} else {
    throw "Maven not found. Install Apache Maven or add mvnw.cmd to accountability-service/."
}

# --- 3) player-portal: node_modules ------------------------------------------
$portalDir = Join-Path $Root "player-portal"
if (-not (Test-Path (Join-Path $portalDir "node_modules"))) {
    Write-Boot "player-portal: installing npm dependencies (first run only)..."
    Push-Location $portalDir
    try {
        npm install --silent
    } finally {
        Pop-Location
    }
}

# --- Launch all three services as managed background jobs --------------------
$reloadArgs = if ($NoReload) { "" } else { "--reload" }

$apiModeNote = if ($useLocalH2) { "(local H2 + in-memory messaging)" } else { "(boots Postgres + Kafka via Dev Services)" }
Write-Boot "starting detection-engine   -> http://localhost:$EnginePort/docs"
Write-Boot "starting accountability-svc -> http://localhost:$ApiPort/q/dev  $apiModeNote"
Write-Boot "starting player-portal      -> http://localhost:$PortalPort"

$procs = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()

function Start-ServiceProcess([string]$Name, [ConsoleColor]$Color, [string]$WorkDir, [string]$FilePath, [string]$Arguments, [hashtable]$ExtraEnv = @{}) {
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $FilePath
    $psi.Arguments = $Arguments
    $psi.WorkingDirectory = $WorkDir
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    foreach ($k in $ExtraEnv.Keys) {
        $psi.EnvironmentVariables[$k] = $ExtraEnv[$k]
    }
    $p = [System.Diagnostics.Process]::new()
    $p.StartInfo = $psi
    $p.EnableRaisingEvents = $true

    $onOut = {
        param($sender, $e)
        if ($null -ne $e.Data) {
            Write-Host "[$($Event.MessageData.Name)] " -ForegroundColor $Event.MessageData.Color -NoNewline
            Write-Host $e.Data
        }
    }
    $meta = @{ Name = $Name; Color = $Color }
    Register-ObjectEvent -InputObject $p -EventName OutputDataReceived -Action $onOut -MessageData $meta | Out-Null
    Register-ObjectEvent -InputObject $p -EventName ErrorDataReceived  -Action $onOut -MessageData $meta | Out-Null

    [void]$p.Start()
    $p.BeginOutputReadLine()
    $p.BeginErrorReadLine()
    $procs.Add($p)
    return $p
}

try {
    Start-ServiceProcess -Name "engine" -Color Cyan -WorkDir $engineDir `
        -FilePath $venvPy `
        -Arguments "-m uvicorn detection_engine.app:app --host 127.0.0.1 --port $EnginePort $reloadArgs" | Out-Null

    $apiEnv = @{
        "DETECTION_ENGINE_URL" = "http://127.0.0.1:$EnginePort"
        "DOCKER_API_VERSION"   = if ($env:DOCKER_API_VERSION) { $env:DOCKER_API_VERSION } else { "1.44" }
    }
    if (-not $env:JAVA_HOME) {
        $jdk = Get-ChildItem "C:\Program Files\Java\jdk-21*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($jdk) { $apiEnv["JAVA_HOME"] = $jdk.FullName }
    }
    $apiProfileArgs = if ($useLocalH2) { "-Plocal-h2 -Dquarkus.profile=dev,local-h2" } else { "-Dapi.version=1.44" }
    Start-ServiceProcess -Name "api" -Color Yellow -WorkDir $apiDir `
        -FilePath "cmd.exe" `
        -Arguments "/c `"$mvnCmd`" --no-transfer-progress $apiProfileArgs quarkus:dev -Dquarkus.http.port=$ApiPort -Dquarkus.console.enabled=false -Dquarkus.analytics.disabled=true" `
        -ExtraEnv $apiEnv | Out-Null

    Start-ServiceProcess -Name "portal" -Color Magenta -WorkDir $portalDir `
        -FilePath "cmd.exe" `
        -Arguments "/c npm run dev -- --host 127.0.0.1 --port $PortalPort --strictPort" `
        -ExtraEnv @{ "VITE_API_BASE_URL" = "http://localhost:$ApiPort" } | Out-Null

    Write-Boot "all three launched. Open http://localhost:$PortalPort (Ctrl+C stops everything)"

    $opened = $NoOpen.IsPresent
    $portalProbeUrl = "http://127.0.0.1:$PortalPort"
    $portalUrl = "http://localhost:$PortalPort"
    while ($true) {
        Start-Sleep -Milliseconds 500
        if (-not $opened) {
            try {
                $resp = Invoke-WebRequest -Uri $portalProbeUrl -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
                if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                    $opened = $true
                    Write-Boot "portal is ready - opening $portalUrl in your browser"
                    Start-Process $portalUrl
                }
            } catch {
                # still starting
            }
        }
        if (($procs | Where-Object { -not $_.HasExited }).Count -eq 0) {
            break
        }
    }
} finally {
    Write-Boot "shutting down..."
    foreach ($p in $procs) {
        try {
            if (-not $p.HasExited) {
                & taskkill /PID $p.Id /T /F 2>$null | Out-Null
            }
        } catch {}
    }
    Get-EventSubscriber | Unregister-Event -ErrorAction SilentlyContinue
    Write-Boot "all stopped."
}
