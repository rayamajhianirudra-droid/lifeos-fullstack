<#
.SYNOPSIS
  Copies the LifeOS Postgres database from Railway to Neon, then checks that
  every table has the same number of rows on both sides.

.DESCRIPTION
  - Asks for both connection strings as hidden input. Nothing is written to
    disk except the temporary dump, which is deleted at the end unless you
    pass -KeepDump (the dump contains user data: keep it private).
  - Refuses to run if the Neon database already has tables, so it can never
    overwrite data.
  - Needs PostgreSQL 18 command line tools (Railway runs Postgres 18).
    Install: https://www.postgresql.org/download/windows/ and pick only
    "Command Line Tools" in the installer.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\migrate-railway-to-neon.ps1
#>
param(
    [string]$PgBin = "",
    [switch]$KeepDump
)
$ErrorActionPreference = 'Stop'

function Read-Secret([string]$prompt) {
    $s = Read-Host -Prompt $prompt -AsSecureString
    $plain = [System.Net.NetworkCredential]::new('', $s).Password
    if ([string]::IsNullOrWhiteSpace($plain)) { throw "Nothing entered for: $prompt" }
    return $plain.Trim()
}

# --- Find PostgreSQL 18+ tools -------------------------------------------------
if (-not $PgBin) {
    $found = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue |
        Sort-Object { [int]($_.Directory.Parent.Name -replace '\D', '') } -Descending |
        Select-Object -First 1
    if (-not $found) { throw "pg_dump.exe not found. Install PostgreSQL 18 Command Line Tools, or pass -PgBin <folder>." }
    $PgBin = $found.DirectoryName
}
$pgDump = Join-Path $PgBin 'pg_dump.exe'
$pgRestore = Join-Path $PgBin 'pg_restore.exe'
$psql = Join-Path $PgBin 'psql.exe'
$verText = & $pgDump --version
$major = [int](([regex]::Match($verText, '(\d+)\.')).Groups[1].Value)
if ($major -lt 18) { throw "Found '$verText'. Railway runs Postgres 18, so pg_dump 18 or newer is required." }
Write-Host "Using $verText from $PgBin"

# --- Connection strings (hidden input) -----------------------------------------
Write-Host ""
Write-Host "Railway: Postgres service > Variables > DATABASE_PUBLIC_URL"
$src = Read-Secret "Paste the Railway DATABASE_PUBLIC_URL"
Write-Host "Neon: Dashboard > Connect > turn OFF 'Connection pooling' > copy the connection string"
$dst = Read-Secret "Paste the Neon connection string"
if ($dst -match '-pooler\.') { throw "That Neon string uses the pooler host. Turn off 'Connection pooling' and copy it again." }
if ($dst -notmatch 'sslmode=require') { throw "The Neon string must include sslmode=require." }

function Q([string]$conn, [string]$sql) {
    $out = & $psql -X -A -t -v ON_ERROR_STOP=1 -d $conn -c $sql
    if ($LASTEXITCODE -ne 0) { throw "Query failed: $sql" }
    return $out
}
$tablesSql = "select tablename from pg_tables where schemaname='public' order by 1"

# --- Safety checks ---------------------------------------------------------------
$srcTables = @(Q $src $tablesSql | Where-Object { $_ })
if ($srcTables.Count -eq 0) { throw "No tables found in the Railway database. Check the connection string." }
$dstTables = @(Q $dst $tablesSql | Where-Object { $_ })
if ($dstTables.Count -gt 0) {
    throw "The Neon database already has $($dstTables.Count) tables. Use a fresh, empty database (do not start the Render service before this script)."
}
Write-Host "Railway has $($srcTables.Count) tables. Neon is empty. Starting copy..."

$dump = Join-Path $env:TEMP ("lifeos-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".dump")
try {
    # --- Dump and restore -------------------------------------------------------
    & $pgDump --format=custom --no-owner --no-privileges --file=$dump --dbname=$src
    if ($LASTEXITCODE -ne 0) { throw "pg_dump failed." }
    Write-Host ("Dump size: {0:N1} MB" -f ((Get-Item $dump).Length / 1MB))

    & $pgRestore --no-owner --no-privileges --single-transaction --exit-on-error --dbname=$dst $dump
    if ($LASTEXITCODE -ne 0) { throw "pg_restore failed. Nothing was committed to Neon (single transaction)." }

    # --- Verify row counts --------------------------------------------------------
    $bad = 0
    Write-Host ""
    Write-Host ("{0,-28} {1,10} {2,10}" -f 'table', 'railway', 'neon')
    foreach ($t in $srcTables) {
        $a = [long](Q $src "select count(*) from public.""$t""")
        $b = [long](Q $dst "select count(*) from public.""$t""")
        $flag = if ($a -eq $b) { '' } else { '  <-- MISMATCH'; $bad++ }
        Write-Host ("{0,-28} {1,10} {2,10}{3}" -f $t, $a, $b, $flag)
    }
    if ($bad -gt 0) { throw "$bad table(s) differ. Do not switch over; send this output to Claude." }
    Write-Host ""
    Write-Host "Copy verified: every table matches. Next step in docs/deploy-render-neon.md." -ForegroundColor Green
}
finally {
    if ($KeepDump) {
        Write-Host "Dump kept at $dump (contains user data: keep private, delete when done)."
    } elseif (Test-Path $dump) {
        Remove-Item $dump -Force
    }
    $src = $null; $dst = $null
}
