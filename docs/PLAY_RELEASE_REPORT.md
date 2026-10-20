# ReelTara — báo cáo chuẩn bị Google Play

Cập nhật: 20/10/2026, giờ Việt Nam. **Đang kiểm thử; chưa nộp Google Play, chưa phát hành Production.**

## Phạm vi và mã nguồn

- Đã đọc đầy đủ `docs/CODEX_RELEASE_2_4.md` trên `origin/main` tại `1d6b77b6ceeba5a3c0475e4f0adc15d574615f9e`.
- Nhánh làm việc: `release/play-testing-20261020`, checkout riêng `.cache/play-release`.
- Giữ nguyên nhánh `release/android-play-readiness` và các thay đổi cục bộ của chủ dự án.
- Commit build, workflow và artifact cuối cùng: sẽ cập nhật sau khi kiểm chứng build ký.

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
| AAB ký / jarsigner / bundletool | PENDING | Chỉ xuất artifact signed sau khi chữ ký và metadata đạt |

Khóa nằm ngoài Git tại `%LOCALAPPDATA%/ReelTara/Signing/reeltara-upload.jks`. Chủ sở hữu giữ bản sao ngoại tuyến và mật khẩu. Không đưa khóa, base64 hoặc mật khẩu vào source, chat, log hay artifact; chỉ lưu trong encrypted Actions Secrets theo yêu cầu. Script dùng stdin cho Secrets và environment riêng của tiến trình keytool, không truyền mật khẩu trong command line. Đã sửa lỗi stderr PowerShell 5.1 và đường dẫn Documents tiếng Việt.

Workflow kiểm tra package `vn.com.nvbtech.reeltara`, target SDK 36, versionCode bằng số lượt workflow, không debuggable; chạy `jarsigner -verify` và bundletool 1.18.3 có kiểm SHA-256. Chưa đối chiếu versionCode cao nhất hay upload certificate trong Play Console vì chưa truy cập Console.

## Bước 4 — API và website công khai

Bằng chứng gốc: `.cache/release/backend-audit.json`, tạo bằng `node scripts/release-audit.mjs`.

| Kiểm tra | Kết quả tại lần audit đầu |
| --- | --- |
| `/api/free-catalog?version=2` | HTTP 200, 60 mục; 57 mục không có hồ sơ rà soát trong registry; phản hồi cache thiếu CORS cho Android |
| `/api/tmdb?path=movie/popular&region=VN` | HTTP 503 `api_unavailable`; chưa chứng minh live discovery hoạt động |
| Trang ứng dụng, privacy, terms, support, Google Play | Đều HTTP 200 ở lần audit có lưu bằng chứng; một lần trước trang Google Play trả 503 tạm thời |
| Email công khai | `baovan597@gmail.com` xuất hiện trên các trang; chưa xác minh khả năng nhận thư |

Chủ sở hữu đã xác nhận có quyền sử dụng dữ liệu/ảnh TMDB phù hợp cho bản thử nghiệm và sẽ tự kiểm tra/cấu hình token server Vercel. Không yêu cầu hoặc đọc token. HTTP 503 chưa đủ kết luận nguyên nhân duy nhất là thiếu token.

Đã sửa CORS/caching trong code nhánh phát hành và chặn nguồn động chưa rà soát. Backend Production hiện tại chưa tự động nhận các sửa đổi từ nhánh này; phải audit lại sau triển khai. Client Android tự lọc danh mục cũ theo registry và không dựa vào cờ `verifiedLegal` do API gửi.

## Nội dung và quyền phát

- Chỉ cho phép đúng URL trong `src/data/freeSources.json`; gate áp dụng ở server, catalog client, nút phát, player và dữ liệu khôi phục từ localStorage.
- Archive/Commons động bị vô hiệu hóa trong bản phát hành. Metadata giấy phép của uploader không đủ cấp quyền. API không được suy diễn phim public domain theo quốc gia.
- Phim thương mại chỉ có thông tin, trailer qua YouTube và trang xem chính thức; không có nguồn full movie. Poster thương mại trong thư mục public chưa có hồ sơ riêng được thay bằng SVG do dự án tạo và loại khỏi output build.
- Bộ ba phim Blender có tuyên bố CC BY 3.0 tại nguồn chính thức, cần giữ attribution và toàn bộ credit roll. Xem hồ sơ chi tiết trong `MEDIA_RIGHTS_REVIEW.md`; tình trạng từng file mirror và thử phát phải được ghi riêng, không suy từ giấy phép tác phẩm.

## Kiểm thử và tài nguyên

| Kiểm tra | Trạng thái |
| --- | --- |
| Unit / API / quyền phát | 18/18 PASS, gồm regression Retry khôi phục URL bị loại bởi health cache |
| TypeScript / Vite | PASS trước đợt kiểm cuối |
| Browser Windows | Lượt đầu 16/20; sau sửa, cả 5 test video PASS. Tổng 20 kịch bản đã đạt qua hai lượt; không gọi đây là một lượt full-suite xanh duy nhất |
| Dependency native | Đã phát hiện GHSA-rvm3-566m-v7fv ở Capacitor 8.0.0; cập nhật cùng dòng 8 lên 8.5.3 |
| Native APK/AAB / native unit | Compile debug đạt; native unit Windows gặp ClassNotFound với đường dẫn Unicode. CI Linux chạy lại native unit trước khi xuất artifact |
| Android thực | Emulator Android 15 API 35 đã boot; kết quả app sẽ ghi tại `docs/qa/release/android-qa.json` |
| Icon / feature graphic | Đã tải và xem artifact run 39361262023; đúng 512×512 / 1024×500, tiếng Việt có dấu; logo gốc độ phân giải thấp cần chủ sở hữu đánh giá |
| Screenshot Google Play | Chờ chụp bằng ADB từ app đã cài; ảnh web hoặc ảnh giả không được tính |

Build cũ [39361262023](https://github.com/techzoneadapter-droid/ReelTara/actions/runs/39361262023) xanh nhưng **không có signed AAB**: log ghi bỏ qua ký vì chưa có Secrets. Không dùng build đó làm bằng chứng đã ký.

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
