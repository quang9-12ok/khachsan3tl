exports.setLocals = (req, res, next) => {
    // Truyền thông tin user vào tất cả views
    res.locals.user = req.session.user;
    
    // Truyền messages từ flash
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    
    // Format tiền tệ
    res.locals.formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };
    
    // Format ngày
    res.locals.formatDate = (date) => {
        return moment(date).format('DD/MM/YYYY');
    };
    
    next();
};
