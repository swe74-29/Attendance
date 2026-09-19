# Margin: attendance tracker

One app, two shells:

- **Android** app, wrapped with Capacitor
- **Desktop** app (Windows, macOS, Linux), wrapped with Tauri

The whole app is one file: `www/index.html`. Edit it, rebuild, and both versions update.

## Easiest way to get the APK and the desktop installers (no installs)

GitHub builds everything for you.

1. Create a free account at github.com and make a new repository (private is fine).
2. Upload all the files from this folder to it (Add file > Upload files). Keep the folder structure,
   including the hidden `.github` folder. If the web uploader skips it, use GitHub Desktop or `git push`.
3. Open the **Actions** tab, choose **Build Margin (Android + desktop)**, click **Run workflow**.
4. Wait about 10 to 15 minutes. Open the finished run and download from **Artifacts**:
   - `margin-android-apk` contains `app-debug.apk`
   - `margin-desktop-windows-latest` contains the `.exe` installer and `.msi`
   - `margin-desktop-macos-latest` contains the `.dmg`
   - `margin-desktop-ubuntu-22.04` contains the `.deb` and `.AppImage`

## Installing

- **Android:** copy `app-debug.apk` to your phone and open it. Android will ask you to allow installs
  from that app (Files or Chrome). It is a debug build, so it is not from the Play Store.
- **Windows:** run the `-setup.exe`. Because the app is not code-signed, SmartScreen may say
  "Windows protected your PC". Choose More info, then Run anyway.
- **macOS:** open the `.dmg` and drag Margin to Applications. First launch: right-click the app, then Open.

## Building on your own computer instead

Needs Node 22 or newer.

**Desktop** (also install Rust from rustup.rs; on Windows also the "Desktop development with C++"
build tools; on Linux the packages listed in `.github/workflows/build.yml`):

    npm install
    npm run desktop:dev      # test in a window
    npm run desktop:build    # installers land in src-tauri/target/release/bundle/

**Android** (install Android Studio, which brings its own JDK and the Android SDK):

    npm install
    npm run android:add      # creates the android/ folder, first time only
    npm run android:icons    # optional: use the Margin icon
    npm run android:sync
    npm run android:open     # opens Android Studio, then Build > Build APK(s)

The APK ends up in `android/app/build/outputs/apk/debug/`. Or from the command line:
`npm run android:apk` (needs `ANDROID_HOME` set).

## Things to know

- **Your data is stored inside each app separately.** The Android app, the Windows app and the browser
  version do not share data. Use Semesters > Back up and move devices to copy data across.
  Clearing the Android app's storage erases its data, so back up before that.
- **Fonts:** the app loads two Google Fonts when online and falls back to system fonts offline. It works
  fully offline either way.
- **Google Play or a signed release:** this produces a debug APK. For the Play Store you need a signing
  key and `./gradlew bundleRelease`. See capacitorjs.com/docs/android/deploying-to-google-play.
- **Package versions:** if `npm install` complains about Capacitor versions, run
  `npm install @capacitor/core@latest @capacitor/android@latest @capacitor/cli@latest`.
