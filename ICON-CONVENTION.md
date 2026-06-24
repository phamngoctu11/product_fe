# Icon Convention - Hướng Dẫn Chuẩn Hóa Icon

## 📌 Tổng Quan
Dự án sử dụng **Bootstrap Icons (bi)** từ CDN. Tất cả icon phải tuân theo pattern chuẩn để đảm bảo tính nhất quán và dễ bảo trì.

**Link CDN:** `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css`

---

## 🎨 Pattern Chuẩn Cho Icon

### 1️⃣ Template Cơ Bản
```html
<i class="bi bi-[icon-name]"></i>
```

### 2️⃣ Icon Với Size

#### Sử dụng Bootstrap Size Classes (ưu tiên):
```html
<!-- Các size có sẵn: fs-1 (2rem), fs-2 (1.5rem), fs-3 (1.3rem), fs-4 (1.1rem), fs-5 (1rem), fs-6 (0.875rem) -->
<i class="bi bi-bell fs-4"></i>              <!-- Kích thước lớn -->
<i class="bi bi-bag-check fs-5"></i>         <!-- Kích thước bình thường -->
<i class="bi bi-box-seam fs-6"></i>          <!-- Kích thước nhỏ -->
```

#### Nếu cần size tùy chỉnh, dùng CSS class:
```css
.icon-lg {
  font-size: 1.5rem;
}

.icon-md {
  font-size: 1.1rem;
}

.icon-sm {
  font-size: 0.875rem;
}

.icon-xs {
  font-size: 0.75rem;
}
```

```html
<i class="bi bi-fire icon-lg"></i>
```

### 3️⃣ Icon Với Color

#### Sử dụng Bootstrap Text Color Classes (ưu tiên):
```html
<i class="bi bi-check text-success"></i>     <!-- Màu xanh lá -->
<i class="bi bi-bell text-primary"></i>      <!-- Màu xanh chủ yếu -->
<i class="bi bi-exclamation text-danger"></i> <!-- Màu đỏ -->
<i class="bi bi-info text-info"></i>         <!-- Màu xanh dương -->
<i class="bi bi-warning text-warning"></i>   <!-- Màu vàng -->
```

#### Nếu cần color tùy chỉnh, dùng CSS class:
```css
.icon-primary {
  color: #818cf8;
}

.icon-success {
  color: #34d399;
}

.icon-danger {
  color: #f87171;
}
```

```html
<i class="bi bi-fire icon-primary"></i>
```

### 4️⃣ Icon Trong Container (Ưu tiên cho UI đẹp hơn)

```html
<!-- Template 1: Icon Wrapper với Background Gradient -->
<div class="icon-wrapper icon-wrapper-primary">
  <i class="bi bi-fire"></i>
</div>

<!-- CSS -->
<style>
  .icon-wrapper {
    width: 48px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.85rem;
    font-size: 1.35rem;
    flex-shrink: 0;
  }

  .icon-wrapper-primary {
    background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12));
    color: #818cf8;
  }

  .icon-wrapper-success {
    background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.12));
    color: #10b981;
  }

  .icon-wrapper-danger {
    background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.12));
    color: #ef4444;
  }
</style>
```

---

## 📦 Các Loại Icon Được Dùng

### Navigation Icons (Sidebar)
| Icon | Tên Class | Mục đích |
|------|-----------|---------|
| 📊 | `bi-bar-chart-line-fill` | Bảng thống kê |
| 💬 | `bi-chat-square-dots-fill` | Quản lý chat |
| 📦 | `bi-grid-fill` | Quản lý sản phẩm |
| 👥 | `bi-people-fill` | Quản lý người dùng |
| ✅ | `bi-clipboard2-check-fill` | Duyệt đơn hàng |
| 🎫 | `bi-ticket-perforated-fill` | Voucher |
| 📫 | `bi-receipt-cutoff` | Đơn hàng |
| 💬 | `bi-chat-heart-fill` | Tư vấn sản phẩm |
| 👤 | `bi-person-badge-fill` | Hồ sơ cá nhân |

### Topbar Icons
| Icon | Tên Class | Kích thước | Mục đích |
|------|-----------|-----------|---------|
| 🛍️ | `bi-bag-check` | `fs-5` | Giỏ hàng |
| 🔔 | `bi-bell` | `fs-5` | Thông báo |
| 👤 | [custom] | `fs-6` | Menu người dùng |

### Product Icons
| Icon | Tên Class | Mục đích |
|------|-----------|---------|
| 🔥 | `bi-fire` | Sản phẩm hot |
| 💬 | `bi-chat-heart-fill` | Cần tư vấn |
| 🎯 | `bi-grid-3x3-gap-fill` | Phân loại sản phẩm |
| 📦 | `bi-box-seam` | Ảnh sản phẩm mặc định |
| ℹ️ | `bi-info-circle-fill` | Mô tả chi tiết |

### Notification Icons
| Icon | Tên Class | Màu | Mục đích |
|------|-----------|------|---------|
| 📦 | `bi-box-seam-fill` | Xanh chủ yếu | Thông báo đơn hàng |
| ❌ | `bi-exclamation-triangle-fill` | Đỏ | Cảnh báo |
| ❓ | `bi-question-circle-fill` | Vàng | Hỏi đáp |
| ✅ | `bi-check-circle-fill` | Xanh lá | Thành công |

