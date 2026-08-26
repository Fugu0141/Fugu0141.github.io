param(
  [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$url = "http://localhost:$Port/index.html"
Write-Host "Fugu portfolio local preview"
Write-Host "Root: $root"
Write-Host "URL : $url"
Write-Host ""
Write-Host "content/home-promos と content/projects に追加したPNGは、再読み込みだけで反映されます。"
Write-Host "終了するときは Ctrl+C を押してください。"
Write-Host ""

Start-Process $url

if (Get-Command py -ErrorAction SilentlyContinue) {
  & py -m http.server $Port
  exit $LASTEXITCODE
}

if (Get-Command python -ErrorAction SilentlyContinue) {
  & python -m http.server $Port
  exit $LASTEXITCODE
}

throw "Python が見つかりません。Pythonをインストールするか、VS Code Live Serverなどでリポジトリ直下をHTTP配信してください。"
