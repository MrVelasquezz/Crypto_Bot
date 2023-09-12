const {ValidateError} = require('../../errors/ValidateError')
const NotifyUsers = require('../../functions/senderFunction')
const {Op} = require('sequelize')

const middleware = async (req, res) => {
    const r_status = {
        status: 500
    }

    try {
        let {
            id,
            pair,
            status,
            amount_bought,
            amount_returned
        } = req.body

        console.log(req.body) // for debug in production

        amount_bought = parseFloat(amount_bought)
        amount_returned = parseFloat(amount_returned) || 0
        pair = pair.toUpperCase()

        if (!(pair && status >= 0 && status <= 2 && (amount_bought >= 0 || amount_returned >= 0))) {
            res.json(r_status)
            return
        }

        if (amount_bought >= 0) {
            const { dataValues } = await Logs.create({
                status: 0,
                pair: pair,
                amount_bought: amount_bought
            })

            r_status.status = 200
            r_status.id = dataValues.id
        }
        else if (amount_returned >= 0 && id >= 0) {
            const found = await Logs.findOne({
                where: {
                    [Op.and]: [{ pair: pair }, { status: 0 }, { id: id }]
                }
            })

            if (!found) {
                r_status.status = 403
                res.json(r_status)
                return
            }
            
            // присваиваем переменной значение, что бы получить валидный результат
            amount_bought = found.dataValues.amount_bought

            const updated = await Logs.update({
                amount_returned: amount_returned,
                status: status
            }, {
                where: {
                    id: id
                }
            })

            if (updated[0] === 1) {
                r_status.status = 200
            }
            else {
                r_status.status = 500
                r_status.message = 'Not updated'
            }

        }
        else {
            r_status.status = 500
            r_status.message = 'Wrong parameters'
        }

        res.json(r_status)

        if(r_status.status === 200){
            NotifyUsers(pair, status, amount_bought, amount_returned, r_status)
        }

    } catch (e) {
        console.log(e)
        if(e instanceof ValidateError){
            r_status.message = e.message
            res.json(r_status)
        }
        else{
            res.json(r_status)
        }
    }
}

module.exports = middleware