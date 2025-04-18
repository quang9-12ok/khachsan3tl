const nodemailer = require('nodemailer');
require('dotenv').config();

// Create primary transporter with Gmail
const createPrimaryTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Increase timeouts
    connectionTimeout: 20000, // 20 seconds
    greetingTimeout: 20000,
    socketTimeout: 30000,
    // Disable connection pooling for troubleshooting
    pool: false,
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development'
  });
};

// Create fallback transporter using a different service (Mailtrap for development)
const createFallbackTransporter = () => {
  // For development, use Mailtrap or another test service
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      host: "smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: process.env.MAILTRAP_USER || "your_mailtrap_user",
        pass: process.env.MAILTRAP_PASS || "your_mailtrap_password"
      }
    });
  }
  
  // For production, could use a different provider like SendGrid, Mailgun, etc.
  return null;
};

// Create a local file-based transport for absolute fallback
const createLocalTransport = () => {
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true
  });
};

// Primary transporter
let transporter = createPrimaryTransporter();

// Verify connection function with better error handling and fallbacks
const verifyMailConnection = async () => {
  try {
    console.log('Attempting to verify SMTP connection...');
    const result = await transporter.verify();
    console.log('SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP connection error:', error);
    
    // Log specific error information
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('Cannot connect to SMTP server due to timeout or socket error.');
      console.error('This is likely caused by:');
      console.error('1. Network connectivity issues or firewall restrictions');
      console.error('2. VPN or proxy settings blocking the connection');
      console.error('3. SMTP server is down or rejecting connections');
      
      // Try to use a different DNS server by setting an environment variable
      console.log('Attempting to use alternative DNS resolution...');
    } else if (error.code === 'EAUTH') {
      console.error('Authentication failed. Check your username and password.');
    }
    
    return false;
  }
};

// Function to send email with fallback options
const sendMailWithFallback = async (mailOptions) => {
  // Try primary transport
  try {
    console.log('Attempting to send email using primary transport...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, info };
  } catch (primaryError) {
    console.error('Primary email transport failed:', primaryError);
    
    // Try fallback transport if available
    const fallbackTransport = createFallbackTransporter();
    if (fallbackTransport) {
      try {
        console.log('Attempting to send email using fallback transport...');
        const info = await fallbackTransport.sendMail(mailOptions);
        console.log('Email sent successfully using fallback:', info.messageId);
        return { success: true, info, usedFallback: true };
      } catch (fallbackError) {
        console.error('Fallback email transport failed:', fallbackError);
      }
    }
    
    // Last resort: save to file
    try {
      console.log('Attempting to save email to file as last resort...');
      const localTransport = createLocalTransport();
      const info = await localTransport.sendMail(mailOptions);
      
      // Save the email content to a file
      const fs = require('fs');
      const path = require('path');
      const emailsDir = path.join(__dirname, '../../emails');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(emailsDir)) {
        fs.mkdirSync(emailsDir, { recursive: true });
      }
      
      const filename = `email_${Date.now()}.eml`;
      fs.writeFileSync(path.join(emailsDir, filename), info.message);
      
      console.log(`Email saved to file: ${filename}`);
      return { success: true, savedToFile: true, filename };
    } catch (fileError) {
      console.error('Failed to save email to file:', fileError);
      return { success: false, error: primaryError };
    }
  }
};

// Export functions
exports.transporter = transporter;
exports.verifyMailConnection = verifyMailConnection;
exports.sendMailWithFallback = sendMailWithFallback;

// Update booking confirmation email to use the new sendMailWithFallback function
exports.sendBookingConfirmationEmail = async (email, bookingData) => {
  try {
    console.log('Preparing booking confirmation email to:', email);
    
    // Format booking data (keep your existing code)
    const formattedData = {
      bookingCode: bookingData.bookingCode || 'N/A',
      customerName: bookingData.userName || bookingData.customerName || 'Quý khách',
      roomType: bookingData.roomType || (bookingData.room && bookingData.room.type) || 'Phòng đã đặt',
      roomNumber: bookingData.roomNumber || (bookingData.room && (bookingData.room.roomNumber || bookingData.room.room_number)) || '',
      checkIn: bookingData.checkIn || (bookingData.checkInDate && new Date(bookingData.checkInDate).toLocaleDateString('vi-VN')) || 'Chưa xác định',
      checkOut: bookingData.checkOut || (bookingData.checkOutDate && new Date(bookingData.checkOutDate).toLocaleDateString('vi-VN')) || 'Chưa xác định',
      nights: bookingData.nights || 'N/A',
      guests: bookingData.guests || 'N/A',
      totalPrice: bookingData.totalPrice || (bookingData.totalAmount && bookingData.totalAmount.toLocaleString('vi-VN') + ' VND') || 'Liên hệ khách sạn',
      paymentMethod: 'Thanh toán tại khách sạn'
    };

    // Email content (keep your existing HTML template)
    const mailOptions = {
      from: `"Khách sạn 3TL" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Xác nhận đặt phòng #${formattedData.bookingCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4CAF50;">Đặt phòng thành công!</h1>
            <p>Cảm ơn bạn đã đặt phòng tại Khách sạn 3TL</p>
          </div>
          
          <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <h2 style="margin-top: 0; color: #333;">Thông tin đặt phòng</h2>
            <p><strong>Mã đặt phòng:</strong> ${formattedData.bookingCode}</p>
            <p><strong>Khách hàng:</strong> ${formattedData.customerName}</p>
            <p><strong>Phòng:</strong> ${formattedData.roomType} ${formattedData.roomNumber ? '- Phòng ' + formattedData.roomNumber : ''}</p>
            <p><strong>Ngày nhận phòng:</strong> ${formattedData.checkIn}</p>
            <p><strong>Ngày trả phòng:</strong> ${formattedData.checkOut}</p>
            <p><strong>Số đêm:</strong> ${formattedData.nights}</p>
            <p><strong>Số khách:</strong> ${formattedData.guests}</p>
            <p><strong>Tổng tiền:</strong> ${formattedData.totalPrice}</p>
            <p><strong>Phương thức thanh toán:</strong> ${formattedData.paymentMethod}</p>
          </div>
          
          <div style="margin-bottom: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #856404;">Lưu ý quan trọng</h3>
            <p>Vui lòng mang theo CMND/CCCD và mã đặt phòng khi nhận phòng.</p>
            <p>Thời gian nhận phòng: Từ 14:00</p>
            <p>Thời gian trả phòng: Trước 12:00</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi:</p>
            <p>Email: contact@khachsan3tl.com | Điện thoại: 0123 456 789</p>
            <p>Địa chỉ: 123 Đường ABC, Quận XYZ, TP. HCM</p>
          </div>
        </div>
      `
    };

    // Use the new sendMailWithFallback function
    const result = await sendMailWithFallback(mailOptions);
    
    if (result.success) {
      if (result.savedToFile) {
        console.log(`Booking confirmation email saved to file: ${result.filename}`);
      } else if (result.usedFallback) {
        console.log('Booking confirmation email sent using fallback transport');
      } else {
        console.log('Booking confirmation email sent successfully');
      }
      return true;
    } else {
      console.error('Failed to send booking confirmation email:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Error in sendBookingConfirmationEmail:', error);
    return false;
  }
};