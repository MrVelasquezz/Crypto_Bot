const sender = async (pair, status, amount_bought, amount_returned, r_status) => {
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

        const users = await User.findAll()

        let receivers = new Array(users.length)

        receivers = users.map(item => {
            return new Promise(async (res, rej) => {
                try {
                    await bot.telegram.sendMessage(item.dataValues.uid, message, {
                        parse_mode: 'html'
                    })
                    res([true, item.dataValues.uname])
                } catch (e) {
                    res([false, item.dataValues.uname])
                }
            })
        })

        await (await Promise.allSettled(receivers)).forEach(item => {
            console.log(`User ${item.value[1]} ${item.value[0] ? "" : "does not"} received the message`)
        })
    } catch (e) {
        console.log(e)
    }
}

module.exports = sender