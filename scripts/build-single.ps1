<#
.SYNOPSIS
  Dong goi ung dung Hanyu AI (kien truc "2 trong 1") thanh 1 file HTML duy nhat: dist/hanyu-ai.html
.DESCRIPTION
  Chay bang Windows PowerShell 5.1 thuan (khong can Node.js/Python).
  Doc index.html, nhung noi tuyen cac <link rel="stylesheet" href="css/..."> va
  <script src="(data|js)/..."></script> cuc bo, giu nguyen Google Fonts va icon base64.
#>
[CmdletBinding()]
param(
  [string]$InputHtml = '',
  [string]$OutputHtml = ''
)

$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$rootDir = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($InputHtml)) {
  $InputHtml = Join-Path $rootDir 'index.html'
}
if ([string]::IsNullOrWhiteSpace($OutputHtml)) {
  $OutputHtml = Join-Path $rootDir 'dist\hanyu-ai.html'
}

if (-not (Test-Path -LiteralPath $InputHtml)) {
  throw "Khong tim thay file nguon: $InputHtml"
}

$html = [System.IO.File]::ReadAllText($InputHtml, $utf8NoBom)

$inlinedCss = New-Object System.Collections.Generic.List[string]
$inlinedJs  = New-Object System.Collections.Generic.List[string]

# 1. Nhung noi tuyen CSS cuc bo (<link ... href="css/..." .../>), giu nguyen Google Fonts & icon base64
$cssPattern = '<link\b(?=[^>]*\brel=["'']stylesheet["''])(?=[^>]*\bhref=["''](css/[^"'']+)["''])[^>]*/?>'
$cssEvaluator = [System.Text.RegularExpressions.MatchEvaluator]{
  param([System.Text.RegularExpressions.Match]$m)
  $relPath = $m.Groups[1].Value
  $fullPath = Join-Path $rootDir ($relPath -replace '/', '\')
  if (-not (Test-Path -LiteralPath $fullPath)) {
    throw "Khong tim thay file CSS cuc bo: $relPath ($fullPath)"
  }
  $cssContent = [System.IO.File]::ReadAllText($fullPath, $utf8NoBom)
  if ($cssContent -match '</style>') {
    throw "File CSS chua chuoi </style> khong hop le de nhung noi tuyen: $relPath"
  }
  $inlinedCss.Add($relPath)
  $trimmed = $cssContent.TrimEnd("`r", "`n")
  return "<style>`n$trimmed`n</style>"
}
$html = [regex]::Replace($html, $cssPattern, $cssEvaluator, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

# 2. Nhung noi tuyen JS & Data cuc bo (<script src="(data|js)/..."></script>)
# Dung MatchEvaluator de ky tu '$' trong JS ($('#toast'), ${...}, $$) khong bi .NET regex bien dang.
$jsPattern = '<script\b[^>]*\bsrc=["'']((?:data|js)/[^"'']+)["''][^>]*>\s*</script>'
$jsEvaluator = [System.Text.RegularExpressions.MatchEvaluator]{
  param([System.Text.RegularExpressions.Match]$m)
  $relPath = $m.Groups[1].Value
  $fullPath = Join-Path $rootDir ($relPath -replace '/', '\')
  if (-not (Test-Path -LiteralPath $fullPath)) {
    throw "Khong tim thay file JS/Data cuc bo: $relPath ($fullPath)"
  }
  $jsContent = [System.IO.File]::ReadAllText($fullPath, $utf8NoBom)
  if ($jsContent -match '</script>') {
    throw "File JS chua chuoi </script> khong hop le de nhung noi tuyen: $relPath"
  }
  $inlinedJs.Add($relPath)
  $trimmed = $jsContent.TrimEnd("`r", "`n")
  return "<script>`n$trimmed`n</script>"
}
$html = [regex]::Replace($html, $jsPattern, $jsEvaluator, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

# 3. Kiem tra toan ven truoc khi ghi file
$modalPos  = $html.IndexOf('id="hanyu-modal"', [System.StringComparison]::Ordinal)
$modalBox  = $html.IndexOf('id="hanyu-modal-box"', [System.StringComparison]::Ordinal)
$scriptPos = $html.IndexOf('<script', [System.StringComparison]::OrdinalIgnoreCase)

if ($modalPos -lt 0 -or $modalBox -lt 0) {
  throw 'Loi cau truc: Khong tim thay #hanyu-modal hoac #hanyu-modal-box trong HTML dau ra.'
}
if ($scriptPos -lt 0) {
  throw 'Loi cau truc: Khong tim thay the <script> nao trong HTML dau ra.'
}
if ($modalPos -gt $scriptPos -or $modalBox -gt $scriptPos) {
  throw "Loi cau truc: #hanyu-modal (pos=$modalPos) phai nam TRUOC the <script> dau tien (pos=$scriptPos)."
}
if ($html.IndexOf('https://fonts.googleapis.com/css2', [System.StringComparison]::Ordinal) -lt 0) {
  throw 'Loi cau truc: Mat link Google Fonts trong HTML dau ra.'
}
if ($html.IndexOf('data:image/png;base64,', [System.StringComparison]::Ordinal) -lt 0) {
  throw 'Loi cau truc: Mat icon base64 trong HTML dau ra.'
}
if ($html -match 'href=["'']css/' -or $html -match 'src=["''](?:data|js)/') {
  throw 'Loi dong goi: Van con the link/script cuc bo chua duoc nhung noi tuyen.'
}

# 4. Tao thu muc dist/ va ghi file UTF-8 khong BOM
$outDir = Split-Path -Parent $OutputHtml
if (-not (Test-Path -LiteralPath $outDir)) {
  [System.IO.Directory]::CreateDirectory($outDir) | Out-Null
}
[System.IO.File]::WriteAllText($OutputHtml, $html, $utf8NoBom)

$fi = Get-Item -LiteralPath $OutputHtml
$sizeKB = [Math]::Round($fi.Length / 1024.0, 2)
$lineCount = ($html -split "`n").Length

Write-Host "=== Hanyu AI Build Single HTML ==="
Write-Host ("Nguon  : {0}" -f $InputHtml)
Write-Host ("Dau ra : {0}" -f $OutputHtml)
Write-Host ("Kich co: {0:N0} bytes ({1} KB) | {2:N0} dong" -f $fi.Length, $sizeKB, $lineCount)
Write-Host ("CSS nhung ({0}): {1}" -f $inlinedCss.Count, ($inlinedCss -join ', '))
Write-Host ("JS/Data nhung ({0}): {1}" -f $inlinedJs.Count, ($inlinedJs -join ', '))
Write-Host ("Kiem tra #hanyu-modal truoc <script>: PASS (modal={0}, box={1} < script={2})" -f $modalPos, $modalBox, $scriptPos)
