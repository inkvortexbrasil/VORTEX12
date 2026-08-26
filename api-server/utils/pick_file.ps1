param(
    [string]$Type = "video",
    [string]$Title = "Selecione o Arquivo"
)

Add-Type -AssemblyName System.Windows.Forms

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.Width = 1
$form.Height = 1
$form.StartPosition = "CenterScreen"
$form.WindowState = "Minimized"
$form.Show()
$form.Activate()

if ($Type -eq "folder") {
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = $Title
    $dialog.ShowNewFolderButton = $false
    if ($dialog.ShowDialog($form) -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-Output $dialog.SelectedPath
    }
} else {
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = $Title
    $dialog.RestoreDirectory = $true
    if ($Type -eq "video") {
        $dialog.Filter = "Arquivos de Vídeo (*.mp4;*.mkv;*.webm;*.mov;*.avi)|*.mp4;*.mkv;*.webm;*.mov;*.avi|Todos os Arquivos (*.*)|*.*"
    } elseif ($Type -eq "audio") {
        $dialog.Filter = "Arquivos de Áudio (*.opus;*.m4a;*.mp3;*.wav;*.aac;*.ogg;*.flac)|*.opus;*.m4a;*.mp3;*.wav;*.aac;*.ogg;*.flac|Todos os Arquivos (*.*)|*.*"
    } else {
        $dialog.Filter = "Todos os Arquivos (*.*)|*.*"
    }
    if ($dialog.ShowDialog($form) -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-Output $dialog.FileName
    }
}

$form.Dispose()
