Add-Type -AssemblyName System.IO.Compression.FileSystem

$docx = "c:\Users\Dell\Desktop\PROjects\UAP\UAP_07_Multi_Agent_Test_Playbook.docx"
if (Test-Path $docx) {
    $tempDir = "c:\Users\Dell\Desktop\PROjects\UAP\temp_docx"
    if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
    [System.IO.Compression.ZipFile]::ExtractToDirectory($docx, $tempDir)
    $xmlPath = Join-Path $tempDir "word\document.xml"
    if (Test-Path $xmlPath) {
        $xml = Get-Content $xmlPath -Raw -Encoding UTF8
        $text = $xml -replace '<w:p[ >]', "`r`n"
        $text = $text -replace '<[^>]+>', ''
        [System.IO.File]::WriteAllText("c:\Users\Dell\Desktop\PROjects\UAP\playbook_extracted.txt", $text, [System.Text.Encoding]::UTF8)
        Write-Host "Playbook extracted successfully. Length: $($text.Length)"
    }
    Remove-Item -Recurse -Force $tempDir
} else {
    Write-Host "Docx not found"
}

$zip = "C:\Users\Dell\.gemini\antigravity\brain\492aa2f1-e22e-41aa-9f5d-0ad9ab07c955\.user_uploaded\media_1793701956849_c3a94bf3.zip"
if (Test-Path $zip) {
    $dest = "c:\Users\Dell\Desktop\PROjects\UAP\uat-pack"
    if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $dest)
    Write-Host "Extracted uat-pack.zip to $dest"
    Get-ChildItem $dest | ForEach-Object { Write-Host " - $($_.Name)" }
}
