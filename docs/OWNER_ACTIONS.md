## 20/10/2026 — Chính sách đã triển khai
- Đã đặt chính sách quyền riêng tư ReelTara trên website công ty tại **https://nvbtech.com.vn/reeltara/privacy.html**.
- Repo website NVB Tech có GitHub Pages, đợt triển khai chính sách thành công. Chủ dự án cần mở link ở trình duyệt không đăng nhập và xác nhận email liên hệ.
- Không cần bật GitHub Pages ở repository ReelTara nữa.
- Vercel từ kết nối này trả 403 khi tạo project; công cụ không thể cấu hình backend thay bạn trên tài khoản hiện tại.

# ReelTara — CHỈ CÁC BƯỚC CHỦ SỞ HỮU PHẢI LÀM

> Các bước dưới đây đòi hỏi xác minh danh tính, xác nhận quyền nội dung, hoặc bí mật cá nhân. Không đăng mật khẩu/token/khóa ký vào GitHub, email hay tin nhắn. Báo khi từng bước hoàn tất để kiểm tra lại.

## A. Google Play Console — bắt buộc
1. Vào https://play.google.com/console, xác minh tên pháp nhân **CÔNG TY TNHH CÔNG NGHỆ VÀ DỊCH VỤ NVB** và trạng thái tài khoản **Organization** (không chỉ là hồ sơ thanh toán doanh nghiệp).
2. Chốt package ID cho ReelTara: đề xuất `vn.com.nvbtech.reeltara`. Nếu đã tạo ứng dụng khác cùng tên trong Play Console, xác minh chưa dùng package ID này cho ứng dụng khác trước khi phát hành.
3. Xác nhận email liên hệ công khai `baovan597@gmail.com` và trang chính sách `https://nvbtech.com.vn/reeltara/privacy.html` mở được bên ngoài GitHub.
4. Trong app mới, thực hiện App content: Data Safety, Target audience, Content rating, Ads declaration, Government/financial/medical declarations (nếu áp dụng), App access và thông tin liên hệ. Chỉ khai đúng những tính năng có trong bản đã build.
5. Tải lên signed AAB theo hướng dẫn bên dưới rồi thử Internal testing. Nếu Play Console yêu cầu Closed testing 12 người/14 ngày, bạn phải tổ chức người thử nghiệm thật và trả lời yêu cầu cấp quyền production sau khi đạt điều kiện.


## B. Backend online — bắt buộc nếu muốn tìm kiếm TMDB/danh mục phim động
Link triển khai một lần: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftechzoneadapter-droid%2FReelTara. Chọn tài khoản Vercel bạn có quyền tạo project và xác nhận kết nối GitHub. Nếu giao diện không tự nhận diện Vite thì Build Command = npm run build, Output Directory = dist. Script Windows đã cho phép nhập URL backend và tự cài biến GitHub Actions sau khi bạn tạo project.
Vercel hiện trả 403 khi công cụ kết nối cố tạo dự án thay bạn. Cần bạn:
1. Vào https://vercel.com/new, chọn GitHub repository `techzoneadapter-droid/ReelTara`, tạo project Vite (Root Directory: `.`, Build Command: `npm run build`, Output Directory: `dist`).
2. Trong Vercel, chỉ khi có quyền dữ liệu TMDB phù hợp, tự thêm secret `TMDB_READ_ACCESS_TOKEN` ở project Environment Variables. Không gửi token cho trợ lý và không điền dạng `VITE_...`.
3. Truy cập `https://TEN-PROJECT.vercel.app/api/free-catalog` và xác nhận endpoint trả JSON hợp lệ. Nếu có token TMDB, xác minh thêm endpoint `/api/tmdb?path=movie/popular&region=VN`.
4. Vào GitHub repo → Settings → Secrets and variables → Actions → Variables, tạo `REELTARA_API_ORIGIN` = `https://TEN-PROJECT.vercel.app` (không có dấu / cuối).
5. Bấm Re-run workflow hoặc Run workflow; URL backend được biên dịch vào APK/AAB mới.

Lưu ý: Nguồn Internet Archive/Wikimedia có thể thiếu quyền thương mại; kiểm tra quyền từng tựa phim trước khi bật hiển thị cho người dùng đại trà.

## C. Khóa ký — bắt buộc để phát hành AAB
Tạo khóa upload mới với Android Studio **Build → Generate Signed Bundle / APK**, hoặc lệnh `keytool`; lưu bản sao bảo mật ngoại tuyến. Trong GitHub Settings → Secrets and variables → Actions → Repository Secrets, thêm:
- `ANDROID_KEYSTORE_BASE64`: nội dung base64 của khóa `.jks` (nhập trực tiếp trong GitHub, tuyệt đối không commit)
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Sau đó chạy workflow **ReelTara Android QA and bundles**, kiểm tra có artifact `reeltara-signed-release-aab`. Bật Play App Signing và lưu khóa upload an toàn cho các bản cập nhật sau.

## D. Bản quyền nội dung — cần quyết định của người chịu trách nhiệm pháp lý
- Xác nhận quyền dùng poster, banner, trailer, thông tin và nguồn phát với từng tác phẩm. Creative Commons trên metadata của bản upload không đủ chứng minh người upload có quyền cấp phép.
- Với TMDB, xin/chứng minh quyền sử dụng phù hợp với mô hình phát hành; quyền dùng API phát triển miễn phí không tự động là quyền khai thác thương mại.
- Chỉ bật AdMob, in-app purchase, VIP khi có quyền nội dung tương ứng và khai báo chính sách/đồng ý theo khu vực.

## E. Kiểm tra thực tế và gửi duyệt
- Tải APK debug từ GitHub Actions, cài trên tối thiểu một Android thật và kiểm tra bằng Wi-Fi và 4G/5G: mở ứng dụng, ấn Back, tìm phim, xem trailer, xem phim, mất mạng, xoay ngang, resume.
- Gửi phản hồi crash và các ảnh chụp màn hình thực tế để đưa vào Play listing.
- Nộp AAB và hồ sơ Play Console; xử lý Pre-launch report và quyết định kiểm duyệt từ Google.

Không bước nào yêu cầu cung cấp mật khẩu hay private key cho trợ lý.
