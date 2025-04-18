const Booking = require('../models/booking.model');
const Room = require('../models/room.model');
const User = require('../models/user.model');

exports.getBookingReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const bookings = await Booking.findAll({
            where: {
                createdAt: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [Room, User]
        });

        // Tạo báo cáo Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Booking Report');
        
        // Thêm dữ liệu vào worksheet
        // ... logic xuất báo cáo ...

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=booking-report-${startDate}.xlsx`);
        
        await workbook.xlsx.write(res);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi tạo báo cáo' });
    }
}; 