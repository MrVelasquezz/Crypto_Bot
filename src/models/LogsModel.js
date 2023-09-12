const { DataTypes, sequelize } = require('sequelize')
const { ValidateError } = require('../errors/ValidateError.js')

const DefineLogs = (sequelize) => {
    const Logs = sequelize.define(
        'Logs',
        {
            status: {
                type: DataTypes.SMALLINT,
                allowNull: false,
                validate: (val) => {
                    if (val < 0 || val > 2) {
                        throw new ValidateError('Status must be in range(0, 3)')
                    }
                }
            },
            pair: {
                type: DataTypes.STRING(10),
                allowNull: false,
                set(val) {
                    this.setDataValue('pair', val.toUpperCase())
                }
            },
            amount_bought: {
                type: DataTypes.DECIMAL(20, 10),
                allowNull: false,
                validate: (val) => {
                    if (val < -1) {
                        throw new ValidateError('amount_bought must be positive')
                    }
                }
            },
            amount_returned: {
                type: DataTypes.DECIMAL(20, 10),
                allowNull: false,
                default: true,
                defaultValue: 0,
                validate: (val) => {
                    if (val < -1) {
                        throw new ValidateError('amount_returned must be positive')
                    }
                }
            }
        },
        {
            tableName: 'logs',
            timestamps: false
        }
    )
    return Logs
}

module.exports = DefineLogs