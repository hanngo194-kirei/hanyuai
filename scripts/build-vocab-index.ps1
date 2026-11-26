<#
.SYNOPSIS
  Tao lai file data/vocab-index.js tu tat ca cac goi du lieu trong data/*-full.js.
.DESCRIPTION
  Chay bang Windows PowerShell 5.1 thuan (khong can Node.js/Python).
  Quet Han ngu 1-6, NEW HSK 3.0 Cap 1-3, Hack nao 3000 chu Han (Tap 1-2) va So do tu duy 3300 chu Han.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$rootDir = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $rootDir 'data'
$outFile = Join-Path $dataDir 'vocab-index.js'

Add-Type -AssemblyName System.Web.Extensions
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$serializer.MaxJsonLength = [int]::MaxValue

function Read-JsDataObject {
  param([string]$FilePath)
  if (-not (Test-Path -LiteralPath $FilePath)) { return $null }
  $raw = [System.IO.File]::ReadAllText($FilePath, $utf8NoBom).Trim()
  $eqIdx = $raw.IndexOf('=')
  if ($eqIdx -lt 0) { throw "Khong tim thay dau '=' trong $FilePath" }
  $json = $raw.Substring($eqIdx + 1).Trim()
  if ($json.EndsWith(';')) { $json = $json.Substring(0, $json.Length - 1).Trim() }
  return $serializer.DeserializeObject($json)
}

$courses = @(
  @{ id = 'course_hn_1'; name = 'Hán ngữ 1'; group = 'hanngu' },
  @{ id = 'course_hn_2'; name = 'Hán ngữ 2'; group = 'hanngu' },
  @{ id = 'course_hn_3'; name = 'Hán ngữ 3'; group = 'hanngu' },
  @{ id = 'course_hn_4'; name = 'Hán ngữ 4'; group = 'hanngu' },
  @{ id = 'course_hn_5'; name = 'Hán ngữ 5'; group = 'hanngu' },
  @{ id = 'course_hn_6'; name = 'Hán ngữ 6'; group = 'hanngu' },
  @{ id = 'course_hsk30_lv1'; name = 'NEW HSK 3.0 · Cấp 1'; group = 'hsk' },
  @{ id = 'course_hsk30_lv2'; name = 'NEW HSK 3.0 · Cấp 2'; group = 'hsk' },
  @{ id = 'course_hsk30_lv3'; name = 'NEW HSK 3.0 · Cấp 3'; group = 'hsk' },
  @{ id = 'course_hacknao_3000'; name = 'Hack não 3000 chữ Hán'; group = 'hanzi' },
  @{ id = 'course_mindmap_3300'; name = 'Sơ đồ tư duy 3300 chữ Hán'; group = 'hanzi' }
)

$items = New-Object System.Collections.Generic.List[object]

function Add-WordRows {
  param(
    [object]$LessonObj,
    [int]$CourseIdx,
    [string]$LessonCode,
    [string]$LessonId
  )
  if ($null -eq $LessonObj -or -not ($LessonObj.ContainsKey('words'))) { return }
  $words = $LessonObj['words']
  if ($null -eq $words) { return }
  foreach ($w in $words) {
    if ($null -eq $w) { continue }
    $zh = ([string]$w['zh']).Trim()
    if ([string]::IsNullOrWhiteSpace($zh)) { continue }
    $py = ([string]$w['py']).Trim()
    $vi = ([string]$w['vi']).Trim()
    $items.Add(@($zh, $py, $vi, $CourseIdx, $LessonCode, $LessonId))
  }
}

# 1. Han ngu 1-6 (course indices 0..5)
for ($v = 1; $v -le 6; $v++) {
  $obj = Read-JsDataObject (Join-Path $dataDir ("hn{0}-full.js" -f $v))
  if ($null -eq $obj) { continue }
  $keys = $obj.Keys | Sort-Object { [int]$_ }
  foreach ($k in $keys) {
    Add-WordRows -LessonObj $obj[$k] -CourseIdx ($v - 1) -LessonCode ("Bài {0}" -f $k) -LessonId ("lesson_hn{0}_b{1}" -f $v, $k)
  }
}

# 2. NEW HSK 3.0 Cap 1-3 (course indices 6..8)
for ($lvl = 1; $lvl -le 3; $lvl++) {
  $obj = Read-JsDataObject (Join-Path $dataDir ("hsk30-{0}-full.js" -f $lvl))
  if ($null -eq $obj) { continue }
  $keys = $obj.Keys | Where-Object { $_ -match '^\d+$' } | Sort-Object { [int]$_ }
  foreach ($k in $keys) {
    Add-WordRows -LessonObj $obj[$k] -CourseIdx (5 + $lvl) -LessonCode ("Bài {0}" -f $k) -LessonId ("lesson_hsk30_lv{0}_b{1}" -f $lvl, $k)
  }
}

function Add-HanziChapterRows {
  param(
    [object]$RootObj,
    [object]$ChapterObj,
    [int]$CourseIdx,
    [string]$LessonCode,
    [string]$LessonId
  )
  if ($null -eq $ChapterObj) { return }
  if ($ChapterObj.ContainsKey('words')) {
    Add-WordRows -LessonObj $ChapterObj -CourseIdx $CourseIdx -LessonCode $LessonCode -LessonId $LessonId
    return
  }
  if (-not ($ChapterObj.ContainsKey('chars')) -or -not ($RootObj.ContainsKey('entries'))) { return }
  $entries = $RootObj['entries']
  foreach ($ch in $ChapterObj['chars']) {
    $zh = ([string]$ch).Trim()
    if ([string]::IsNullOrWhiteSpace($zh)) { continue }
    $e = if ($entries.ContainsKey($zh)) { $entries[$zh] } else { $null }
    $py = if ($null -ne $e -and $e.ContainsKey('py')) { ([string]$e['py']).Trim() } else { '' }
    $hv = if ($null -ne $e -and $e.ContainsKey('hv')) { ([string]$e['hv']).Trim() } else { '' }
    $mn = if ($null -ne $e -and $e.ContainsKey('meaning')) { ([string]$e['meaning']).Trim() } elseif ($null -ne $e -and $e.ContainsKey('vi')) { ([string]$e['vi']).Trim() } else { '' }
    $vi = if ($hv -and $mn) { "[$hv] $mn" } elseif ($mn) { $mn } else { $hv }
    $items.Add(@($zh, $py, $vi, $CourseIdx, $LessonCode, $LessonId))
  }
}

# 3. Hack nao 3000 chu Han Tap 1-3 (course index 9)
for ($t = 1; $t -le 3; $t++) {
  $obj = Read-JsDataObject (Join-Path $dataDir ("hanzi-hacknao{0}-full.js" -f $t))
  if ($null -eq $obj) { continue }
  $chObj = if ($obj.ContainsKey('chapters')) { $obj['chapters'] } else { $obj }
  $keys = $chObj.Keys | Where-Object { $_ -match '^\d+$' } | Sort-Object { [int]$_ }
  foreach ($k in $keys) {
    Add-HanziChapterRows -RootObj $obj -ChapterObj $chObj[$k] -CourseIdx 9 -LessonCode ("T{0}·P{1}" -f $t, $k) -LessonId ("lesson_hacknao_t{0}_c{1}" -f $t, $k)
  }
}

# 4. So do tu duy 3300 chu Han (course index 10)
$mmObj = Read-JsDataObject (Join-Path $dataDir 'hanzi-mindmap-full.js')
if ($null -ne $mmObj) {
  $chObj = if ($mmObj.ContainsKey('chapters')) { $mmObj['chapters'] } else { $mmObj }
  $keys = $chObj.Keys | Where-Object { $_ -match '^\d+$' } | Sort-Object { [int]$_ }
  foreach ($k in $keys) {
    Add-HanziChapterRows -RootObj $mmObj -ChapterObj $chObj[$k] -CourseIdx 10 -LessonCode ("Phần {0}" -f $k) -LessonId ("lesson_mindmap_p{0}" -f $k)
  }
}

$payload = @{
  courses = $courses
  items   = $items.ToArray()
}
$jsonOut = $serializer.Serialize($payload)
$header = "// Chi muc tu vung xuyen toan bo giao trinh (Han ngu 1-6, NEW HSK 3.0 Cap 1-3, Hack nao 3000 & So do tu duy)`n"
[System.IO.File]::WriteAllText($outFile, $header + "window.HANYU_VOCAB_INDEX = " + $jsonOut + ";`n", $utf8NoBom)

$fi = Get-Item -LiteralPath $outFile
Write-Output ("VOCAB_INDEX_BUILT: items={0} | courses={1} | bytes={2}" -f $items.Count, $courses.Count, $fi.Length)
