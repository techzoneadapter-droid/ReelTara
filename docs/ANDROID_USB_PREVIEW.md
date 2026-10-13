# ReelTara — Android USB Live Preview (Windows)

Trong VS Code, chạy từ thư mục ReelTara:

```powershell
npm run android:usb
```

Lệnh chờ thiết bị USB, chạy Vite tại `http://localhost:5173`, thiết lập
`adb reverse tcp:5173 tcp:5173`, build/cài APK debug khi cần và tự mở ứng dụng.
Giữ terminal chạy. Lưu React/TypeScript để Fast Refresh cập nhật; CSS dùng HMR.
Không build APK cho mỗi lần sửa web. Rút/cắm lại USB: script khôi phục forwarding
và mở lại ứng dụng, giữ dữ liệu của bản debug.

## Chỉ cần thao tác trên Android

1. Bật Developer options → USB debugging, cắm cáp có truyền dữ liệu.
2. Mở khóa, xác nhận **Allow USB debugging** cho laptop này.
3. Nếu hãng máy chặn cài qua USB, bật quyền cài qua USB và xác nhận cài APK.

Khi ADB báo `unauthorized`, script dừng với hướng dẫn; chạy lại sau khi xác nhận.
Nếu nhiều thiết bị USB, chọn bằng `$env:ANDROID_SERIAL='SERIAL'` rồi chạy lệnh.
Nếu không thấy thiết bị, kiểm tra cáp/chế độ USB và driver USB chính thức của hãng.
Emulator và ADB qua Wi-Fi không được tự chọn.

## Công cụ và lệnh bổ sung

- Node >=20; máy thiết lập dùng Node 24, npm 11, Capacitor 7.6.9, Vite 6.4.3.
- JDK **21** (Temurin), Android SDK API **35**, Build Tools **35.0.0**,
  Platform Tools/ADB, Android Studio; minSdk **23** bao gồm Android 9 (API 28).
- `ANDROID_HOME`: `%LOCALAPPDATA%\Android\Sdk`; `JAVA_HOME`: thư mục JDK 21.
  Thiết lập đã thêm Java/SDK tools vào PATH cấp người dùng. Terminal đang mở
  có thể chưa nhận PATH mới; script tự tìm SDK và JDK tại vị trí chuẩn.
- Nếu PowerShell báo `adb is not recognized`, chạy
  `powershell -NoProfile -File scripts/setup-adb-path.ps1`. Script dùng ADB đã
  cài, cập nhật PATH người dùng, thông báo môi trường cho Windows và bổ sung
  khối PATH vào profile PowerShell 5/7 mà giữ nội dung hiện có. Các phiên
  PowerShell mới nhận ADB kể cả khi VS Code vẫn giữ môi trường cũ. Thiết lập
  workspace `.vscode/settings.json` cũng thêm Platform-Tools cho terminal mới.
- `npm run android:debug`: build APK preview trước khi có thiết bị.
- `npm run android:usb:test`: kiểm tra chọn thiết bị và cơ chế tránh rebuild web.
- Khi preview đang chạy: `node scripts/check-android-hmr.mjs` kiểm tra HMR
  phía dev server; không thay thế kiểm chứng trên điện thoại.
- Với thiết bị đang chạy preview: `node scripts/check-android-device.mjs` kiểm
  chứng CSS/React trong WebView qua DevTools; probe tự gỡ và không đổi giao diện.
- `npm run android:sync`: build web và đồng bộ cấu hình production vào native.
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
- Cache build/cài: `.cache/android-usb/state.json`; cache không commit.

Script theo dõi source/config native, cấu hình Capacitor, phiên bản và mã Android
của plugin. Khi chúng thay đổi, tự sync/build/cài lại. Sau khi thêm plugin, chạy
`npm install` để cập nhật lockfile. Không chạy hai phiên preview hoặc build/sync
đồng thời trên cùng thư mục. Nếu cổng 5173 đang bị chiếm, script báo lỗi rõ ràng.
Lỗi Gradle/cài đặt trên thiết bị đang kết nối sẽ dừng thay vì lặp build liên tục.

