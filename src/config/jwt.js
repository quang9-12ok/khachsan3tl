const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1d', // Thời gian hết hạn token
    });
};

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
    generateToken,
    verifyToken,
};
