# ReelTara — Sổ kiểm soát bản quyền trước phát hành

**Nguồn trong code không đồng nghĩa với bằng chứng quyền thương mại.**

| Nội dung | Nguồn được khai báo | Kiểm tra bắt buộc |
| --- | --- | --- |
| Big Buck Bunny | Blender Foundation, CC BY 3.0; Internet Archive mirror | Xác minh bản mirror đúng tác phẩm, điều kiện ghi công, thời điểm sử dụng |
| Sintel | Blender Foundation, CC BY 3.0; Internet Archive mirror | Xác minh bản mirror và điều kiện ghi công |
| Tears of Steel | Blender Foundation, CC BY 3.0; Internet Archive mirror | Xác minh bản mirror và điều kiện ghi công |
| Dynamic Internet Archive | Bộ lọc metadata giấy phép | Người biên tập xác nhận quyền người upload từng file trước khi đưa vào bản chính thức |
| Dynamic Wikimedia Commons | Metadata Commons | Xem chi tiết tác giả, giấy phép, hạn chế và phạm vi sử dụng từng video |
| TMDB / JustWatch | API metadata / watch providers | Kiểm tra điều kiện sử dụng, attribution và quyền thương mại phù hợp |
| YouTube trailers | YouTube IFrame API | Tuân thủ quy định nhúng; không chặn logo, quảng cáo, không tải hay rehost |
| Poster / banners trong public/images | Asset nằm trong repository | Xác nhận giấy phép hoặc thay bằng đồ họa được phép sử dụng |

*Gợi ý an toàn:* phát hành đầu tiên với bộ phim nguồn mở đã rà soát thủ công và attribution đầy đủ; trì hoãn nguồn động chưa xác minh và doanh thu quảng cáo cho tới khi đủ bằng chứng.

## Hồ sơ rà soát 20/10/2026

| Tác phẩm | Bằng chứng từ chủ thể công bố | Điều kiện / giới hạn |
| --- | --- | --- |
| Big Buck Bunny | [Blender Peach: About / License information](https://peach.blender.org/about/) nêu CC BY 3.0 và cho phép phân phối, kể cả thương mại, khi ghi công | Phát toàn bộ phải giữ credit roll. Ghi công Blender Foundation và nguồn Peach cho phần hình ảnh. Không suy quyền đối với logo/thương hiệu ngoài phạm vi phim |
| Sintel | [Blender Durian: Sharing](https://durian.blender.org/sharing) và [About](https://durian.blender.org/about/) nêu CC BY 3.0, cho phép chiếu/chia sẻ với credit roll | Logo/thương hiệu và nội dung của bên khác được loại khỏi giấy phép. Không dùng logo làm chứng thực cho ReelTara |
| Tears of Steel | [Blender Mango: About](https://mango.blender.org/about/) nêu rõ CC BY 3.0, cho phép chia sẻ/chiếu khi giữ credit scroll; phim, footage và studio files là nội dung mở | Giữ credit scroll và attribution; không mở rộng sang logo/thương hiệu riêng |

Các trang chính thức có nội dung được bộ máy tìm kiếm lập chỉ mục. Truy cập HTTP trực tiếp từ môi trường kiểm thử nhận 403; báo cáo không coi đó là xác nhận endpoint đang truy cập được. Giấy phép tác phẩm tách biệt với khả năng phát, danh tính uploader và tính toàn vẹn file mirror.

Registry giới hạn chính xác sáu URL MP4 của ba phim. Đã đối chiếu metadata/hash, HTTP 206/MP4/range, thời lượng và lấy khung hình cuối từng bản mirror. Chưa cấp phép cho phim mới chỉ vì cùng nằm trên Archive hoặc Commons. Các uploader động (kể cả phim cổ, hoạt hình thương mại hay nhãn public domain) không được bật trong bản phát hành.

### Bằng chứng theo file

| Tác phẩm | File đã kiểm | Thời lượng thực | Quan sát khung hình cuối |
| --- | --- | --- | --- |
| Big Buck Bunny | `BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4`; `BigBuckBunny_328/BigBuckBunny_512kb.mp4` | 596.480 / 596.417 giây | Cùng credit của Peach/Blender, phần Special Thanks và cảnh kết sau credit |
| Sintel | `Sintel/sintel-2048-stereo_512kb.mp4`; `Sintel/sintel-2048-stereo.mp4` | 888.064 / 888.064 giây | Cùng credit trên nền tranh, danh sách cộng tác viên và thông tin bài hát Sintel |
| Tears of Steel | `Tears-of-Steel/tears_of_steel_720p.mp4`; `Tears-of-Steel/tears_of_steel_1080p.mp4` | 734.125 / 734.121 giây | Cùng credit Mango/Blender và cảnh kết sau credit |

[source-audit.json](qa/release/source-audit.json) lưu tên file, size, MD5/SHA1 do Archive công bố và kết quả transport; không phải hash tự tính từ tải toàn bộ file. [credit-audit.json](qa/release/credits/credit-audit.json) và 12 PNG trong cùng thư mục là khung hình phát thật ở hai vị trí cuối phim, đã xem để đối chiếu tác phẩm/credit. Không xác nhận từng frame của toàn bộ credit roll chỉ bằng các mẫu này. App phát file trực tiếp, không cắt credit, tải lại hay sửa phim. CC BY không yêu cầu uploader giữ độc quyền phân phối, nhưng vẫn cần ngừng nguồn nếu nội dung thay đổi hoặc có khiếu nại hợp lệ.

Sáu trailer thương mại trong seed đã kiểm YouTube oEmbed HTTP 200 và kênh: Warner Bros (Dune), Universal Pictures (Oppenheimer), Searchlight Pictures (Poor Things), Warner Bros UK & Ireland (Interstellar), Sony Pictures Entertainment (Spider-Verse), A24 (Past Lives). ID/kênh ghi trong source audit. Đây là bằng chứng nguồn studio; nhúng và khả dụng theo vùng vẫn do YouTube quyết định, không cấp quyền tải/rehost/full movie.

Ảnh thương mại cũ tại `public/images` không có hồ sơ riêng: không dùng trong UI seed và loại khỏi output `dist`. SVG `public/brand/discovery-placeholder.svg` là đồ họa do dự án tạo trong đợt này. Ảnh ba phim Blender là thumbnail đang có; không tuyên bố có quyền logo/thương hiệu riêng hoặc nguồn khác ngoài giấy phép tác phẩm.

Chủ sở hữu đã xác nhận quyền sử dụng metadata/ảnh TMDB cho **bản thử nghiệm** trong cuộc trao đổi ngày 20/10/2026. Chưa kiểm tra văn bản hợp đồng hoặc phạm vi thương mại/Production; không mở rộng xác nhận đó sang các asset chưa rõ nguồn. Trailer dùng YouTube IFrame, ưu tiên mục official hoặc đã rà soát; không trích xuất stream, tải, cắt credit hoặc rehost phim thương mại.
