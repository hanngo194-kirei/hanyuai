param(
    [int]$Port = 8080,
    [string]$Root = ""
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if ([string]::IsNullOrWhiteSpace($Root)) {
    if ($PSScriptRoot) {
        $Root = Split-Path -Parent $PSScriptRoot
    } else {
        $Root = (Get-Location).Path
    }
}

$rootFull = [System.IO.Path]::GetFullPath($Root)
if (-not (Test-Path -LiteralPath $rootFull -PathType Container)) {
    throw "Không tìm thấy thư mục gốc: $rootFull"
}

$csharpSource = @"
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

public sealed class HanyuLanServer : IDisposable
{
    private readonly string _rootFull;
    private readonly string _rootPrefix;
    private readonly int _port;
    private TcpListener _listener;
    private CancellationTokenSource _cts;

    private static readonly Dictionary<string, string> MimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        { ".html", "text/html; charset=utf-8" },
        { ".htm",  "text/html; charset=utf-8" },
        { ".js",   "application/javascript; charset=utf-8" },
        { ".mjs",  "application/javascript; charset=utf-8" },
        { ".css",  "text/css; charset=utf-8" },
        { ".json", "application/json; charset=utf-8" },
        { ".svg",  "image/svg+xml" },
        { ".png",  "image/png" },
        { ".jpg",  "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".webp", "image/webp" },
        { ".ico",  "image/x-icon" },
        { ".mp3",  "audio/mpeg" },
        { ".pdf",  "application/pdf" },
        { ".woff2","font/woff2" }
    };

    private static readonly HashSet<string> NoStoreExts = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        ".html", ".htm", ".js", ".mjs", ".css", ".json"
    };

    public HanyuLanServer(string rootFull, int port)
    {
        _rootFull = Path.GetFullPath(rootFull).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        _rootPrefix = _rootFull + Path.DirectorySeparatorChar;
        _port = port;
    }

    public void Start()
    {
        _cts = new CancellationTokenSource();
        _listener = new TcpListener(IPAddress.Any, _port);
        _listener.Start();
        Task.Run(() => AcceptLoopAsync(_cts.Token));
    }

    private void DispatchClient(TcpClient client, CancellationToken token)
    {
        Task.Run(() => HandleClientAsync(client, token));
    }

    private async Task AcceptLoopAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            TcpClient client = null;
            try
            {
                client = await _listener.AcceptTcpClientAsync().ConfigureAwait(false);
            }
            catch (ObjectDisposedException)
            {
                break;
            }
            catch (SocketException)
            {
                if (token.IsCancellationRequested) break;
                continue;
            }
            catch
            {
                if (token.IsCancellationRequested) break;
                continue;
            }

            if (client != null)
            {
                DispatchClient(client, token);
            }
        }
    }

    private async Task HandleClientAsync(TcpClient client, CancellationToken token)
    {
        using (client)
        {
            try
            {
                client.ReceiveTimeout = 15000;
                client.SendTimeout = 30000;
                using (NetworkStream stream = client.GetStream())
                {
                    string requestText = await ReadHeadersAsync(stream, token).ConfigureAwait(false);
                    if (string.IsNullOrWhiteSpace(requestText)) return;

                    string[] lines = requestText.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
                    if (lines.Length == 0) return;

                    string[] parts = lines[0].Split(' ');
                    if (parts.Length < 2)
                    {
                        await SendErrorAsync(stream, 400, "Bad Request", false).ConfigureAwait(false);
                        return;
                    }

                    string method = parts[0].ToUpperInvariant();
                    string rawTarget = parts[1];
                    bool isHead = (method == "HEAD");
                    if (method != "GET" && !isHead)
                    {
                        await SendErrorAsync(stream, 405, "Method Not Allowed", false).ConfigureAwait(false);
                        return;
                    }

                    string rangeHeader = null;
                    for (int i = 1; i < lines.Length; i++)
                    {
                        if (lines[i].StartsWith("Range:", StringComparison.OrdinalIgnoreCase))
                        {
                            rangeHeader = lines[i].Substring(6).Trim();
                            break;
                        }
                    }

                    int qIdx = rawTarget.IndexOf('?');
                    if (qIdx >= 0) rawTarget = rawTarget.Substring(0, qIdx);
                    int hIdx = rawTarget.IndexOf('#');
                    if (hIdx >= 0) rawTarget = rawTarget.Substring(0, hIdx);

                    string decodedTarget = null;
                    try
                    {
                        decodedTarget = Uri.UnescapeDataString(rawTarget);
                    }
                    catch
                    {
                        decodedTarget = null;
                    }
                    if (decodedTarget == null)
                    {
                        await SendErrorAsync(stream, 400, "Bad Request", isHead).ConfigureAwait(false);
                        return;
                    }

                    if (string.IsNullOrEmpty(decodedTarget) || decodedTarget == "/")
                    {
                        decodedTarget = "/index.html";
                    }

                    string relPath = decodedTarget.TrimStart('/', '\\')
                        .Replace('/', Path.DirectorySeparatorChar)
                        .Replace('\\', Path.DirectorySeparatorChar);

                    string fullPath = null;
                    try
                    {
                        fullPath = Path.GetFullPath(Path.Combine(_rootFull, relPath));
                    }
                    catch
                    {
                        fullPath = null;
                    }
                    if (fullPath == null)
                    {
                        await SendErrorAsync(stream, 400, "Bad Request", isHead).ConfigureAwait(false);
                        return;
                    }

                    if (!fullPath.Equals(_rootFull, StringComparison.OrdinalIgnoreCase) &&
                        !fullPath.StartsWith(_rootPrefix, StringComparison.OrdinalIgnoreCase))
                    {
                        await SendErrorAsync(stream, 403, "Forbidden", isHead).ConfigureAwait(false);
                        return;
                    }

                    if (Directory.Exists(fullPath))
                    {
                        fullPath = Path.Combine(fullPath, "index.html");
                    }

                    if (!File.Exists(fullPath))
                    {
                        await SendErrorAsync(stream, 404, "Not Found", isHead).ConfigureAwait(false);
                        return;
                    }

                    string ext = Path.GetExtension(fullPath);
                    string contentType;
                    if (!MimeTypes.TryGetValue(ext, out contentType))
                    {
                        contentType = "application/octet-stream";
                    }
                    bool noStore = NoStoreExts.Contains(ext);

                    FileInfo fi = new FileInfo(fullPath);
                    long totalLength = fi.Length;
                    long start = 0;
                    long end = totalLength > 0 ? totalLength - 1 : -1;
                    bool isPartial = false;

                    if (!string.IsNullOrEmpty(rangeHeader) && rangeHeader.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase) && totalLength > 0)
                    {
                        string spec = rangeHeader.Substring(6).Trim();
                        int commaIdx = spec.IndexOf(',');
                        if (commaIdx >= 0) spec = spec.Substring(0, commaIdx).Trim();
                        int dashIdx = spec.IndexOf('-');
                        if (dashIdx >= 0)
                        {
                            string sPart = spec.Substring(0, dashIdx).Trim();
                            string ePart = spec.Substring(dashIdx + 1).Trim();
                            long parsedStart;
                            long parsedEnd;

                            if (sPart.Length == 0 && long.TryParse(ePart, out parsedEnd) && parsedEnd > 0)
                            {
                                start = Math.Max(0, totalLength - parsedEnd);
                                end = totalLength - 1;
                                isPartial = true;
                            }
                            else if (long.TryParse(sPart, out parsedStart) && parsedStart >= 0 && parsedStart < totalLength)
                            {
                                start = parsedStart;
                                if (ePart.Length > 0 && long.TryParse(ePart, out parsedEnd))
                                {
                                    end = Math.Min(totalLength - 1, parsedEnd);
                                }
                                else
                                {
                                    end = totalLength - 1;
                                }
                                if (end >= start) isPartial = true;
                            }
                        }
                    }

                    long contentLength = (end >= start && totalLength > 0) ? (end - start + 1) : 0;
                    StringBuilder sb = new StringBuilder();
                    sb.Append(isPartial ? "HTTP/1.1 206 Partial Content\r\n" : "HTTP/1.1 200 OK\r\n");
                    sb.Append("Content-Type: ").Append(contentType).Append("\r\n");
                    sb.Append("Content-Length: ").Append(contentLength).Append("\r\n");
                    sb.Append("Accept-Ranges: bytes\r\n");
                    if (isPartial)
                    {
                        sb.Append("Content-Range: bytes ").Append(start).Append("-").Append(end).Append("/").Append(totalLength).Append("\r\n");
                    }
                    if (noStore)
                    {
                        sb.Append("Cache-Control: no-store\r\n");
                    }
                    sb.Append("Connection: close\r\n\r\n");

                    byte[] headerBytes = Encoding.ASCII.GetBytes(sb.ToString());
                    await stream.WriteAsync(headerBytes, 0, headerBytes.Length, token).ConfigureAwait(false);

                    if (!isHead && contentLength > 0)
                    {
                        using (FileStream fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite, 65536, true))
                        {
                            if (start > 0) fs.Seek(start, SeekOrigin.Begin);
                            byte[] buffer = new byte[65536];
                            long remaining = contentLength;
                            while (remaining > 0)
                            {
                                int toRead = (int)Math.Min(buffer.Length, remaining);
                                int read = await fs.ReadAsync(buffer, 0, toRead, token).ConfigureAwait(false);
                                if (read <= 0) break;
                                await stream.WriteAsync(buffer, 0, read, token).ConfigureAwait(false);
                                remaining -= read;
                            }
                        }
                    }

                    await stream.FlushAsync(token).ConfigureAwait(false);
                }
            }
            catch
            {
                // Client disconnected or aborted
            }
        }
    }

    private static async Task<string> ReadHeadersAsync(NetworkStream stream, CancellationToken token)
    {
        byte[] buffer = new byte[16384];
        int total = 0;
        while (total < buffer.Length)
        {
            int read = await stream.ReadAsync(buffer, total, buffer.Length - total, token).ConfigureAwait(false);
            if (read <= 0) break;
            total += read;
            string current = Encoding.ASCII.GetString(buffer, 0, total);
            int endIdx = current.IndexOf("\r\n\r\n", StringComparison.Ordinal);
            if (endIdx >= 0) return current.Substring(0, endIdx);
            int lfIdx = current.IndexOf("\n\n", StringComparison.Ordinal);
            if (lfIdx >= 0) return current.Substring(0, lfIdx);
        }
        return total > 0 ? Encoding.ASCII.GetString(buffer, 0, total) : string.Empty;
    }

    private static async Task SendErrorAsync(NetworkStream stream, int code, string reason, bool isHead)
    {
        byte[] body = Encoding.UTF8.GetBytes(code + " " + reason);
        string header = string.Format(
            "HTTP/1.1 {0} {1}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: {2}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
            code, reason, body.Length
        );
        byte[] headerBytes = Encoding.ASCII.GetBytes(header);
        await stream.WriteAsync(headerBytes, 0, headerBytes.Length).ConfigureAwait(false);
        if (!isHead)
        {
            await stream.WriteAsync(body, 0, body.Length).ConfigureAwait(false);
        }
        await stream.FlushAsync().ConfigureAwait(false);
    }

    public void Stop()
    {
        try { if (_cts != null) _cts.Cancel(); } catch { }
        try { if (_listener != null) _listener.Stop(); } catch { }
    }

    public void Dispose()
    {
        Stop();
        try { if (_cts != null) _cts.Dispose(); } catch { }
    }
}
"@

