const { Telegraf } = require('telegraf')
const { Sequelize } = require('sequelize')
const express = require('express')
require('dotenv').config()

const UsersModel = require('./src/models/UsersModel')
const LogsModel = require('./src/models/LogsModel')

const port = process.env.PORT || 3000

const app = express()
app.use(express.json())

const bot = new Telegraf(process.env.TOKEN)
const sequelize = new Sequelize(process.env.DB, 'postgres', process.env.PASS, {
    host: process.env.HOST,
    dialect: 'postgres',
    logging: false
});

(async () => {
    try {
        await sequelize.authenticate()
        console.log("Database connected")

        const User = UsersModel(sequelize)
        const Logs = LogsModel(sequelize)

        await sequelize.sync({ alter: true })

        global.User = User
        global.Logs = Logs

        bot.launch()

        global.bot = bot

        process.once("SIGINT", () => bot.stop("SIGINT"));
        process.once("SIGTERM", () => bot.stop("SIGTERM"));

        app.listen(port, () => { console.log(`Server is running on port ${port}`) })
    } catch (e) {
        console.error(e)
        process.exit()
    }
})()

bot.use(require('./src/middlewares/telegram/UserControllerMiddleware'))

bot.command("notify", require('./src/middlewares/telegram/NotifyMiddleware'))

app.post('/log', require('./src/middlewares/express/LogMiddleware'))
