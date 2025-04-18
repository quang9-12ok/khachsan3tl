const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // In ra lỗi trong console

    // Kiểm tra loại lỗi và trả về phản hồi phù hợp
    res.status(err.status || 500).json({
        message: err.message || 'Đã xảy ra lỗi máy chủ!',
        error: process.env.NODE_ENV === 'development' ? err : {} // Chỉ hiển thị chi tiết lỗi trong môi trường phát triển
    });
};

module.exports = errorHandler;
