$ErrorActionPreference = 'Stop'
function Read-RemoteText([string]$Uri) {
    $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing
    if ($response.Content -is [byte[]]) {
        return [Text.Encoding]::UTF8.GetString($response.Content)
    }
    return [string]$response.Content
}
function Parse-Packages([string]$Text) {
    foreach ($block in ($Text -split "\r?\n\r?\n")) {
        $fields = @{}
        foreach ($line in ($block -split "\r?\n")) {
            if ($line -match '^([^ :]+): (.*)$') { $fields[$Matches[1]] = $Matches[2] }
        }
        if ($fields.ContainsKey('Package')) { $fields }
    }
}
$kubeUri = 'https://pkgs.k8s.io/core:/stable:/v1.35/deb/Packages'
$wanted = @{
    'kubeadm' = '1.35.8-1.1'; 'kubelet' = '1.35.8-1.1'; 'kubectl' = '1.35.8-1.1'
    'cri-tools' = '1.35.0-1.1'; 'kubernetes-cni' = '1.8.0-1.1'
}
$kubeRecords = @(Parse-Packages (Read-RemoteText $kubeUri) | Where-Object {
    $_.Architecture -eq 'amd64' -and $wanted.ContainsKey($_.Package) -and $_.Version -eq $wanted[$_.Package]
})
if ($kubeRecords.Count -ne $wanted.Count) { throw 'Not all pinned Kubernetes packages were found.' }
$dockerUri = 'https://download.docker.com/linux/ubuntu/dists/jammy/stable/binary-amd64/Packages'
$dockerRecords = @(Parse-Packages (Read-RemoteText $dockerUri) | Where-Object {
    $_.Package -eq 'containerd.io' -and $_.Version -eq '2.3.3-1~ubuntu.22.04~jammy'
})
$audit = @{
    checkedAtUtc = [DateTime]::UtcNow.ToString('o')
    kubernetesSource = $kubeUri
    kubernetesPackages = $kubeRecords
    dockerSource = $dockerUri
    containerdJammy = $dockerRecords
}
$destination = Join-Path $PSScriptRoot 'repository-audit.json'
$audit | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $destination -Encoding utf8
$kubeRecords + $dockerRecords | ForEach-Object {
    [pscustomobject]@{Package=$_.Package; Version=$_.Version; Depends=$_.Depends; Conflicts=$_.Conflicts}
} | Format-List
Write-Output "Saved audit: $destination"
