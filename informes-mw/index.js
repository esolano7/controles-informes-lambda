const axios = require('axios')
const AWS = require('aws-sdk')
const { JSDOM } = require('jsdom')
const dynamodb = new AWS.DynamoDB.DocumentClient()
const S3 = new AWS.S3()
const waapi_api_key = process.env.waapi_api_key
const waapi_instance_id = process.env.waapi_instance_id
const bucket_name = process.env.bucket_name

const oneMonthInSeconds = 30 * 24 * 60 * 60 // 30 days in seconds
const expirationTime = Math.floor(Date.now() / 1000) + oneMonthInSeconds

exports.handler = async (event) => {
  console.log('event: ', event)
  for (const { messageId, body } of event.Records) {
    console.log('Body: ', body)
    let rawData = JSON.parse(body)
    let { destinatarios, idEnvio, subject } = rawData
    await extractHtmlContent(idEnvio)
    await sendWhatsapp(destinatarios, idEnvio, subject)
  }
  return `Successfully precessed ${event.Records.length} messages.`
}
