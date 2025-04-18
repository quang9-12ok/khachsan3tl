const { sendMailWithFallback } = require('../config/mailer');

// Hiển thị trang liên hệ
exports.getContactPage = (req, res) => {
    res.render('pages/contact', {
        title: 'Liên hệ',
        user: req.session.user,
        success: req.flash('success'),
        error: req.flash('error')
    });
};

// Xử lý gửi tin nhắn liên hệ
exports.sendContactMessage = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        
        // Kiểm tra dữ liệu đầu vào
        if (!name || !email || !subject || !message) {
            req.flash('error', 'Vui lòng điền đầy đủ thông tin bắt buộc');
            return res.redirect('/contact');
        }
        
        // Trong môi trường phát triển, vẫn gửi email nhưng với hệ thống fallback
        console.log('Preparing contact form email from:', email);
        
        // Nội dung email
        const mailOptions = {
            from: `"${name}" <${email}>`,
            to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
            subject: `Liên hệ mới: ${subject}`,
            html: `
                <h2>Thông tin liên hệ mới</h2>
                <p><strong>Họ tên:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Số điện thoại:</strong> ${phone || 'Không cung cấp'}</p>
                <p><strong>Tiêu đề:</strong> ${subject}</p>
                <p><strong>Nội dung:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `
        };
        
        // Gửi email với hệ thống fallback
        const result = await sendMailWithFallback(mailOptions);
        
        if (result.success) {
            if (result.savedToFile) {
                console.log(`Contact form email saved to file: ${result.filename}`);
                req.flash('success', 'Tin nhắn của bạn đã được lưu lại và sẽ được xử lý sớm!');
            } else {
                console.log('Contact form email sent successfully');
                req.flash('success', 'Tin nhắn của bạn đã được gửi thành công!');
            }
        } else {
            console.error('Failed to send contact form email:', result.error);
            req.flash('error', 'Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại sau.');
        }
        
        res.redirect('/contact');
    } catch (error) {
        console.error('Send contact message error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại sau.');
        res.redirect('/contact');
    }
};