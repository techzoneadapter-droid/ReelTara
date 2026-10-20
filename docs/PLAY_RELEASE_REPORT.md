# ReelTara — báo cáo chuẩn bị Google Play

Cập nhật: 20/10/2026, giờ Việt Nam. **AAB đã ký và kiểm chứng; còn blocker API/cấu hình Console trước khi gửi kiểm thử. Chưa nộp Google Play, chưa phát hành Production.**

## Phạm vi và mã nguồn

- Đã đọc đầy đủ `docs/CODEX_RELEASE_2_4.md` trên `origin/main` tại `1d6b77b6ceeba5a3c0475e4f0adc15d574615f9e`.
- Nhánh làm việc: `release/play-testing-20261020`, checkout riêng `.cache/play-release`.
- Giữ nguyên nhánh `release/android-play-readiness` và các thay đổi cục bộ của chủ dự án.
- Commit ứng dụng đã build: [`bd1ea2004becde856800248240a6bd68c0f06ef0`](https://github.com/techzoneadapter-droid/ReelTara/commit/bd1ea2004becde856800248240a6bd68c0f06ef0). Thay đổi sau commit này chỉ hoàn thiện công cụ QA, tài liệu và bằng chứng; không thay nội dung AAB này.
- Workflow thành công: [39389054452](https://github.com/techzoneadapter-droid/ReelTara/actions/runs/39389054452).

## Bước 2 — ký Android

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| JDK 21, keytool, Android SDK 36 | PASS | Temurin 21.0.12.1+1, SDK `D:/Android/Sdk` |
| Android Studio | Chưa có | CLI/JDK/SDK đủ cho build; không tự cài Android Studio |
| GitHub CLI portable | PASS | Bản chính thức 2.102.0; chủ tài khoản tự đăng nhập |
| Khóa upload | PASS | Không tìm thấy upload key cũ tại các vị trí đã kiểm tra; chủ sở hữu đồng ý và tự nhập mật khẩu tạo khóa mới |
| Kiểm tra khóa/mật khẩu | PASS | `keytool -certreq` kiểm tra đúng mật khẩu kho và private key trước khi cài Secrets |
| Bốn Actions Secrets | PASS | Đã kiểm tra tên, không đọc giá trị; cấu hình lúc 10:46–10:47 ngày 20/10 |
| API origin public | PASS | `REELTARA_API_ORIGIN=https://reel-tara.vercel.app` |
| AAB ký / jarsigner / bundletool | PASS | Gradle release signing, jarsigner và bundletool validate trên CI; kiểm độc lập lại chữ ký và SHA-256 khi tải về Windows |

Khóa nằm ngoài Git tại `%LOCALAPPDATA%/ReelTara/Signing/reeltara-upload.jks`. Chủ sở hữu giữ bản sao ngoại tuyến và mật khẩu. Không đưa khóa, base64 hoặc mật khẩu vào source, chat, log hay artifact; chỉ lưu trong encrypted Actions Secrets theo yêu cầu. Script dùng stdin cho Secrets và environment riêng của tiến trình keytool, không truyền mật khẩu trong command line. Đã sửa lỗi stderr PowerShell 5.1 và đường dẫn Documents tiếng Việt.

Workflow kiểm tra package `vn.com.nvbtech.reeltara`, target SDK 36, versionCode bằng số lượt workflow, không debuggable; chạy `jarsigner -verify` và bundletool 1.18.3 có kiểm SHA-256. Chưa đối chiếu versionCode cao nhất hay upload certificate trong Play Console vì chưa truy cập Console.

### Artifact đã xác minh

| Artifact | Giá trị / liên kết |
| --- | --- |
| Release AAB | [reeltara-signed-release-aab](https://github.com/techzoneadapter-droid/ReelTara/actions/runs/39389054452/artifacts/12248503451) |
| Package / versionCode / target | `vn.com.nvbtech.reeltara` / **23** / **36**, `debuggable=false` |
| SHA-256 AAB | `19872e2f679ace4637884f42648d65aba09681b29e13758938870e3b65525032` |
| SHA-256 upload certificate (công khai) | `F1:DB:83:A1:CA:EB:BD:23:0C:12:BD:03:50:2A:A9:02:DD:F2:86:6C:6D:56:4D:3B:09:07:04:E9:08:44:7E:B9` |
| Debug APK dùng cho QA | [reeltara-debug-apk](https://github.com/techzoneadapter-droid/ReelTara/actions/runs/39389054452/artifacts/12249131865), cùng commit; package có hậu tố `.debug` |
| Icon / feature graphic | [reeltara-play-store-assets](https://github.com/techzoneadapter-droid/ReelTara/actions/runs/39389054452/artifacts/12248488387) |
| Bằng chứng | [qa/release/aab-verification.json](qa/release/aab-verification.json) |

Gói bàn giao cục bộ: `release-evidence/ReelTara-Internal-v23.zip` trong checkout `.cache/play-release`. Chỉ chứa AAB công khai đã ký, tài nguyên, hồ sơ và bằng chứng; manifest ghi hash từng file. Không chứa keystore, mật khẩu, token hoặc `.env`. Đây là gói chuẩn bị để chủ tài khoản review/upload sau khi xử lý blocker, không phải bản đã nộp.

AAB không chứa thư viện `.so` của ứng dụng, file khóa ký, `.env` hay các ảnh thương mại đã loại khỏi output. Chưa dùng điều này để khẳng định Play App Integrity/16-KB đã được Google duyệt. AAB/APK Actions lưu 14 ngày; tải bản lưu trước khi artifact hết hạn. Bản QA là debug APK cùng nguồn, chưa phải APK do Play tạo/ký lại từ AAB; phải kiểm bản phân phối từ Play sau upload.

## Bước 4 — API và website công khai

Bằng chứng gốc: [qa/release/backend-audit.json](qa/release/backend-audit.json), tạo bằng `node scripts/release-audit.mjs`.

| Kiểm tra | Kết quả audit 20/10/2026 |
| --- | --- |
| `/api/free-catalog?version=2` | HTTP 200, 60 mục; 57 mục không có hồ sơ rà soát trong registry. Lần cuối có CORS `https://localhost`; lần đầu cache thiếu CORS |
| `/api/tmdb?path=movie/popular&region=VN` | HTTP 503 `api_unavailable`; chưa chứng minh live discovery hoạt động |
| Trang ứng dụng, privacy, terms, support, Google Play | Đều HTTP 200 ở lần audit có lưu bằng chứng; một lần trước trang Google Play trả 503 tạm thời |
| Email công khai | `baovan597@gmail.com` xuất hiện trên các trang; chưa xác minh khả năng nhận thư |

Chủ sở hữu đã xác nhận có quyền sử dụng dữ liệu/ảnh TMDB phù hợp cho bản thử nghiệm; sau đó xác nhận **chưa đặt token**. Đã hướng dẫn tự cấu hình `TMDB_READ_ACCESS_TOKEN` server-side rồi redeploy. Không yêu cầu hoặc đọc token. Connector Vercel liệt kê được project nhưng trả 404 khi đọc danh sách env (bằng tên và ID) và 403 khi đọc deployments; không có Vercel CLI sẵn để fallback. Chưa tự triển khai/promote backend Production.

Chẩn đoán máy Windows: DNS Wi-Fi qua router trả `127.0.0.1` cho `themoviedb.org`, `www.themoviedb.org`, `api.themoviedb.org`, trong khi Google DNS-over-HTTPS trả địa chỉ public; không có dòng TMDB trong hosts. Đã hướng dẫn chủ sở hữu thử Chrome Secure DNS hoặc mạng di động; không sửa DNS Windows. Đây là lỗi truy cập trang TMDB ở máy, tách biệt với việc server Vercel thiếu token.

Đã sửa CORS/caching trong code nhánh phát hành và chặn nguồn động chưa rà soát. Backend Production hiện tại chưa tự động nhận các sửa đổi từ nhánh này; phải audit lại sau triển khai. Client Android tự lọc danh mục cũ theo registry và không dựa vào cờ `verifiedLegal` do API gửi.

## Nội dung và quyền phát

- Chỉ cho phép đúng URL trong `src/data/freeSources.json`; gate áp dụng ở server, catalog client, nút phát, player và dữ liệu khôi phục từ localStorage.
- Archive/Commons động bị vô hiệu hóa trong bản phát hành. Metadata giấy phép của uploader không đủ cấp quyền. API không được suy diễn phim public domain theo quốc gia.
- Phim thương mại chỉ có thông tin, trailer qua YouTube và trang xem chính thức; không có nguồn full movie. Poster thương mại trong thư mục public chưa có hồ sơ riêng được thay bằng SVG do dự án tạo và loại khỏi output build.
- Bộ ba phim Blender có tuyên bố CC BY 3.0 tại nguồn chính thức, cần giữ attribution và toàn bộ credit roll. Đã đối chiếu sáu URL với metadata/hash của từng file, HTTP 206/MP4/range và khung hình credit thật; không cắt credit hay rehost. Xem [MEDIA_RIGHTS_REVIEW.md](MEDIA_RIGHTS_REVIEW.md), [source-audit.json](qa/release/source-audit.json) và [credit-audit.json](qa/release/credits/credit-audit.json). Khung hình lấy mẫu không phải kiểm toàn bộ từng frame hay xác nhận quyền thương hiệu.

## Kiểm thử và tài nguyên

| Kiểm tra | Trạng thái |
| --- | --- |
| Unit / API / quyền phát | 18/18 PASS, gồm regression Retry khôi phục URL bị loại bởi health cache |
| TypeScript / Vite | PASS tại commit ứng dụng đã build trên CI |
| Browser Windows | Lượt đầu 16/20; sau sửa, cả 5 test video PASS. Tổng 20 kịch bản đã đạt qua hai lượt; không gọi đây là một lượt full-suite xanh duy nhất |
| Dependency native | Đã phát hiện GHSA-rvm3-566m-v7fv ở Capacitor 8.0.0; cập nhật cùng dòng 8 lên 8.5.3 |
| Native APK/AAB / native unit | PASS CI Linux. Native unit Windows gặp ClassNotFound với đường dẫn Unicode; không dùng lỗi môi trường đó thay kết quả CI |
| Android thực | Lượt cuối **12/12 PASS**, Android 15/API 35, WebView 124; APK CI cài thật, live network. [android-qa.json](qa/release/android-qa.json), hoàn tất `2026-10-20T13:25:31Z`; xem giới hạn chuyển sang browser bên dưới |
| Icon / feature graphic | Đã tải artifact đúng run build ký; 512×512 / 1024×500, tiếng Việt có dấu; logo gốc độ phân giải thấp cần chủ sở hữu đánh giá |
| Screenshot Google Play | PNG gốc từ `adb exec-out screencap -p`, 1080×1920; chọn ảnh theo manifest và xem lại trước upload. Không dùng ảnh credit-audit hay ảnh web làm screenshot Android |

Build cũ [39361262023](https://github.com/techzoneadapter-droid/ReelTara/actions/runs/39361262023) xanh nhưng **không có signed AAB**: log ghi bỏ qua ký vì chưa có Secrets. Không dùng build đó làm bằng chứng đã ký.

Các lượt Android đầu bị gián đoạn hoặc gặp hộp thoại ANR của Digital Wellbeing/System UI trong emulator. Công cụ CDP đã sửa việc serialize DOM, không bấm nút đang disabled, và xác nhận dialog native khi xóa dữ liệu. Video CDN từng timeout 10 giây; lần chạy sau kiểm trạng thái `readyState` và thao tác Retry thật. Bằng chứng có ghi số Retry, không biến lỗi mạng thành xác nhận ổn định trên mọi thiết bị. Wi-Fi/4G thực, Android 12/14/16, background/foreground và bản do Play phân phối còn cần kiểm.

Lượt cuối: Bunny phát từ fallback MP4, duration 596.417 giây, tua tới 37.58 giây; mở lại resume 37.59 giây trên nguồn primary. Không có lỗi video/exception runtime ở lượt này. Trailer Dune phát qua iframe YouTube chính thức (Warner Bros), không tải/rehost. Xoay 732×364 CSS pixels; offline dùng DevTools trên WebView cài thật, không gọi là chuyển Wi-Fi/4G.

Liên kết Apple TV từ app mở **Chrome FirstRunActivity**: PASS cho việc handoff sang browser, **chưa xác nhận trang Apple TV tải xong/khả dụng tại VN**. URL là catalog search, không cam kết phim có sẵn hay người dùng có quyền xem. Chủ tester hoàn tất thiết lập browser và kiểm trang đích. Không coi việc iframe đang phát là bằng chứng mọi trailer/vùng đều nhúng được.

Đã chụp lại riêng Home/Free/chi tiết sau hai animation frames và chờ compositor Android; [android-screenshots-qa.json](qa/release/android-screenshots-qa.json) lưu lượt chụp riêng. Ảnh cũ có thể trễ một màn so với tên file, vì vậy danh sách chọn upload nằm trong [manifest tài nguyên](qa/release/store-assets-manifest.json), không chọn theo tên một cách tự động. Các banner API fallback vẫn hiện trung thực; nên chụp lại sau khi API live đã được xác minh nếu dùng cho listing cuối.

## Hồ sơ Play và Data Safety

Xem `DATA_SAFETY_REVIEW.md`, `PLAY_STORE_LISTING_VI.md` và `PLAY_INTERNAL_TEST.md`. Bản khai cần bao gồm API/Vercel, metadata/ảnh TMDB, YouTube IFrame, media CDN/Archive, Google Fonts và liên kết ngoài. Watchlist/lịch sử/tiến độ ở localStorage; bản native mới tắt backup. Không khai “không thu thập/chia sẻ” chỉ vì không có Ads SDK. Không có tài khoản, Play Billing, AdMob hay SDK analytics trong bản này. Quảng cáo do YouTube cung cấp cần được đánh giá riêng.

## Các bước chỉ chủ sở hữu/Play Console hoàn tất

1. Sao lưu upload key ngoại tuyến; xác nhận package và versionCode/certificate nếu ứng dụng đã tồn tại trên Play.
2. Hoàn tất token/backend và kiểm chứng lại live API; duyệt quyền từng file mirror, artwork và phạm vi TMDB đã xác nhận.
3. Duyệt chính sách, email hỗ trợ, retention/log của Vercel/nhà cung cấp và câu trả lời Data Safety; không ký thay chủ tài khoản.
4. Tạo/chọn app, bật Play App Signing, tải đúng AAB đã kiểm chữ ký lên Internal testing, chọn tester thật và lưu đường dẫn opt-in.
5. Hoàn tất App access, Ads, Content rating/IARC, Target audience và Store listing; không tự cấp rating hoặc tuyên bố dành cho trẻ em.
6. Kiểm tra bản phân phối từ Play, Pre-launch report, Wi-Fi/4G trên thiết bị thật và các phiên bản Android chưa có trong kiểm thử; đáp ứng điều kiện testing đúng theo Console.

Chưa có quyền Google Play Developer API và không tạo Internal testing draft tự động. Không có yêu cầu bỏ qua 2FA hoặc tự phát hành Production.
