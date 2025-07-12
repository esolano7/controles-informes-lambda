const axios = require('axios')
const AWS = require('aws-sdk')
const { JSDOM } = require('jsdom')
const dynamodb = new AWS.DynamoDB.DocumentClient()
const S3 = new AWS.S3()
const waapi_api_key = process.env.waapi_api_key
const waapi_instance_id = process.env.waapi_instance_id
const bucket_name = process.env.bucket_name
const WHATSAPP_USERNAME = process.env.WHATSAPP_USERNAME
const WHATSAPP_PASSWORD = process.env.WHATSAPP_PASSWORD

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

async function sendWhatsapp(correos, idEnvio, subject) {
  // whatsapp con api waapi
  for (const correo of correos) {
    if (correo.includes('@c.us')) {
      const params = {
        TableName: 'push_and_whatsapp',
        Item: {
          notaId: idEnvio,
          useremail: correo,
          message: `https://media.controles.co.cr/informes/${idEnvio}.html`,
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
        //    chatId: correo,
        //    //chatId: '50688351799@c.us',
        //    message: `${subject}\\n\\nhttps://media.controles.co.cr/informes/${idEnvio}.html`,
        //  },
        //})
        //console.log('waapilReturn', waapilReturn)

        const username = WHATSAPP_USERNAME
        const password = WHATSAPP_PASSWORD
        const basicAuth =
          'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')

        const phonenumber = correo

        const controlesWhatsapp = await axios({
          method: 'post',
          url: `https://whatsapp.controles.co.cr/send/message`,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: basicAuth,
          },
          data: {
            phone: phonenumber.replace('@c.us', ''),
            message: `${subject}\n\nhttps://media.controles.co.cr/informes/${idEnvio}.html`,
            reply_message_id: '',
            is_forwarded: false,
            duration: 0,
          },
        })
        console.log('controlesWhatsapp', controlesWhatsapp.data)
      } catch (error) {
        // ya se envió
        console.log(
          'Si el error es ConditionalCheckFailedException: The conditional request failed, significa que ya se envió y ya se encuentra el registro del envío en dynamodb'
        )
        console.log(error)
      }
    }
  }
}

const uploadFileToS3 = async (fileName, fileContent) => {
  const fullHtmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta property="og:title" content="Controles First Zense Monitoreo de Medios"/>
      <meta property="og:description" content="Controles First Zense Monitoreo de Medios"/>
      <meta property="og:url" content="https://www.controles.co.cr" />
      <meta property="og:image" content="https://media.controles.co.cr/informes/whatsappCover.png"/>
      <title>Controles First Zense Monitoreo de Medios</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"
      rel="stylesheet"
    />
    <style>
      body {
        max-width: 900px;
        margin: auto;
        padding: 10px;
      }
      body,
      div,
      p,
      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      }
      .isTittle {
        margin-top: 0px;
      }
      .isTittle::before {
        content: '';
        display: block;
        margin: 10px 0;
        border-top: 1px solid #031732;
      }
      a {
        /* margin: 15px 0; */
        display: inline-block; /* Ensure the margin is applied properly */
      }
      p {
        margin: 5px 0 !important;
      }
      h2 {
        font-family: Arial;
        font-size: 18px;
        font-style: normal;
        font-weight: bold;
        line-height: 1.25;
        text-align: center;
        text-decoration: none;
        color: #ffffff;
        background: #031732;
        padding: 14px;
      }
      em {
        font-style: normal !important;
        font-weight: bold !important;
      }
    </style>
    </head>
    <body>

      <div align="center" style="line-height: 10px">
        <img class="big" src="https://controles-assets.s3.amazonaws.com/header_controles_22.png" style="display: block; height: auto; border: 0; width: 100%; max-width: 900px;" />
      </div>

      ${fileContent}

      <div align="center" style="line-height: 10px">
        <img class="big" src="https://controles-assets.s3.amazonaws.com/footer_controles_22.png" style="display: block; height: auto; border: 0; width: 100%; max-width: 900px;" />
      </div>
      <script>
      document.querySelectorAll('em').forEach((el) => {
        const text = el.innerText.toLowerCase()
        if (
          text.includes('prensa |') ||
          text.includes('televisión |') ||
          text.includes('radio |')
        ) {
          el.classList.add('isTittle')
        }
      })
      </script>
    </body>
    </html>
  `

  const params = {
    Bucket: bucket_name,
    Key: `informes/${fileName}.html`,
    Body: fullHtmlContent,
    ContentType: 'text/html', // Set MIME type to HTML
    ACL: 'public-read',
  }
  try {
    const data = await S3.upload(params).promise()
    console.log(`File uploaded successfully. ${data.Location}`)
  } catch (err) {
    console.error(`Error uploading file. ${err.message}`)
  }
}

const extractHtmlContent = async function (key) {
  try {
    // Fetch the HTML file from S3
    const s3Object = await S3.getObject({
      Bucket: bucket_name,
      Key: `informes/${key}.html`,
    }).promise()
    const htmlContent = s3Object.Body.toString('utf-8')

    // Parse the HTML using jsdom
    const dom = new JSDOM(htmlContent)
    const document = dom.window.document

    // Select elements by class
    const titles = ['Notas Directas', 'Notas de Contexto', 'Notas Competencia']
    const classes = ['notasDirectas', 'notasContexto', 'notasCompetencia']
    let extractedContent = ''

    classes.forEach((className) => {
      const elements = document.getElementsByClassName(className)
      extractedContent += `<h2>${titles[classes.indexOf(className)]}</h2>`
      for (const element of elements) {
        extractedContent += `
          ${element.outerHTML}
          <div style="width: 100%, height: 20px;"></div>
        `
      }
    })
    //console.log(JSON.stringify(extractedContent))
    await uploadFileToS3(key, extractedContent)
    return `informes/${key}.html`
  } catch (error) {
    console.error('Error reading or parsing the HTML file:', error)
    throw error
  }
}
