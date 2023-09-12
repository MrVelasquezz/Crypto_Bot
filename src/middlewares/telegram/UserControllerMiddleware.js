const middleware = async (ctx, next) => {
    try {
        const user = ctx.update.message.from

        const message = ctx.update.message.text

        if (user) {
            const is_in_db = await User.findOne({
                where: {
                    uid: user.id
                }
            })

            if (is_in_db) {
                next()
            }
            else if (message && message.trim().endsWith(process.env.KEYWORD)) {
                await User.create({
                    uid: user.id,
                    uname: user.username
                })

                await ctx.reply("Вы были успешно зарегистрированы")
            }
            else {
                await ctx.reply("Что бы использовать бота вам нужно зарегистрироваться ")
            }
        }
    } catch (e) {
        ctx.reply("Произошла ошибка")
        console.log(e)
    }
}

module.exports = middleware