if (-not ('HanyuLanServer' -as [type])) {
    Add-Type -TypeDefinition $csharpSource -Language CSharp
}

function Get-LanIPv4Addresses {
    $privateList = New-Object System.Collections.Generic.List[string]
    $fallbackList = New-Object System.Collections.Generic.List[string]
    $virtualPattern = '(vEthernet|Hyper-V|WSL|VMware|VirtualBox|Bluetooth|Tailscale)'

    $nics = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()
    foreach ($nic in $nics) {
        if ($nic.OperationalStatus -ne [System.Net.NetworkInformation.OperationalStatus]::Up) { continue }
        if ($nic.NetworkInterfaceType -eq [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback) { continue }

        $ipProps = $nic.GetIPProperties()
        if ($null -eq $ipProps) { continue }

        $isVirtual = ($nic.Name -match $virtualPattern) -or ($nic.Description -match $virtualPattern)

        foreach ($uni in $ipProps.UnicastAddresses) {
            if ($uni.Address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { continue }
            $ipStr = $uni.Address.ToString()
            if ($ipStr.StartsWith('127.') -or $ipStr.StartsWith('169.254.')) { continue }

            if (-not $fallbackList.Contains($ipStr)) {
                $fallbackList.Add($ipStr)
            }

            if (-not $isVirtual) {
                $octets = $ipStr.Split('.')
                $second = [int]$octets[1]
                $isPrivate = ($octets[0] -eq '192' -and $octets[1] -eq '168') -or
                             ($octets[0] -eq '10') -or
                             ($octets[0] -eq '172' -and $second -ge 16 -and $second -le 31)
                if ($isPrivate -and -not $privateList.Contains($ipStr)) {
                    $privateList.Add($ipStr)
                }
            }
        }
    }

    if ($privateList.Count -gt 0) {
        return $privateList.ToArray()
    }
    return $fallbackList.ToArray()
}

$server = New-Object HanyuLanServer($rootFull, $Port)
$server.Start()

try {
    $lanIps = @(Get-LanIPv4Addresses)

    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " Hanyu AI — Máy chủ thử nghiệm Wi-Fi LAN đang chạy" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " Thư mục gốc : $rootFull"
    Write-Host " Cổng lắng nghe: $Port"
    Write-Host ""

    if ($lanIps.Count -gt 0) {
        Write-Host " Mở trên iPhone (Safari) / Tablet Samsung (Chrome) cùng Wi-Fi:" -ForegroundColor Yellow
        foreach ($ip in $lanIps) {
            Write-Host "   - Bản phát triển : http://${ip}:${Port}/index.html" -ForegroundColor White
            Write-Host "   - Bản 1 file     : http://${ip}:${Port}/dist/hanyu-ai.html" -ForegroundColor White
        }
    } else {
        Write-Host " [Cảnh báo] Không dò được IPv4 LAN thực (có thể đang tắt Wi-Fi/LAN hoặc chạy trong sandbox)." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host " Mở trực tiếp trên máy tính:" -ForegroundColor Yellow
    Write-Host "   - http://127.0.0.1:${Port}/index.html"
    Write-Host "   - http://127.0.0.1:${Port}/dist/hanyu-ai.html"
    Write-Host ""
    Write-Host " Lưu ý: Nếu Windows Defender Firewall hỏi quyền mạng Private, hãy chọn Allow access."
    Write-Host " Nhấn Ctrl+C để dừng máy chủ." -ForegroundColor Gray
    Write-Host "============================================================" -ForegroundColor Cyan

    while ($true) {
        Start-Sleep -Milliseconds 500
    }
}
finally {
    $server.Stop()
    $server.Dispose()
}
