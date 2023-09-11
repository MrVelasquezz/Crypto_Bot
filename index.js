const { Telegraf } = require('telegraf')
const { Sequelize } = require('sequelize')
const fs = require("fs").promises
const express = require('express')
require('dotenv').config()

const port = process.env.PORT || 3000
const table_names = ["users", "logs"]

const app = express()
app.use(express.json())

const bot = new Telegraf(process.env.TOKEN)
const sequelize = new Sequelize(process.env.DB, 'postgres', process.env.PASS, {
    host: process.env.HOST,
    dialect: 'postgres',
    logging: false
});

const check_tables = (table) => {
    return new Promise(async (res, rej) => {
        try {
            const [[{ exists }], _] = await sequelize.query(
                `SELECT EXISTS(SELECT * FROM information_schema.tables WHERE table_name='${table}');`)

            if (exists) {
                res([true, table])
            }

            const sql_query = await fs.readFile(`./sql/${table}.sql`,
                {
                    encoding: "utf-8",
                    flag: "r"
                })

            if (!sql_query) { rej("No file readed") }

            await sequelize.query(sql_query)

            res([false, table])
        } catch (e) {
            rej(e)
        }
    })
}

const notify_users = async (pair, status, amount_bought, amount_returned, r_status) => {
    const bot_status = [
        "BUY",
        "SELL",
        "ПРОВАЛ"
    ]

    try {
        const message = `<b>ЛОГ ОТ БОТА</b>\n` +
            `<b>Криптопара:</b> <code>${pair}</code>\n` +
            `<b>Статус:</b> ${bot_status[status]}\n` +
            `<b>Стоимость:</b> ${amount_bought}\n` +
            `<b>Получено:</b> ${amount_returned}\n` +
            `<b>Записано:</b> ${r_status.status === 200 ? "ДА" : "НЕТ"}`

        const [users, _] = await sequelize.query("SELECT * FROM users")

        let recievers = new Array(users.length)

        recievers = users.map(item => {
            return new Promise(async (res, rej) => {
                try {
                    await bot.telegram.sendMessage(item.uid, message, {
                        parse_mode: 'html'
                    })
                    res([true, item.uname])
                } catch (e) {
                    res([false, item.uname])
                }
            })
        })

        await (await Promise.allSettled(recievers)).forEach(item => {
            console.log(`User ${item.value[1]} ${item.value[0] ? "" : "does not"} recieved the message`)
        })
    } catch (e) {
        console.log(e)
    }
}

(async () => {
    try {
        await sequelize.authenticate()
        console.log("Database connected")

        const promises = new Array(table_names.length)

        for (const table of table_names) {
            promises.push(check_tables(table))
        }

        await (await Promise.all(promises)).forEach(item => {
            if (item && !item[0]) {
                console.log(`Table ${item[1]} was created`)
            }
        })

        bot.launch()

        process.once("SIGINT", () => bot.stop("SIGINT"));
        process.once("SIGTERM", () => bot.stop("SIGTERM"));

        app.listen(port, () => { console.log(`Serevr is running on port ${port}`) })
    } catch (e) {
        console.error(e)
        process.exit()
    }
})()

bot.use(async (ctx, next) => {
    try {
        const user = ctx.update.message.from

        const message = ctx.update.message.text

        if (user) {
            const [is_in_db, _] = await sequelize.query(`SELECT * FROM users WHERE uid = ${user.id}`)

            if (is_in_db.length) {
                next()
            }
            else if (message && message.trim().endsWith(process.env.KEYWORD)) {
                await sequelize.query(`INSERT INTO users (uid, uname) VALUES (${user.id}, '${user.username}')`)

                if (message && message.trim().endsWith(process.env.KEYWORD)) {
                    await ctx.reply("Вы были успешно зарегистрированы")
                }
            }
        }
    } catch (e) {
        ctx.reply("Произошла ошибка")
        console.log(e)
    }
})

bot.command("notify", async (ctx) => {
    try {
        const message = ctx.update.message.text.replace('/notify', '').trim()

        const resolved_entities = new Array()

        if (ctx.update.message.entities.length > 1) {
            // нужен для вычисления всех остальных оффсетов
            const offset_diff = ctx.update.message.entities[1].offset

            for (let i = 1; i < ctx.update.message.entities.length; i++) {
                // next entity from the cursor. because we are deleting first entity
                const new_entity = Object.assign({}, ctx.update.message.entities[i])

                new_entity.offset = ctx.update.message.entities[i].offset - offset_diff

                resolved_entities.push(new_entity)
            }
        }

        const [users, _] = await sequelize.query(`SELECT * FROM users`)

        let reply_obj = resolved_entities.length > 1?{
            entities: resolved_entities
        }:null

        const send_promises = users.map(async item => {
            try {
                await ctx.telegram.sendMessage(item.uid, message, reply_obj)
            } catch (e) {
                // создаем пользовательскую ошибку, что бы после ее отправить пользователю 
                throw Error(`User ${item.uname}[${item.uid}] does not become a message`)
            }
        })

        const resolved = await Promise.allSettled(send_promises)

        for (let res_promise of resolved) {
            if (res_promise.status === 'rejected') {
                await ctx.reply(res_promise.reason.message)
            }
        }
    } catch (e) {
        ctx.reply("Произошла ошибка")
        console.log(e)
    }
})

app.post('/log', async (req, res) => {
    const r_status = {
        status: 500
    }

    try {
        let {
            pair,
            status,
            amount_bought,
            amount_returned
        } = req.body

        console.log(req.body) // for debug in production

        amount_bought = parseFloat(amount_bought)
        amount_returned = parseFloat(amount_returned) || 0
        pair = pair.toUpperCase()

        if (pair && status >= 0 && status <= 2 && (amount_bought >= 0 || amount_returned >= 0)) {
            if (amount_bought >= 0) {
                await sequelize.query(`INSERT INTO logs (status, date, pair, amount_bought) 
                    VALUES (0, ${Date.now()}, '${pair.toUpperCase()}', ${amount_bought})`)

                r_status.status = 200
            }
            else {
                const [exists, _] = await sequelize.query(`SELECT * FROM logs WHERE 
                    date = (SELECT MAX(date) FROM logs WHERE pair = '${pair}' AND status = 0)
                    AND  pair = '${pair}' AND status = 0`)

                if (exists.length) {
                    amount_bought = exists[0].amount_bought
                    await sequelize.query(`UPDATE logs SET status = ${status}, amount_returned = ${amount_returned} 
                        WHERE date = (SELECT MAX(date) FROM logs WHERE pair = '${pair}' AND status = 0) 
                        AND  pair = '${pair}' AND status = 0`)

                    r_status.status = 200
                }
            }

            res.json(r_status)

            notify_users(pair, status, amount_bought, amount_returned, r_status)
        }
        else {
            await res.json(r_status)
        }
    } catch (e) {
        console.log(e)
        await res.json(r_status)
    }
})
