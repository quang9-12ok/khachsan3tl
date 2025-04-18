const Service = require('../models/service.model');

// Get all services
exports.getAllServices = async (req, res) => {
    try {
        const services = await Service.findAll();
        
        res.render('service/index', {
            title: 'Dịch vụ khách sạn',
            services,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Get all services error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải danh sách dịch vụ');
        res.redirect('/');
    }
};

// Get service by ID
exports.getServiceById = async (req, res) => {
    try {
        const serviceId = req.params.id;
        const service = await Service.findByPk(serviceId);
        
        if (!service) {
            req.flash('error', 'Không tìm thấy dịch vụ');
            return res.redirect('/services');
        }
        
        res.render('service/detail', {
            title: service.name,
            service,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Get service by ID error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải thông tin dịch vụ');
        res.redirect('/services');
    }
};

// Keep your existing service-specific methods if needed
exports.getRestaurantService = async (req, res) => {
    try {
        // Find restaurant service from database
        const restaurantService = await Service.findOne({
            where: { 
                type: 'restaurant'
            }
        });
        
        res.render('service/restaurant', {
            title: 'Nhà hàng',
            service: restaurantService,
            user: req.session.user,
            success: req.flash('success'),
            error: req.flash('error'),
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            }
        });
    } catch (error) {
        console.error('Get restaurant service error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải thông tin nhà hàng');
        res.redirect('/services');
    }
};

// Similar updates for spa and pool services
exports.getSpaService = async (req, res) => {
    try {
        const spaService = await Service.findOne({
            where: { 
                type: 'spa'
            }
        });
        
        res.render('service/spa', {
            title: 'Spa & Massage',
            service: spaService,
            user: req.session.user,
            success: req.flash('success'),
            error: req.flash('error'),
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            }
        });
    } catch (error) {
        console.error('Get spa service error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải thông tin spa');
        res.redirect('/services');
    }
};

exports.getPoolService = async (req, res) => {
    try {
        const poolService = await Service.findOne({
            where: { 
                type: 'pool'
            }
        });
        
        res.render('service/pool', {
            title: 'Hồ Bơi',
            service: poolService,
            user: req.session.user,
            success: req.flash('success'),
            error: req.flash('error'),
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            }
        });
    } catch (error) {
        console.error('Get pool service error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải thông tin hồ bơi');
        res.redirect('/services');
    }
};

exports.createService = async (req, res) => {
    try {
        const { name, description, price } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!name || !description || !price) {
            return res.status(400).json({ message: 'Thiếu thông tin dịch vụ' });
        }

        // Thêm dịch vụ mới vào database
        const service = await Service.create({ name, description, price });
        res.status(201).json({ message: 'Dịch vụ thêm thành công', service });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.updateService = async (req, res) => {
    try {
        const { name, description, price, type, openingHours, details } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!name || !description || !price) {
            return res.status(400).json({ message: 'Thiếu thông tin dịch vụ cần thiết' });
        }

        // Tìm dịch vụ hiện tại để lấy thông tin hình ảnh cũ
        const existingService = await Service.findByPk(req.params.id);
        if (!existingService) {
            return res.status(404).json({ message: 'Dịch vụ không tồn tại' });
        }

        // Chuẩn bị dữ liệu cập nhật
        const updateData = {
            name,
            description,
            price,
            type: type || 'general',
            openingHours: openingHours || '',
            details: details || ''
        };

        // Xử lý tệp hình ảnh nếu có
        if (req.file) {
            // Nếu bạn đang sử dụng multer, đường dẫn tệp sẽ có trong req.file.path
            // Chuyển đổi đường dẫn tệp thành URL tương đối để lưu vào cơ sở dữ liệu
            const relativePath = `/uploads/services/${req.file.filename}`;
            updateData.image = relativePath;
            
            // Nếu cần, bạn có thể xóa hình ảnh cũ ở đây
            // Ví dụ: nếu existingService.image tồn tại, xóa tệp đó
        }

        // Cập nhật thông tin dịch vụ
        const [updated] = await Service.update(
            updateData,
            { where: { id: req.params.id } }
        );

        if (updated) {
            // Nếu cập nhật thành công, trả về thông báo thành công
            return res.status(200).json({ 
                success: true,
                message: 'Cập nhật dịch vụ thành công',
                service: await Service.findByPk(req.params.id)
            });
        } else {
            return res.status(404).json({ message: 'Không thể cập nhật dịch vụ' });
        }
    } catch (error) {
        console.error('Lỗi cập nhật dịch vụ:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const serviceId = req.params.id;

        // Xóa dịch vụ khỏi database
        const deleted = await Service.destroy({ where: { id: serviceId } });

        if (deleted) {
            res.status(200).json({ message: 'Xóa dịch vụ thành công' });
        } else {
            res.status(404).json({ message: 'Dịch vụ không tồn tại' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};


// API để lấy danh sách tất cả dịch vụ
exports.getAllServicesAPI = async (req, res) => {
    try {
        const services = await Service.findAll({
            // Remove 'image' from the attributes list if it doesn't exist
            attributes: ['id', 'name', 'description', 'price'],
            order: [['name', 'ASC']]
        });
        
        return res.status(200).json({
            success: true,
            data: services
        });
    } catch (error) {
        console.error('Get all services API error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách dịch vụ',
            error: error.message
        });
    }
};
