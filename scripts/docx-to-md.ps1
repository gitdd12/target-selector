# docx -> markdown 변환기. 스펙 문서(질문흐름, 결과지_작성_기준)를 텍스트로 옮긴다.
# 사용법: powershell -File docx-to-md.ps1 -Docx <입력.docx> -Out <출력.md>
param(
  [Parameter(Mandatory=$true)][string]$Docx,
  [Parameter(Mandatory=$true)][string]$Out
)

Add-Type -AssemblyName System.IO.Compression
$W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

# Word가 파일을 열어둔 상태여도 읽을 수 있게 공유 모드로 연다.
$fs = [System.IO.File]::Open($Docx, 'Open', 'Read', 'ReadWrite')
$zip = New-Object System.IO.Compression.ZipArchive($fs, 'Read')
$entry = $zip.GetEntry('word/document.xml')
$sr = New-Object System.IO.StreamReader($entry.Open(), [Text.Encoding]::UTF8)
[xml]$doc = $sr.ReadToEnd()
$sr.Close(); $zip.Dispose(); $fs.Close()

$ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
$ns.AddNamespace('w', $W)

function Get-Text($node) {
  # 문단 안의 글자만 이어붙인다(탭·줄바꿈 포함).
  $sb = New-Object System.Text.StringBuilder
  foreach ($n in $node.SelectNodes('.//w:t | .//w:tab | .//w:br', $ns)) {
    switch ($n.LocalName) {
      't'   { [void]$sb.Append($n.InnerText) }
      'tab' { [void]$sb.Append(' ') }
      'br'  { [void]$sb.Append(' ') }
    }
  }
  return $sb.ToString().Trim()
}

function Get-Style($p) {
  $s = $p.SelectSingleNode('w:pPr/w:pStyle', $ns)
  if ($s) { return $s.GetAttribute('val', $W) }
  return ''
}

$lines = New-Object System.Collections.Generic.List[string]
$numCounter = 0
$body = $doc.SelectSingleNode('//w:body', $ns)

foreach ($child in $body.ChildNodes) {
  if ($child.LocalName -eq 'p') {
    $text = Get-Text $child
    if ($text -eq '') { continue }
    $style = Get-Style $child
    if ($style -ne 'ListNumber') { $numCounter = 0 }
    switch -Regex ($style) {
      '^Title$'        { $lines.Add("# $text"); $lines.Add('') }
      '^Heading1$'     { $lines.Add("## $text"); $lines.Add('') }
      '^Heading2$'     { $lines.Add("### $text"); $lines.Add('') }
      '^Heading3$'     { $lines.Add("#### $text"); $lines.Add('') }
      '^ListNumber$'   { $numCounter++; $lines.Add("$numCounter. $text") }
      '^ListBullet$'   { $lines.Add("- $text") }
      '^IntenseQuote$' { $lines.Add(''); $lines.Add("> $text"); $lines.Add('') }
      default          { $lines.Add($text); $lines.Add('') }
    }
  }
  elseif ($child.LocalName -eq 'tbl') {
    $numCounter = 0
    $rows = @()
    foreach ($tr in $child.SelectNodes('w:tr', $ns)) {
      $cells = @()
      foreach ($tc in $tr.SelectNodes('w:tc', $ns)) {
        $parts = @()
        foreach ($p in $tc.SelectNodes('w:p', $ns)) { $t = Get-Text $p; if ($t) { $parts += $t } }
        $cells += (($parts -join ' / ') -replace '\|', '\|')
      }
      $rows += ,$cells
    }
    if ($rows.Count -gt 0) {
      $lines.Add('')
      $lines.Add('| ' + ($rows[0] -join ' | ') + ' |')
      $lines.Add('|' + ((1..$rows[0].Count | ForEach-Object { '---' }) -join '|') + '|')
      for ($i = 1; $i -lt $rows.Count; $i++) { $lines.Add('| ' + ($rows[$i] -join ' | ') + ' |') }
      $lines.Add('')
    }
  }
}

[System.IO.File]::WriteAllText($Out, (($lines -join "`n") -replace "`n{3,}", "`n`n"), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "OK: $Out ($($lines.Count) lines)"
