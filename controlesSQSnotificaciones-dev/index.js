const axios = require('axios')
const AWS = require('aws-sdk')
const dynamodb = new AWS.DynamoDB.DocumentClient()
const onesignal_app_id = process.env.onesignal_app_id
const onesignal_rest_api_key = process.env.onesignal_rest_api_key
const waapi_api_key = process.env.waapi_api_key
const waapi_instance_id = process.env.waapi_instance_id
const WHATSAPP_USERNAME = process.env.WHATSAPP_USERNAME
const WHATSAPP_PASSWORD = process.env.WHATSAPP_PASSWORD

const oneMonthInSeconds = 30 * 24 * 60 * 60 // 30 days in seconds
const expirationTime = Math.floor(Date.now() / 1000) + oneMonthInSeconds

exports.handler = async (event) => {
  console.log(event)
  for (const { messageId, body } of event.Records) {
    console.log('SQS message %s: %j', messageId, body)

    let sqsArray = JSON.parse(body)
    let newNotas = []
    for (const nota of sqsArray) {
      newNotas.push(nota)
    }

    await sendPushNotification(newNotas)

    await sendWhatsapp(newNotas)
  }
  return `Successfully precessed ${event.Records.length} messages.`
}

async function sendPushNotification(newNotas) {
  // clientes de onesignal
  for (const nota of newNotas) {
    if (nota.onesignalDevices.length !== 0) {
      for (const device of nota.onesignalDevices) {
        const paramsOnesignal = {
          TableName: 'push_and_whatsapp',
          Item: {
            notaId: nota.nota,
            useremail: device,
            message: `*Alerta de noticia*\\n \\n${nota.titulo}\\n\\nhttps://app.controles.co.cr/?shared=1&id=${nota.nota}`,
            expirationTime: expirationTime,
          },
          ConditionExpression:
            'attribute_not_exists(notaId) AND attribute_not_exists(useremail)',
          ReturnConsumedCapacity: 'TOTAL',
        }

        //console.log(paramsOnesignal)

        try {
          await dynamodb.put(paramsOnesignal).promise()

          let onesignalReturn = await axios({
            method: 'post',
            url: 'https://onesignal.com/api/v1/notifications',
            headers: {
              Authorization: `Basic ${onesignal_rest_api_key}`,
              'Content-type': 'application/json',
            },
            data: {
              app_id: `${onesignal_app_id}`,
              include_player_ids: [device],
              headings: {
                en: `Alerta de noticia`,
                es: `Alerta de noticia`,
              },
              contents: {
                en: `${nota.titulo}`,
                es: `${nota.titulo}`,
              },
              data: {
                targetUrl: `https://app.controles.co.cr/admin/noticia/${nota.cliente}/${nota.nota}/`,
              },
              ios_badgeType: 'Increase',
              ios_badgeCount: '1',
            },
          })
          //console.log(onesignalReturn)
        } catch (error) {
          // ya se envió
          console.log(error)
        }
      }
    }
  }
}

async function sendWhatsapp(newNotas) {
  // whatsapp con api waapi
  for (const nota of newNotas) {
    if (nota.correo.includes('@c.us')) {
      const params = {
        TableName: 'push_and_whatsapp',
        Item: {
          notaId: nota.nota,
          useremail: nota.correo,
          message: `*Alerta de noticia*\\n \\n${nota.titulo}\\n\\nhttps://app.controles.co.cr/?shared=1&id=${nota.nota}`,
          expirationTime: expirationTime,
        },
        ConditionExpression:
          'attribute_not_exists(notaId) AND attribute_not_exists(useremail)',
        ReturnConsumedCapacity: 'TOTAL',
      }
      //console.log(params)
      try {
        await dynamodb.put(params).promise()
        //let waapilReturn = await axios({
        //  method: 'post',
        //  url: `https://waapi.app/api/v1/instances/${waapi_instance_id}/client/action/send-message`,
        //  headers: {
        //    accept: 'application/json',
        //    'content-type': 'application/json',
        //    authorization: `Bearer ${waapi_api_key}`,
        //  },
        //  data: {
        //    chatId: nota.correo,
        //    message: `*Alerta de noticia*\\n \\n${nota.titulo}\\n\\nhttps://app.controles.co.cr/?shared=1&id=${nota.nota}`,
        //  },
        //})
        //console.log('waapilReturn', waapilReturn)

        const username = WHATSAPP_USERNAME
        const password = WHATSAPP_PASSWORD
        const basicAuth =
          'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')

        const phonenumber = nota.correo

        const controlesWhatsapp = axios({
          method: 'post',
          url: `https://whatsapp.controles.co.cr/send/message`,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: basicAuth,
          },
          data: {
            phone: phonenumber.replace('@c.us', ''),
            message: `*Alerta de noticia*\n \n${nota.titulo}\n\nhttps://app.controles.co.cr/?shared=1&id=${nota.nota}`,
            reply_message_id: '',
            is_forwarded: false,
            duration: 0,
          },
        })
      } catch (error) {
        // ya se envió
        console.log(error)
      }
    }
  }
}
