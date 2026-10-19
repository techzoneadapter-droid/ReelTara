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
