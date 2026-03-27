Option Explicit

Dim WShell, FSO, ScriptDir, LogFile

Set WShell = CreateObject("WScript.Shell")
Set FSO    = CreateObject("Scripting.FileSystemObject")

' Get the folder this script lives in
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WShell.CurrentDirectory = ScriptDir
LogFile = ScriptDir & "\server.log"

' ── Check Node.js ──────────────────────────────────────────────────────────
Dim NodeCheck
NodeCheck = WShell.Run("cmd /c node -v > """ & LogFile & """ 2>&1", 0, True)
If NodeCheck <> 0 Then
    MsgBox "Node.js is not installed." & vbCrLf & vbCrLf & _
           "Please install it from https://nodejs.org" & vbCrLf & _
           "(Download the LTS version, run the installer, then double-click School-y.vbs again.)", _
           vbCritical, "School-y"
    WShell.Run "https://nodejs.org", 1, False
    WScript.Quit
End If

' ── Install dependencies if node_modules is missing ─────────────────────────
If Not FSO.FolderExists(ScriptDir & "\node_modules") Then
    ' Show a non-blocking info box while installing
    Dim InstallMsg
    Set InstallMsg = CreateObject("WScript.Shell")
    WShell.Run "cmd /c npm install > """ & LogFile & """ 2>&1", 0, True
End If

' ── Start the server (completely hidden, no window) ─────────────────────────
' Write a tiny launcher batch so we can kill it cleanly
Dim BatchFile
BatchFile = ScriptDir & "\__schooly_run.bat"

Dim FH
Set FH = FSO.CreateTextFile(BatchFile, True)
FH.WriteLine "@echo off"
FH.WriteLine "cd /d """ & ScriptDir & """"
FH.WriteLine "set NODE_ENV=development"
FH.WriteLine "npx tsx server/index-dev.ts >> """ & LogFile & """ 2>&1"
FH.Close

' Run the batch completely hidden (window style 0 = invisible)
WShell.Run "cmd /c """ & BatchFile & """", 0, False

' ── Wait for the server to start, then open browser ─────────────────────────
Dim Attempts, Ready, Http
Attempts = 0
Ready    = False

Set Http = CreateObject("MSXML2.XMLHTTP")

Do While Attempts < 20 And Not Ready
    WScript.Sleep 1000
    Attempts = Attempts + 1
    On Error Resume Next
    Http.Open "GET", "http://localhost:5000/api/auth/me", False
    Http.Send
    If Err.Number = 0 And Http.Status > 0 Then
        Ready = True
    End If
    Err.Clear
    On Error GoTo 0
Loop

' Open the browser
WShell.Run "http://localhost:5000", 1, False

' Clean up temp batch
On Error Resume Next
FSO.DeleteFile BatchFile
On Error GoTo 0
