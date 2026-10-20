# Codex — ReelTara: hoàn thiện BƯỚC 2 & BƯỚC 4 (CH Play)

MỤC TIÊU: Build và kiểm chứng AAB đã ký bằng upload key của chủ sở hữu, hoàn thiện hồ sơ, kiểm thử và quy trình nộp thử lên Google Play. KHÔNG tự xuất bản Production, không nhận là đã được Google phê duyệt.

Dữ kiện:
Git: https://github.com/techzoneadapter-droid/ReelTara
Web/API: https://reel-tara.vercel.app
Ứng dụng: https://nvbtech.com.vn/apps/reeltara/
Privacy: https://nvbtech.com.vn/apps/reeltara/privacy.html
Điều khoản: https://nvbtech.com.vn/apps/reeltara/terms.html
Hỗ trợ/xóa dữ liệu: https://nvbtech.com.vn/apps/reeltara/support.html
Giới thiệu Play: https://nvbtech.com.vn/apps/reeltara/google-play.html
Android: Capacitor 8, target API 36, package ID dự kiến vn.com.nvbtech.reeltara.
Chủ sở hữu nói tài khoản Play Console Organization đã hoàn tất.
**TARGET MARKETS: INDIA (IN) + PHILIPPINES (PH) ONLY. No Vietnam (VN) release.** Android region selection and server-side TMDB watch_region must only use IN/PH. Google Play Console country availability must be set to India and Philippines (by the owner); use English Play listings for the two countries.

PHẦN A — ĐỒNG BỘ VÀ KIỂM THỬ:
- Nếu đã có repo ở máy: kiểm tra git status. Nếu clean, git fetch và git pull --ff-only origin main. Nếu chưa có repo thì clone. Tuyệt đối không xóa sửa local user changes.
- Đọc README, docs/ANDROID_RELEASE.md, docs/RELEASE_QA.md, scripts/prepare_release_windows.ps1, workflow android-build.yml.
- npm ci, npm test, npm run build; xem log build GitHub Actions mới nhất.
- Kiểm thử ba endpoint /api/free-catalog?version=2, /api/tmdb?path=movie/popular&region=IN và /api/tmdb?path=movie/popular&region=PH tại reel-tara.vercel.app. **Chỉ nhắm thị trường India/Philippines, không dùng VN**. Nếu thiếu TMDB token, yêu cầu chủ tài khoản tự đặt TMDB_READ_ACCESS_TOKEN trên server Vercel, không lấy token vào chat/ghi log.

PHẦN B — BƯỚC 2 (KÝ BUNDLE ANDROID):
- Xác minh Android Studio, JDK 21, keytool, GitHub CLI, SDK 36 ở Windows. Hỏi chủ sở hữu trước khi cài đặt hoặc tạo khóa.
- Kiểm tra có upload keystore .jks cũ không. Nếu có, dùng lại; không đổi upload key sau khi app đã được cấp trên Play.
- Chỉ khi chủ sở hữu đồng ý, chạy/review scripts/prepare_release_windows.ps1, giúp họ tự nhập password ngay trên máy để thiết lập ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD qua gh secret set.
- Không hiện mật khẩu, nội dung keystore, base64, service account, TMDB token trong chat, terminal log, Git commits hoặc artifact.
- Cài REELTARA_API_ORIGIN=https://reel-tara.vercel.app (public repo variable) nếu endpoint đã được xác minh.
- Chạy GitHub Actions Android, xác minh release AAB signed thực sự: Gradle signing, jarsigner -verify và metadata (applicationId, targetSDK, versionCode). Giữ backup khóa offline cho chủ sở hữu.

PHẦN C — BƯỚC 4 (HỒ SƠ CH PLAY):
- Kiểm tra website các trang giới thiệu, privacy, terms, support và email công ty mở public bình thường.
- Lấy icon 512x512 / feature graphic 1024x500 từ artifact reeltara-play-store-assets, kiểm tra chất lượng.
- Chụp ảnh màn hình THẬT từ app chạy trên Android bằng ADB; không tự tạo screenshot giả.
- Test app trên điện thoại hoặc emulator có thật: điều hướng, Android Back, xoay, offline, Wi-Fi/4G, trailer nhúng, điều hướng nguồn chính thức, phim miễn phí hợp lệ, lưu tiến độ và xóa dữ liệu.
- Rà soát tất cả video có thể phát: chỉ nguồn hợp pháp có giấy phép phù hợp. Phim thương mại không được stream full, chỉ trailer và link hợp pháp. Video miễn phí không mặc nhiên là miễn bản quyền; cần bằng chứng nguồn, giấy phép, attribution. Nguồn chưa xác minh phải bị vô hiệu hóa khi phát hành.
- Xác định Data Safety thực tế từ code và lưu lượng mạng, kể cả YouTube, TMDB, Vercel, trình duyệt/thiết bị. Không tuyên bố không thu thập/chia sẻ khi chưa xác minh.
- Chuẩn bị mô tả Play Store, release notes, phân loại độ tuổi, target audience, yêu cầu app access, ads declaration, và mọi policy dựa vào tính năng của build cuối.
- Nếu có Google Play Developer API đã được cấp quyền bởi chủ tài khoản, có thể tạo internal testing draft khi chủ sở hữu phê duyệt. Không làm tắt 2FA, không bỏ qua xét duyệt, không push Production ngoài yêu cầu.

KẾT QUẢ BẮT BUỘC:
- Sửa mọi lỗi thật được tái hiện, thêm test phù hợp; không sửa khác chức năng không liên quan.
- Ghi docs/PLAY_RELEASE_REPORT.md: PASS/FAIL, AAB có ký hay chưa, workflow URL, commit SHA, API tình trạng, test thiết bị, Data Safety, các vướng mắc pháp lý và từng bước chỉ chủ Play Console mới làm được.
- Đẩy code đã kiểm thử lên GitHub; đưa link commit, build artifact và danh sách blocker. Không khẳng định đã xuất bản khi Google chưa duyệt.
