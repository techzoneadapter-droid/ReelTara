# Checklist kiểm thử xuất bản ReelTara

## Gate 1 — kỹ thuật
- [ ] GitHub Android workflow xanh: npm unit tests, TypeScript/Vite build, debug APK.
- [ ] Artifact signed AAB tồn tại, keystore không nằm trong repo; Play App Signing kích hoạt.
- [ ] targetSdk >= 36; package ID ổn định; versionCode tăng cho lần cập nhật.
- [ ] Nền tảng Android khởi động được không cần máy dev; logo/launcher/splash đúng thương hiệu.
- [ ] App không yêu cầu quyền không cần thiết; chỉ HTTPS với API được tin cậy.
- [ ] Privacy Policy public URL khả dụng và xuất hiện trong app.
- [ ] Không có quảng cáo, thanh toán hoặc đăng nhập chưa hoàn thiện trong bản phát hành.

## Gate 2 — kiểm thử điện thoại thật
- [ ] Điện thoại Android 12, 14, 16: mở/đóng, foreground/background, nút Back.
- [ ] Ảnh và banner không bị vỡ, chạm được mọi nút trên màn hình nhỏ.
- [ ] Kết nối Internet không có backend: danh mục dự phòng và thông báo lỗi rõ ràng.
- [ ] Có backend: tìm phim, chuyển India (IN) / Philippines (PH), metadata và nơi xem hợp pháp đúng từng quốc gia; đảm bảo không có lựa chọn VN.
- [ ] Video nguồn hợp pháp: bắt đầu phát, seek, tạm dừng, tiếp tục, toàn màn hình, xoay ngang.
- [ ] Thử nguồn 403/429, mất mạng, chuyển Wi-Fi sang 4G, mở app lại.
- [ ] Kiểm tra không tải hoặc rehost phim thương mại.
- [ ] Kiểm tra trên báo cáo lỗi pre-launch Play Console.

## Gate 3 — pháp lý/vận hành
- [ ] Bằng chứng quyền sử dụng danh mục phát và artwork.
- [ ] Thỏa thuận dữ liệu TMDB phù hợp với việc khai thác thực tế.
- [ ] Data Safety phản ánh các kết nối TMDB/YouTube/Archive và máy chủ ứng dụng.
- [ ] Privacy Policy do công ty duyệt và có phương thức liên hệ.
- [ ] Play Store listing ảnh/video/mô tả là đúng.
- [ ] Hoàn thành Closed Test nếu Play Console bắt buộc.
- [ ] Google chấp thuận review; không thể tự xác nhận trước.
