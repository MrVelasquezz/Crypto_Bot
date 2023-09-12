const { DataTypes } = require('sequelize')
const {ValidateError} = require('../errors/ValidateError')

const DefineUser = (sequelize) => {
    const User = sequelize.define(
        'Users', {
        uid: {
            type: DataTypes.BIGINT,
            allowNull: false,
            unique: true,
            primaryKey: true
        },
        uname: {
            type: DataTypes.STRING(24),
            allowNull: false,
            validate: (val) => {
                if (!val || (val && val.length < 5)) {
                    throw new ValidateError('Username length is invalid')
                }
            }
        }
    },
        {
            tableName: 'users',
            timestamps: false
        }
    )

    return User
}
module.exports = DefineUser