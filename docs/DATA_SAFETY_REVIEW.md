# ReelTara — Bản chuẩn bị khai Google Play Data Safety

**Không tự nộp biểu mẫu theo bản này mà chưa xác nhận qua network audit và chính sách riêng của nhà cung cấp.**

## Mã hiện có
- Không có form đăng nhập, cloud sync, AdMob hoặc thanh toán.
- Watchlist, lịch sử xem và tiến độ phát được lưu trong localStorage trên máy.
- Trình duyệt/Android tải dữ liệu hoặc video từ /api, TMDB, Internet Archive, Blender, Wikimedia Commons, YouTube và có thể mở các dịch vụ streaming chính thức bên ngoài.
- Các nhà cung cấp online có thể nhận địa chỉ IP, thông tin kết nối, cookie hoặc định danh theo chính sách của họ. Không thể khẳng định "không thu thập/chia sẻ dữ liệu" chỉ dựa trên việc không có SDK Ads.
- Lỗi và log hiện tại có thông tin URL nội dung và trạng thái phát tại máy; kiểm tra không vô tình gửi thông tin cá nhân về máy chủ.

## Người nộp Play Console xác minh
1. Chính xác nhà cung cấp nào có thể nhận dữ liệu người dùng trong bản build cuối cùng.
2. Dữ liệu và mục đích xử lý, cách truyền mã hóa, chính sách lưu giữ/xóa của nhà cung cấp.
3. App có sử dụng cookie, thiết bị định danh, analytics, quảng cáo ở bản build cuối không.
4. Có chính sách quyền riêng tư công khai và liên kết từ app.
5. Nếu tương lai có tài khoản, bắt buộc làm luồng xóa tài khoản/dữ liệu.

## Inventory cho bản thử nghiệm 20/10/2026

Đây là bản chuẩn bị cho chủ tài khoản, chưa phải biểu mẫu đã khai. Kiểm tra code không thay thế việc xác minh hợp đồng và lưu giữ log của dịch vụ.

| Dữ liệu / luồng | Nơi xử lý | Cách chuẩn bị câu trả lời |
| --- | --- | --- |
| Watchlist, lịch sử, tiến độ, vùng đã chọn | `reeltara-user-v1` trong localStorage | Lưu tại máy; xóa trong Profile. Không có endpoint đồng bộ tài khoản. Bản Android mới đặt `allowBackup=false`; dữ liệu vẫn có thể nằm trong bản backup cũ của bản trước |
| Từ khóa tìm kiếm, vùng, ID phim | API ReelTara/Vercel → TMDB khi online | Đánh giá **App activity / In-app search history**, mục đích App functionality. Log hạ tầng có thể giữ URL; chủ tài khoản xác minh retention, không tự khai ephemeral |
| IP, User-Agent và URL yêu cầu | Vercel, TMDB image CDN, media Archive/CDN, Google Fonts | Kiểm tra cách nhà cung cấp xử lý và suy ra vị trí từ IP. Không đồng nhất IP với AD_ID; không tự khai không có location/identifiers trước khi xác minh |
| Video/trailer được chọn và dữ liệu WebView | YouTube IFrame, media CDN | Đánh giá **App interactions**, **Device or other IDs**, location và purposes theo thông tin nhà cung cấp. YouTube có thể xử lý cookie/identifier hoặc quảng cáo dù app không có AdMob |
| Email hỗ trợ khi người dùng chủ động gửi | Ứng dụng email ngoài app / hộp thư công ty | App không có form gửi email, không đọc danh bạ hoặc email của thiết bị. Công ty xác nhận quy trình xử lý/xóa yêu cầu hỗ trợ |
| Log chẩn đoán phát video | console cục bộ: ID/tên phim, URL nguồn, trạng thái | Không thấy SDK gửi crash/analytics lên server. Log API/hạ tầng được đánh giá riêng |

Không có permission camera, mic, contacts, location hay Advertising ID được thêm bởi dự án. Đối chiếu lại merged manifest của artifact cuối. Không có tài khoản để khai account-deletion endpoint; liên kết support là yêu cầu hỗ trợ và xóa dữ liệu theo khả năng thực tế.

Chỉ chọn **encrypted in transit** sau khi kiểm HTTPS của API, media và các hop chuyển hướng. Chỉ dùng miễn trừ “service provider” hoặc “user initiated sharing” nếu đủ điều kiện trong [hướng dẫn chính thức](https://support.google.com/googleplay/android-developer/answer/10787469); không suy từ việc người dùng bấm nút. Chưa có bằng chứng độc lập về retention, mục đích quảng cáo/analytics của iframe hoặc các SDK phía nhà cung cấp để ký thay chủ tài khoản.

Bằng chứng mạng Android thật sẽ ghi trong `qa/release/android-qa.json`: chỉ hostname, path và loại tài nguyên, không header/cookie/token. Đây là mẫu các luồng được thực thi, không bảo đảm bao phủ mọi vùng/thiết bị/provider. Chủ tài khoản xác nhận câu trả lời cuối trước khi nộp.
