' School-y Tunnel Launcher -- double-click to start
' Runs the server + Cloudflare tunnel, shows URL in a popup
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

ScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Download cloudflared if missing
cfPath = ScriptDir & "\cloudflared.exe"
If Not fso.FileExists(cfPath) Then
  WshShell.Popup "Downloading Cloudflare Tunnel tool (one-time, ~30 MB)..." & Chr(10) & "Click OK then wait.", 3, "School-y Setup", 64
  Dim xhr : Set xhr = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  xhr.Open "GET", "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe", False
  xhr.Send
  If xhr.Status = 200 Then
    Dim stream : Set stream = CreateObject("ADODB.Stream")
    stream.Type = 1
    stream.Open
    stream.Write xhr.ResponseBody
    stream.SaveToFile cfPath, 2
    stream.Close
  Else
    WshShell.Popup "Could not download cloudflared. Check your internet.", 0, "School-y Error", 16
    WScript.Quit
  End If
End If

' Install node_modules if missing
If Not fso.FolderExists(ScriptDir & "\node_modules") Then
  WshShell.Popup "Installing packages (first time only, ~1 minute)..." & Chr(10) & "Click OK then wait.", 3, "School-y Setup", 64
  WshShell.Run "cmd /c cd /d """ & ScriptDir & """ && npm install", 0, True
End If

' Start server
WshShell.Run "cmd /c cd /d """ & ScriptDir & """ && npm run dev > server.log 2>&1", 0, False
WScript.Sleep 4000

' Start tunnel in a visible window so user can see the URL
WshShell.Run "cmd /k cd /d """ & ScriptDir & """ && echo. && echo ================================================ && echo   COPY THE trycloudflare.com URL BELOW && echo   Share it with whoever needs to use School-y && echo ================================================ && echo. && cloudflared.exe tunnel --url http://localhost:5000", 1, False
