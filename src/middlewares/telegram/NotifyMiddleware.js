const middleware = async (ctx) => {
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

        const users = await User.findAll()

        let reply_obj = resolved_entities.length > 1 ? {
            entities: resolved_entities
        } : null

        const send_promises = users.map(async item => {
            try {
                await ctx.telegram.sendMessage(item.dataValues.uid, message, reply_obj)
            } catch (e) {
                // создаем пользовательскую ошибку, что бы после ее отправить пользователю 
                throw Error(`User ${item.dataValues.uname}[${item.dataValues.uid}] does not become a message`)
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
}

module.exports = middleware