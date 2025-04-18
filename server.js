const app = require('./src/app');
const sequelize = require('./src/config/db'); 
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 3000;

// Kiểm tra kết nối database và khởi động server
async function startServer() {
    try {
        // Set MySQL session variables to allow invalid dates
        await sequelize.query("SET SESSION sql_mode=''");
        
        await sequelize.authenticate();
        logger.info('Database connection has been established successfully.');

        // Sync database (trong môi trường development)
        if (process.env.NODE_ENV === 'development') {
            // Use force: false and alter: false to prevent automatic schema changes
            // that might cause the "too many keys" error
            await sequelize.sync({ force: false, alter: false }).catch(err => {
                logger.error('Database sync error:', err);
                // Continue even if sync fails
            });
            logger.info('Database synchronized with safe settings');
        }

        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

startServer();

// Xử lý lỗi không được xử lý
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Rejection:', error);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});