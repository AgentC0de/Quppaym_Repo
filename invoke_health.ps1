$token = Get-Content .\service_role.txt -Raw
$headers = @{ Authorization = "Bearer $token"; "x-api-key" = "local_test_key_2026" }
try {
  $r = Invoke-WebRequest -Uri 'https://szburzfibchvdyxksokr.supabase.co/functions/v1/whatsapp-proxy/health' -Headers $headers -Method Get -UseBasicParsing -ErrorAction Stop
  Write-Output "HTTP $($r.StatusCode)"
  Write-Output $r.Content
} catch {
  if ($_.Exception.Response) {
    $resp = $_.Exception.Response
    $stream = $resp.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Output "HTTP Status: $($resp.StatusCode)"
    Write-Output "Body:"
    Write-Output $body
  } else {
    Write-Output "Request failed: $_"
  }
}
