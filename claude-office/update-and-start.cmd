@echo off
rem Habitower: get the latest from GitHub, then start the tower.
rem   1. git pull the app (habitower)          2. send your edits (user.json), then pull your own course (data\private)
rem   3. stop a tower that is already running (so a new server.js takes effect)
rem   4. start the server and open http://localhost:7777
setlocal
cd /d "%~dp0"

where git >nul 2>nul || (echo [!] Git is not installed: https://git-scm.com/download/win & goto start)

echo == Updating the app ==
git -C .. pull --ff-only || echo [!] The app could not update ^(see the message above^). Starting the version you have.

echo.
echo == Updating your course (data\private) ==
if exist "data\private\.git" (
  rem first send this device's edits (user.json) that are not on GitHub yet, then take the other devices'
  git -C data\private add user.json 2>nul
  git -C data\private commit -q -m "My edits from Habitower (%COMPUTERNAME%)" >nul 2>nul
  git -C data\private pull --rebase --autostash || (git -C data\private rebase --abort 2>nul & echo [!] Your edits and another device's changed at the same time. Yours are kept here; tell Claude to merge them.)
  git -C data\private push -q || echo [!] Your edits could not be sent to GitHub ^(see above^).
) else if exist "data\private" (
  rem the files are there but not linked to the private repo: keep them as a backup, then link
  set "BK=data\private-backup-%RANDOM%"
  call move "data\private" "%%BK%%" >nul
  git clone https://github.com/youngsoochoy-lang/habitower-private data\private && call echo    Linked. Your old files are kept in %%BK%%
  if not exist "data\private" call move "%%BK%%" "data\private" >nul
) else (
  git clone https://github.com/youngsoochoy-lang/habitower-private data\private
)

:start
echo.
echo == Starting the tower ==
where node >nul 2>nul || (echo [!] Node.js is not installed: https://nodejs.org & pause & exit /b 1)
rem a tower that is already running keeps the old server.js: stop it (only a node process on port 7777)
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 7777 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; if ($p -and $p.ProcessName -eq 'node') { Stop-Process -Id $p.Id; Write-Host '   Stopped the tower that was running.' } }"
start "" http://localhost:7777
echo    Habitower is open at http://localhost:7777  ^(close this window to stop it^)
node server.js
pause
