# Bằng chứng bản thử nghiệm 23

Ứng dụng: `bd1ea2004becde856800248240a6bd68c0f06ef0`. Các file ở đây không chứa credentials.

- `aab-verification.json`: metadata/chữ ký CI và kiểm tra hash/chữ ký độc lập ở Windows.
- `android-qa.json`: 12 checks PASS trên APK debug cùng commit, Android 15. Check liên kết ngoài chỉ xác minh app chuyển sang Chrome; Chrome còn ở màn hình First Run, không xác minh trang đích đã tải xong.
- `android-screenshots-qa.json`: lượt chụp riêng sau khi compositor vẽ xong. Dùng `store-assets-manifest.json` để chọn ảnh; các PNG khác là bằng chứng QA và có thể chứa banner fallback hoặc trễ một màn so với tên.
- `backend-audit.json`: API/website thật. TMDB còn 503 tại lần ghi; không coi live discovery đã đạt.
- `source-audit.json`: sáu file MP4, metadata/hash do Archive cung cấp, HTTP/range; sáu trailer từ kênh studio qua oEmbed.
- `credits/`: ảnh khung hình thật từ file phim ở hai vị trí cuối; không phải ảnh giao diện app hay ảnh upload listing, không phải kiểm từng frame/toàn bộ phim.

Ảnh Android được chụp từ app đã cài, không dùng fixture hoặc sửa pixel. Bộ được chọn có ba ảnh 1080×1920, icon 512×512 và feature graphic 1024×500 từ artifact CI. Chưa xác nhận Google chấp thuận listing, quyền thương hiệu riêng, Data Safety hoặc mọi thiết bị/vùng/mạng. Xem `../../PLAY_RELEASE_REPORT.md` và `../../PLAY_INTERNAL_TEST.md`.
