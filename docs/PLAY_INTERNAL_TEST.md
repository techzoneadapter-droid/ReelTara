# Hồ sơ thử nghiệm nội bộ ReelTara

Trạng thái: chuẩn bị; không phải bản nộp hay thông báo Google chấp thuận.

- Package dự kiến: `vn.com.nvbtech.reeltara` (chủ tài khoản đối chiếu trước upload).
- Track: Internal testing. Giá: miễn phí. Category đề xuất: Entertainment.
- Bundle đã kiểm: versionCode **23**, target SDK **36**, commit `bd1ea2004becde856800248240a6bd68c0f06ef0`; lấy đúng signed AAB và đối chiếu hash trong `PLAY_RELEASE_REPORT.md`. Nếu Console đã có versionCode >= 23 hoặc certificate khác, dừng upload và đối chiếu trước khi build lại.
- App access: không cần đăng nhập, không cần tài khoản thử nghiệm; Internet cần cho trailer/video và dữ liệu trực tuyến.
- Không có in-app purchase, đăng ký VIP, cloud account hoặc tính năng tải phim.
- Target audience: chưa chốt; thư viện có nội dung bạo lực/fantasy/khoa học viễn tưởng, không tự đánh dấu dành cho trẻ em.
- Content rating: chủ sở hữu trả lời IARC theo toàn bộ nội dung truy cập được, không chỉ ba phim miễn phí; Google/IARC cấp rating cuối.
- Ads declaration: không có SDK hoặc vị trí quảng cáo do ReelTara tích hợp; kiểm tra quảng cáo trong YouTube nhúng trước câu trả lời cuối.
- Tester: chủ sở hữu chọn nhóm người thật, ghi email/Google Group trong Console; không đưa thông tin cá nhân tester vào repository.
- Testing eligibility: thực hiện yêu cầu hiển thị cho đúng tài khoản Organization; không tự áp điều kiện dành cho loại tài khoản khác.

## Release notes vi-VN

```text
<vi-VN>
Bản thử nghiệm ReelTara: khám phá phim và trailer, mở nguồn xem chính thức, lưu danh sách yêu thích và tiếp tục xem phim nguồn mở đã rà soát. Bổ sung xóa dữ liệu cục bộ, nút Back Android và giới hạn nguồn phát theo hồ sơ quyền sử dụng.
</vi-VN>
```

Không quảng cáo tìm kiếm online là đã hoạt động khi TMDB API vẫn lỗi. Không mô tả các phim thương mại là được xem miễn phí toàn bộ.

## Kịch bản cho tester

1. Cài từ liên kết opt-in; kiểm tra tên/icon, mở app khi không nối máy dev.
2. Home → tìm kiếm/Discover → chi tiết; đổi VN/IN/PH và kiểm tra nguồn xem theo vùng.
3. Lưu một phim, đóng/mở lại; kiểm tra Watchlist. Hardware Back từ player → chi tiết → danh mục.
4. Xem trailer; kiểm tra lỗi và liên kết YouTube chính thức khi nhúng không được phép.
5. Xem từng phim được phép: bắt đầu, pause, seek, fullscreen, xoay, background/foreground, resume. Xem được cả credit roll.
6. Mất mạng, mạng chậm và chuyển Wi-Fi/4G; không crash, có thông báo và retry. Không phát được file chưa duyệt.
7. Profile → Clear local data; xác nhận Watchlist/lịch sử/tiến độ trống; mở privacy và support.
8. Ghi model, phiên bản Android, versionCode, mạng, các bước lỗi và ảnh thật. Không gửi dữ liệu đăng nhập/khóa ký.

Sau upload: chủ Console kiểm tra App integrity, cảnh báo 16-KB/native, permissions, Pre-launch report và thiết bị không tương thích. Chỉ gửi Internal testing khi các blocker trong `PLAY_RELEASE_REPORT.md` được xử lý hoặc đánh giá rõ cho phạm vi thử nghiệm.
