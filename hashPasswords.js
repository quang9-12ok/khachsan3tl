const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const { User } = require('./src/models'); // Đường dẫn có thể thay đổi tùy theo cấu trúc project của bạn

(async () => {
    try {
        // Kết nối cơ sở dữ liệu (chỉnh sửa thông tin nếu cần)
        const sequelize = new Sequelize('KHACHSAN3TL', 'root', '123456', {
            host: '127.0.0.1',
            dialect: 'mysql',
            logging: false
        });

        await sequelize.authenticate();
        console.log('✅ Kết nối cơ sở dữ liệu thành công.');

        // Lấy danh sách người dùng
        const users = await User.findAll();

        for (const user of users) {
            if (!user.password.startsWith('$2a$')) { // Kiểm tra nếu chưa mã hóa
                const hashedPassword = await bcrypt.hash(user.password, 10);
                user.password = hashedPassword;
                await user.save();
                console.log(`🔑 Mật khẩu của user ${user.email} đã được mã hóa.`);
            }
        }

        console.log('🔒 Tất cả mật khẩu đã được mã hóa thành công!');
        await sequelize.close(); // Đóng kết nối sau khi hoàn tất
    } catch (error) {
        console.error('❌ Lỗi khi mã hóa mật khẩu:', error);
    }
})();
