module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Bookings', 'changeCount', {
            type: Sequelize.INTEGER,
            defaultValue: 0,
            allowNull: false
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Bookings', 'changeCount');
    }
}; 