## Debug và release

Debug dùng `com.reeltara.app.debug`, tách khỏi `com.reeltara.app` của release.
`usb-preview.gradle` tạo asset Capacitor riêng trong thư mục build cho **debug**,
có `server.url=http://localhost:5173`. Manifest/network security debug chỉ cho
HTTP tới localhost/127.0.0.1; mixed content vẫn tắt. Native logging thường xuyên
tắt; Vite, Gradle, ADB và lỗi script hiện ở terminal. Xem lỗi native khi cần:

```powershell
& "$env:ANDROID_HOME\platform-tools\adb.exe" logcat AndroidRuntime:E chromium:W '*:S'
```

Release dùng web assets đóng gói, cấu hình chính không có `server.url`, manifest
chính tắt cleartext và không tham chiếu network security debug. Không phát hành
APK debug: nó cần Vite đang chạy. Không có thao tác upload Google Play.

Preview ép API về `/api/*` trên backend Vite của laptop, kể cả khi `.env.local`
có `VITE_PUBLIC_API_BASE_URL`. `TMDB_READ_ACCESS_TOKEN` chỉ nằm trong môi trường
**server**; không dùng tiền tố `VITE_`, không đưa token vào native assets.
Release online cần `VITE_PUBLIC_API_BASE_URL=https://BACKEND-THAT-YOU-CONTROL`
khi build, với `/api/tmdb`, `/api/archive`, `/api/free-catalog`, `/api/playback`
và CORS cho `https://localhost`. Không cấu hình endpoint thật thì catalog dự
phòng vẫn có thể hiển thị; không coi đây là bằng chứng online API hoạt động.

## Nguồn chính thức

Android Studio/JDK cài bằng winget (`Google.AndroidStudio`,
`EclipseAdoptium.Temurin.21.JDK`). SDK command-line tools tải từ Google và xác minh
SHA-256 trên [Android downloads](https://developer.android.com/studio).
SDK packages cài bằng công cụ Google. Yêu cầu nền tảng theo
[Capacitor 7](https://capacitorjs.com/docs/updating/7-0).

## Kết quả kiểm chứng

Ngày 13/10/2026:

- TypeScript + production web build: đạt; Capacitor sync: đạt.
- 14 test dịch vụ và 3 test USB/fingerprint: đạt.
- Debug APK và release APK chưa ký: build thành công.
- Release AAB chưa ký: build thành công; assets không có URL/cleartext dev,
  không có network security debug; manifest của tác vụ bundle tắt cleartext.
- Kiểm tra APK thực tế: debug có URL localhost; release không có URL live,
  không có tài nguyên network security debug và `usesCleartextTraffic=false`.
- Chạy lại `android:debug`: dùng cache, bỏ qua build/sync.
- HMR qua WebSocket trên laptop: CSS cập nhật không full reload; React Refresh
  và backend cùng origin: đạt.
- Thiết bị thật: Samsung Galaxy Tab A (2017), SM-T385K, Android **9 / API 28**,
  WebView Chrome **101.0.4951.61**. APK cài/mở thành công, ReelTara hiển thị tại
  `http://localhost:5173/`. CSS HMR và React Fast Refresh đạt, không full reload,
  không rebuild APK; không có lỗi runtime trong probe.
- Người dùng rút/cắm lại cáp USB: script phát hiện mất kết nối, tự khôi phục
  reverse, dùng lại APK cache, không cài lại và tự mở ReelTara. Đã kiểm chứng.
- Android mới hơn 9: chưa có thiết bị để kiểm chứng. Online API/trailer/playback
  production chưa kiểm chứng với backend triển khai; tablet đang hiển thị catalog
  dự phòng và thông báo API unavailable.

Kiểm tra lại APK sau build bằng `powershell -File scripts/check-android-apks.ps1`.
Hỗ trợ minSdk không thay thế kiểm thử thực tế trên thiết bị.
