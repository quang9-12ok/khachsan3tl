CREATE DATABASE KHACHSAN3TL;
USE KHACHSAN3TL;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(50) UNIQUE NOT NULL,
    type ENUM('standard', 'deluxe', 'suite') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status ENUM('available', 'booked', 'maintenance') DEFAULT 'available',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE booking_services (
    booking_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (booking_id, service_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
CREATE TABLE admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO users (id, name, email, password, phone, address, role) VALUES
(1, 'Nguyễn Văn A', 'nguyenvana@gmail.com', 'user123', '0123456789', 'Hà Nội', 'user'),
(2, 'Trần Thị B', 'tranthib@gmail.com', 'user456', '0987654321', 'TP.HCM', 'user'),
(3, 'Admin', 'admin@example.com', 'admin', '0999999999', 'Hệ thống', 'admin');
INSERT INTO rooms (id, room_number, type, price, status, description) VALUES
(1, '101', 'standard', 500000, 'available', 'Phòng tiêu chuẩn đơn, có view đẹp'),
(2, '102', 'deluxe', 800000, 'booked', 'Phòng cao cấp với bồn tắm'),
(3, '103', 'suite', 1200000, 'available', 'Phòng suite rộng rãi, có khu vực tiếp khách');
INSERT INTO bookings (id, user_id, room_id, check_in, check_out, status, total_price) VALUES
(1, 1, 2, '2025-04-10', '2025-04-15', 'confirmed', 4000000),
(2, 2, 1, '2025-05-05', '2025-05-10', 'pending', 2500000);
INSERT INTO services (id, name, description, price) VALUES
(1, 'Spa', 'Dịch vụ spa thư giãn', 300000),
(2, 'Buffet sáng', 'Bữa sáng buffet cao cấp', 150000),
(3, 'Giặt ủi', 'Dịch vụ giặt ủi nhanh', 50000);
INSERT INTO booking_services (booking_id, service_id, quantity, price) VALUES
(1, 1, 1, 300000),
(1, 2, 2, 300000),
(2, 3, 1, 50000);
INSERT INTO reviews (id, user_id, room_id, rating, comment) VALUES
(1, 1, 2, 5, 'Phòng sạch sẽ, view đẹp, nhân viên nhiệt tình'),
(2, 2, 1, 4, 'Phòng hơi nhỏ nhưng tiện nghi tốt');
INSERT INTO admin_logs (id, admin_id, action) VALUES
(1, 3, 'Cập nhật giá phòng 101'),
(2, 3, 'Xác nhận đặt phòng cho khách Nguyễn Văn A');


UPDATE Users
SET createdAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP
WHERE createdAt = '0000-00-00 00:00:00';
UPDATE Rooms
SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE created_at = '0000-00-00 00:00:00';
UPDATE Bookings
SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE created_at = '0000-00-00 00:00:00';
UPDATE Services
SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE created_at = '0000-00-00 00:00:00';
UPDATE Booking_Services
SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE created_at = '0000-00-00 00:00:00';
UPDATE Reviews
SET created_at = CURRENT_TIMESTAMP
WHERE created_at = '0000-00-00 00:00:00';
UPDATE Admin_Logs
SET created_at = CURRENT_TIMESTAMP
WHERE created_at = '0000-00-00 00:00:00';

SHOW VARIABLES LIKE 'sql_mode';
SET GLOBAL sql_mode = 'ALLOW_INVALID_DATES';