### Footer Icons
| Icon | Tên Class | Mục đích |
|------|-----------|---------|
| 🚚 | `bi-truck-front-fill` | Giao hàng |
| 🛡️ | `bi-shield-fill-check` | Bảo mật |
| 🎧 | `bi-headset` | Hỗ trợ |
| 🔗 | `bi-facebook`, `bi-youtube`, `bi-instagram`, `bi-tiktok` | Mạng xã hội |

---

## ✅ Quy Tắc Áp Dụng

### ✔️ ĐÚNG - Cách Sử Dụng Chuẩn:
```html
<!-- Simple icon -->
<i class="bi bi-bell"></i>

<!-- Icon với size -->
<i class="bi bi-bag-check fs-5"></i>

<!-- Icon với color -->
<i class="bi bi-fire text-primary"></i>

<!-- Icon trong container -->
<div class="icon-wrapper icon-wrapper-primary">
  <i class="bi bi-check"></i>
</div>

<!-- Icon với tooltip -->
<i class="bi bi-info-circle" title="Thông tin"></i>

<!-- Icon động với *ngClass -->
<i class="bi" [ngClass]="getIconClass()"></i>
```

### ❌ SAI - Cách Không Nên Dùng:
```html
<!-- Không dùng inline style cho size/color khi có thể dùng class -->
<i class="bi bi-bell" style="font-size: 1.1rem; color: #818cf8;"></i>

<!-- Không trộn lẫn icon library -->
<i class="fas fa-bell"></i>  <!-- Font Awesome - tránh! -->

<!-- Không dùng icon không có trong BS Icons -->
<i class="bi bi-custom-icon"></i>  <!-- Kiểm tra BS Icons có tồn tại -->

<!-- Không bỏ qua class "bi" -->
<i class="bi-bell"></i>  <!-- Thiếu "bi" -->
```

---

## 🎯 Size Reference

| Class | Kích thước | Dùng cho |
|-------|-----------|---------|
| `fs-1` | 2rem (32px) | Headings to |
| `fs-2` | 1.5rem (24px) | Tiêu đề lớn |
| `fs-3` | 1.3rem (20px) | Tiêu đề nhỏ |
| `fs-4` | 1.1rem (17px) | Icon lớn |
| `fs-5` | 1rem (16px) | Icon bình thường |
| `fs-6` | 0.875rem (14px) | Icon nhỏ |
| (custom) | 0.75rem (12px) | Icon rất nhỏ |

---

## 🎨 Color Reference

| Class | Màu | RGB |
|-------|------|-----|
| `text-primary` | Xanh chủ yếu | #818cf8 |
| `text-success` | Xanh lá | #34d399 |
| `text-danger` | Đỏ | #ef4444 |
| `text-warning` | Vàng cam | #f59e0b |
| `text-info` | Xanh dương | #06b6d4 |
| `text-secondary` | Xám | #6b7280 |
| `text-muted` | Xám nhạt | #7c85b0 |

---

## 📋 Checklist Chuẩn Hóa

Khi thêm icon mới, kiểm tra:
- [ ] Icon có trong Bootstrap Icons?
- [ ] Sử dụng class `bi` + `bi-[name]`?
- [ ] Size được định nghĩa qua class (fs-*) thay vì inline style?
- [ ] Color được định nghĩa qua class (text-*) thay vì inline style?
- [ ] Icon có aria-label hoặc title cho accessibility?
- [ ] Icon có consistent với các icon khác cùng loại?

---

## 🔍 Bootstrap Icons Resources

- **Danh sách icon:** https://icons.getbootstrap.com/
- **Phiên bản:** 1.11.3
- **CDN:** https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/

---

## 📝 Ví Dụ Thực Tế

### Product Component - Correct Usage:
```html
<!-- Product tags -->
<span class="pd-tag-hot"><i class="bi bi-fire"></i> HOT</span>

<!-- Consult button -->
<button class="pd-consult-btn">
  <i class="bi bi-chat-heart-fill"></i> Tư vấn
</button>

<!-- Variants section -->
<div class="pd-section-title">
  <i class="bi bi-grid-3x3-gap-fill"></i> Phân loại
</div>

<!-- Missing image placeholder -->
<i class="bi bi-box-seam" style="font-size:1.4rem;color:#3d4b6e;"></i>
```

### Topbar - Correct Usage:
```html
<!-- Cart button -->
<button class="topbar-icon-button" title="Giỏ hàng">
  <i class="bi bi-bag-check"></i>
</button>

<!-- Notification bell -->
<button class="topbar-icon-button position-relative" title="Thông báo">
  <i class="bi bi-bell"></i>
  <span class="badge">5</span>
</button>
```

### Footer - Correct Usage:
```html
<!-- Footer highlight -->
<div class="footer-highlight-item">
  <span class="footer-highlight-icon">
    <i class="bi bi-truck-front-fill"></i>
  </span>
  <div>
    <strong>Giao hàng thuận tiện</strong>
  </div>
</div>

<!-- Social links -->
<div class="footer-socials">
  <a href="#"><i class="bi bi-facebook"></i></a>
  <a href="#"><i class="bi bi-youtube"></i></a>
</div>
```

---

**Last Updated:** 2026-06-24
**Version:** 1.0
