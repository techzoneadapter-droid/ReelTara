# ReelTara — Android USB Live Preview (Windows)

Trong VS Code, chạy từ thư mục ReelTara:

```powershell
npm run android:usb
```

Lệnh chờ thiết bị USB, ưu tiên Vite tại `http://localhost:5188`. Nếu cổng bận,
tự thử các cổng tiếp theo đến 5199, không dừng tiến trình đang chiếm cổng.
Vite bind thành công trước khi chọn cổng, nên không có khoảng trống giữa kiểm
tra và sử dụng. Cùng cổng được dùng cho HMR, `adb reverse tcp:PORT tcp:PORT`
và URL Capacitor của APK debug; script build/cài khi cần và tự mở ứng dụng.
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
đồng thời trên cùng thư mục. Nếu toàn bộ 5188–5199 bận, script báo lỗi và giữ
nguyên các tiến trình hiện có. ADB reverse dùng `--no-rebind` khi tạo ánh xạ,
không ghi đè ánh xạ tới cổng khác của dự án khác. Cổng thực tế hiển thị trong
terminal và `.cache/android-usb/session.json` (không commit).
Đổi cổng làm thay đổi native config nên cần build/cài APK debug một lần;
các thay đổi React/CSS sau đó tiếp tục dùng HMR, không rebuild APK.
Lỗi Gradle/cài đặt trên thiết bị đang kết nối sẽ dừng thay vì lặp build liên tục.

## Debug và release

Debug dùng `com.reeltara.app.debug`, tách khỏi `com.reeltara.app` của release.
`usb-preview.gradle` tạo asset Capacitor riêng trong thư mục build cho **debug**,
có `server.url=http://localhost:PORT`, PORT trong 5188–5199. Gradle nhận cổng qua
`-PusbPreviewPort=PORT`; giá trị mặc định 5188. Manifest/network security debug chỉ cho
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
- 14 test dịch vụ và 8 test USB/fingerprint/chọn cổng: đạt. Test với Vite thật
  giữ một dịch vụ thử nghiệm trên 5188, xác nhận preview chuyển cổng và dịch vụ
  trên 5188 vẫn phản hồi bình thường.
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
  `http://localhost:5188/`. CSS HMR và React Fast Refresh đạt, không full reload,
  không rebuild APK; không có lỗi runtime trong probe.
- Trong lần thiết lập ban đầu, người dùng rút/cắm lại cáp USB: script phát hiện mất kết nối, tự khôi phục
  reverse, dùng lại APK cache, không cài lại và tự mở ReelTara. Đã kiểm chứng.
- Android mới hơn 9: chưa có thiết bị để kiểm chứng. Online API/trailer/playback
  production chưa kiểm chứng với backend triển khai; tablet đang hiển thị catalog
  dự phòng và thông báo API unavailable.

Kiểm tra lại APK sau build bằng `powershell -File scripts/check-android-apks.ps1`.
Hỗ trợ minSdk không thay thế kiểm thử thực tế trên thiết bị.

## Open catalog verification — 2026-10-13

Default discovery now uses Wikidata/TVmaze, without a TMDB token. Actual IN/PH API pages, current episode schedules and search were verified through the USB development backend. See `docs/OPEN_DATA_CATALOG.md`.

The active preview selected **5189** because 5188 was already occupied; the listener and reverse mapping on 5188 were preserved. On SM-T385K / Android 9 / API 28 / WebView 101, CSS HMR and React Fast Refresh passed without full reload, APK rebuild or runtime errors during the probe. The real YouTube Dune trailer reached `playing` in the Android WebView with controls outside the iframe. These results supersede the earlier fallback-only observation above. Newer Android devices and the deployed production backend have not been tested.

Final handoff recheck: the active preview subsequently returned to **5188**. After Capacitor sync restored its generated plugin build file and the development APK was aligned with that port, SM-T385K passed CSS HMR/React Refresh again without full reload or APK rebuild during the probe. The connected WebView showed live Wikidata/TVmaze metadata (73 open items at that refresh). Release APK/AAB isolation checks still passed. The earlier 5189 results remain historical verification, not the current port.

## Phase 2 measurement/build coordination

`npm run android:device:qa` records actual device startup/paint/navigation/pagination/scroll metrics and meminfo/gfxinfo/logcat under ignored `.cache/phase2/`. It restarts only ReelTara. See [Phase 2 release readiness](RELEASE_READINESS_PHASE2.md) for measurement limits and PASS/FAIL/BLOCKED results.

`npm run android:sync`, `npm run android:verify` and the native stage of `android:usb` now share a workspace build lock. This prevents concurrent Capacitor sync from deleting Gradle plugin intermediates. `android:verify` runs web build, sync, debug/release/AAB and native unit task sequentially. Do not run standalone Cap/Gradle writers against the same workspace while a coordinated build is active. Compile/target SDK are now 36; the release API base, signing and versionCode still require owner configuration/review.
