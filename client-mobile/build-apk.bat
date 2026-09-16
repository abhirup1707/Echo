@echo off
echo ========================================================
echo          Echo Music Mobile - APK Build Script
echo ========================================================
echo.
echo [1/3] Building Web Assets...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Syncing Native Android Files...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Capacitor sync failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Compiling Android APK via Gradle...
cd android
call gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [NOTICE] Gradle build requires JDK and Android SDK.
    echo If JAVA_HOME is not set, open the folder:
    echo   c:\Echo\client-mobile\android
    echo in Android Studio and click 'Build -> Build APK(s)'.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo SUCCESS! Your APK is ready:
echo client-mobile\android\app\build\outputs\apk\debug\app-debug.apk
echo ========================================================
pause
