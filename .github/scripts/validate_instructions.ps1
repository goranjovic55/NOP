# Instruction System Validation Script
# Run after instruction updates to verify integrity

Write-Host "`n=== INSTRUCTION SYSTEM VALIDATION ===" -ForegroundColor Cyan

# 1. File Existence
Write-Host "`n[1/6] Checking file existence..." -ForegroundColor Yellow
$files = @(
    ".\.github\copilot-instructions.md",
    ".\.github\chatmodes\DevTeam.chatmode.md",
    ".\.github\instructions\phases.md",
    ".\.github\instructions\protocols.md",
    ".\.github\instructions\standards.md",
    ".\.github\instructions\structure.md",
    ".\.github\instructions\examples.md"
)

$missing = @()
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  * $file" -ForegroundColor Green
    } else {
        Write-Host "  X $file MISSING" -ForegroundColor Red
        $missing += $file
    }
}

# 2. Line Counts
Write-Host "`n[2/6] Checking line counts..." -ForegroundColor Yellow
$limits = @{
    "copilot-instructions.md" = 130
    "DevTeam.chatmode.md" = 130
    "phases.md" = 120
    "protocols.md" = 150
    "standards.md" = 130
    "structure.md" = 110
    "examples.md" = 180
}

$total = 0
$overLimit = @()
foreach ($file in $files) {
    if (Test-Path $file) {
        $lines = (Get-Content $file).Count
        $total += $lines
        $name = Split-Path $file -Leaf
        $limit = $limits[$name]
        
        if ($lines -le $limit) {
            Write-Host "  * $name : $lines lines (limit: $limit)" -ForegroundColor Green
        } else {
            Write-Host "  ! $name : $lines lines (OVER limit: $limit)" -ForegroundColor Yellow
            $overLimit += "$name : $lines/$limit"
        }
    }
}

Write-Host "`n  Total: $total lines (hard max: 820)" -ForegroundColor $(if ($total -le 820) { "Green" } else { "Red" })

# 3. Critical Keywords
Write-Host "`n[3/6] Checking critical keywords..." -ForegroundColor Yellow
$missingKeywords = @()

# Check copilot-instructions.md
$content = Get-Content ".\.github\copilot-instructions.md" -Raw
if ($content -match "Pre-Send Verification") { Write-Host "  * copilot-instructions.md : Pre-Send Verification" -ForegroundColor Green } else { Write-Host "  X Missing" -ForegroundColor Red; $missingKeywords += "copilot-instructions.md : Pre-Send Verification" }
if ($content -match "Auto-Checkpoint") { Write-Host "  * copilot-instructions.md : Auto-Checkpoint" -ForegroundColor Green } else { Write-Host "  X Missing" -ForegroundColor Red; $missingKeywords += "copilot-instructions.md : Auto-Checkpoint" }
if ($content -match "Failure Mode Handling") { Write-Host "  * copilot-instructions.md : Failure Mode Handling" -ForegroundColor Green } else { Write-Host "  X Missing" -ForegroundColor Red; $missingKeywords += "copilot-instructions.md : Failure Mode Handling" }

# Check DevTeam.chatmode.md
$content = Get-Content ".\.github\chatmodes\DevTeam.chatmode.md" -Raw
if ($content -match "Test Failure Classification") { Write-Host "  * DevTeam.chatmode.md : Test Failure Classification" -ForegroundColor Green } else { Write-Host "  X Missing" -ForegroundColor Red; $missingKeywords += "DevTeam.chatmode.md : Test Failure Classification" }

# Check phases.md
$content = Get-Content ".\.github\instructions\phases.md" -Raw
if ($content -match "CODEGRAPH_QUERIES") { Write-Host "  * phases.md : CODEGRAPH_QUERIES" -ForegroundColor Green } else { Write-Host "  X Missing" -ForegroundColor Red; $missingKeywords += "phases.md : CODEGRAPH_QUERIES" }

# Check protocols.md
$content = Get-Content ".\.github\instructions\protocols.md" -Raw
if ($content -match "Phase Must-Haves") { Write-Host "  * protocols.md : Phase Must-Haves" -ForegroundColor Green } else { Write-Host "  X Missing" -ForegroundColor Red; $missingKeywords += "protocols.md : Phase Must-Haves" }
if ($content -match "CEPH Evolution Matrix") { Write-Host "  * protocols.md : CEPH Evolution Matrix" -ForegroundColor Green } else { Write-Host "  X Missing" -ForegroundColor Red; $missingKeywords += "protocols.md : CEPH Evolution Matrix" }
if ($content -match "Conflict Resolution Hierarchy") { Write-Host "  * protocols.md : Conflict Resolution Hierarchy" -ForegroundColor Green } else { Write-Host "  X Missing" -ForegroundColor Red; $missingKeywords += "protocols.md : Conflict Resolution Hierarchy" }

# Check standards.md
$content = Get-Content ".\.github\instructions\standards.md" -Raw
if ($content -match "Language Standards") { Write-Host "  * standards.md : Language Standards" -ForegroundColor Green } else { Write-Host "  X Missing" -ForegroundColor Red; $missingKeywords += "standards.md : Language Standards" }

# Check examples.md
$content = Get-Content ".\.github\instructions\examples.md" -Raw
if ($content -match "test failure") { Write-Host "  * examples.md : test failure patterns" -ForegroundColor Green } else { Write-Host "  X Missing" -ForegroundColor Red; $missingKeywords += "examples.md : test failure patterns" }

# 4. Summary
Write-Host "`n=== VALIDATION SUMMARY ===" -ForegroundColor Cyan

if ($missing.Count -eq 0) {
    Write-Host "* All files present" -ForegroundColor Green
} else {
    Write-Host "X Missing files: $($missing.Count)" -ForegroundColor Red
}

if ($total -le 820) {
    Write-Host "* Total line count: $total/820" -ForegroundColor Green
} else {
    Write-Host "X Total line count: $total/820 (EXCEEDED)" -ForegroundColor Red
}

if ($overLimit.Count -eq 0) {
    Write-Host "* All files within limits" -ForegroundColor Green
} else {
    Write-Host "! Files over limit: $($overLimit.Count)" -ForegroundColor Yellow
    $overLimit | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}

if ($missingKeywords.Count -eq 0) {
    Write-Host "* All critical keywords present" -ForegroundColor Green
} else {
    Write-Host "X Missing keywords: $($missingKeywords.Count)" -ForegroundColor Red
}

# Token estimation
$estimatedTokens = [math]::Round($total * 1.4)
Write-Host "`nEstimated token usage: ~$($estimatedTokens/1000)K tokens" -ForegroundColor Cyan

Write-Host "`n=== VALIDATION COMPLETE ===`n" -ForegroundColor Cyan
