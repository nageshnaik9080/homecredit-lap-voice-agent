@echo off
echo === Installing backend dependencies ===
cd backend
call npm install
echo.
echo === Installing frontend dependencies ===
cd ..\frontend
call npm install
echo.
echo === All done! ===
echo.
echo To start the app:
echo   1. Open a terminal, cd backend, run: npm run dev
echo   2. Open another terminal, cd frontend, run: npm run dev
echo   3. Open http://localhost:5173 in your browser
echo.
pause
