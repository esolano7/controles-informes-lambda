const axios = require('axios')
const AWS = require('aws-sdk')
const { JSDOM } = require('jsdom')
const dynamodb = new AWS.DynamoDB.DocumentClient()
const S3 = new AWS.S3()
require('dotenv').config()

const WAAPI_API_KEY = process.env.WAAPI_API_KEY
const WAAPI_INSTANCE_ID = process.env.WAAPI_INSTANCE_ID
const BUCKET_NAME = process.env.BUCKET_NAME
const MONGODB_URI = process.env.MONGODB_URI
const MELTWATER_ACCOUNT_ID = process.env.MELTWATER_ACCOUNT_ID

const { MongoClient, ServerApiVersion } = require('mongodb')
const uri = MONGODB_URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

const oneMonthInSeconds = 30 * 24 * 60 * 60 // 30 days in seconds
const expirationTime = Math.floor(Date.now() / 1000) + oneMonthInSeconds

exports.handler = async (event) => {
  try {
    const clientes = await getClientes()

    for (const cliente of clientes) {
      const { clienteId, meltwaterId, toEmails } = cliente
      const mwId = meltwaterId.split('@')[0]
      const sendNotification = await compareFiles(mwId, toEmails)
    }
  } catch (error) {
    console.log(error)
  }
}

const compareFiles = async (mwId, toEmails) => {
  //try {
  // Fetch HTML file from URL
  const response = await axios.get(
    `https://app.meltwater.com/api/public/newsletters/${MELTWATER_ACCOUNT_ID}/newsletter/distribution/${mwId}/html`
  )
  const htmlContent = response.data
  // Fetch file from S3

  const s3ContentExists = await s3ContentExistsProc(mwId)
  if (s3ContentExists) {
    const areDifferent = await compararArchivos(mwId, htmlContent)
    if (areDifferent) {
      console.log('Send notification')
      await sendWhatsapp(toEmails, mwId, 'Controles First-Zense')
    } else {
      console.log('Do not send notification')
    }
    return
  } else {
    await putS3Content(mwId, htmlContent)
    await sendWhatsapp(toEmails, mwId, 'Controles First-Zense')
    return
  }
}

const getClientes = async function () {
  const params = [
    {
      $match: {
        correo: {
          $regex: '@meltwater\\.com$',
        },
        borrado: false,
      },
    },
    {
      $group: {
        _id: '$clienteId',
        correo: {
          $first: '$correo',
        },
      },
    },
    {
      $lookup: {
        from: 'usuarioclientes',
        let: {
          clienteId: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$clienteId', '$$clienteId'],
                  },
                  {
                    $and: [
                      {
                        $regexMatch: {
                          input: '$correo',
                          regex: '@c\\.us$',
                        },
                      },
                    ],
                  },
                  {
                    $eq: ['$borrado', false],
                  },
                ],
              },
            },
          },
          {
            $project: {
              correo: 1,
            },
          },
        ],
        as: 'toEmails',
      },
    },
    {
      $project: {
        _id: 0,
        clienteId: '$_id',
        meltwaterId: '$correo',
        toEmails: 1,
      },
    },
  ]
  try {
    await client.connect()
    const collection = await client
      .db('controles')
      .collection('usuarioclientes')
    const result = await collection.aggregate(params).toArray()
    return result
  } catch (err) {
    console.log(err)
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close()
  }
}

const s3ContentExistsProc = async function (mwId) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: `informesmw/${mwId}.html`,
    }

    await S3.headObject(params).promise()
    return true
  } catch (err) {
    if (err.code === 'NotFound') {
      return false
    } else {
      console.error('Error:', err)
    }
  }
}

const putS3Content = async function (mwId, htmlContent) {
  htmlContent = await replaceStrings(htmlContent)
  const params = {
    Bucket: BUCKET_NAME,
    Key: `informesmw/${mwId}.html`,
    Body: htmlContent,
    ContentType: 'text/html', // Set MIME type to HTML
    ACL: 'public-read',
  }
  try {
    const data = await S3.upload(params).promise()
    console.log(`File uploaded successfully. ${data.Location}`)
    return
  } catch (err) {
    console.error(`Error uploading file. ${err.message}`)
  }
}

const compararArchivos = async function (mwId, htmlContent) {
  htmlContent = await replaceStrings(htmlContent)
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: `informesmw/${mwId}.html`,
    }
    const s3Data = await S3.getObject(params).promise()
    const s3Content = s3Data.Body.toString('utf-8')

    // Compare the contents
    if (htmlContent !== s3Content) {
      console.log('Son diferentes')
      await putS3Content(mwId, htmlContent)
      return true
    } else {
      console.log('Son iguales')
      return false
    }
  } catch (error) {
    console.error('Error comparing files:', error)
  }
}

const replaceStrings = async function (htmlContent) {
  htmlContent = htmlContent.replace(
    'background-color: #F6F6F8; margin-top: 0px; margin-left: 0px; padding-left: 0px; padding-top: 0px;',
    'background-color: #F6F6F8; margin: 0px; padding: 0px;'
  )
  htmlContent = htmlContent.replace(
    'width="800"',
    'width="100%" style="max-width: 800px;"'
  )
  htmlContent = htmlContent.replace(
    '<img alt="Footer" border="0" src="https://support.assets.meltwater.io/bangalore/Megha/MWTR-574540/footer.png">',
    '<img alt="Footer" border="0" src="https://support.assets.meltwater.io/bangalore/Megha/MWTR-574540/footer.png" width="100%">'
  )
  htmlContent = htmlContent.replace(
    '<p style="color:#808080;text-align:center;font-size:12px">To unsubscribe from this newsletter <a style="color:#808080;text-decoration:none" href="https://app.meltwater.com/newsletters-unsubscribe/593f6d10a2226b1b24fd3e99?companyId=552e72ccbd555c1e62082adc" target="_blank">Click Here</a></p>',
    ''
  )
  htmlContent = htmlContent.replace(
    `<head>
<META http-equiv="Content-Type" content="text/html; charset=utf-8">`,
    `<head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta property="og:title" content="Controles First Zense Monitoreo de Medios"/>
      <meta property="og:description" content="Controles First Zense Monitoreo de Medios"/>
      <meta property="og:url" content="https://www.controles.co.cr" />
      <meta property="og:image" content="https://media.controles.co.cr/informes/whatsappCover.png"/>
      <title>Controles First Zense Monitoreo de Medios</title>
    `
  )
  return htmlContent
}

const sendWhatsapp = async function (correos, mwId, subject) {
  // whatsapp con api waapi
  for (const correo of correos) {
    //const params = {
    //  TableName: 'push_and_whatsapp',
    //  Item: {
    //    notaId: mwId,
    //    useremail: correo,
    //    message: `https://media.controles.co.cr/informesmw/${mwId}.html`,
    //    expirationTime: expirationTime,
    //  },
    //  ConditionExpression:
    //    'attribute_not_exists(notaId) AND attribute_not_exists(useremail)',
    //  ReturnConsumedCapacity: 'TOTAL',
    //}
    //console.log(params)
    try {
      // await dynamodb.put(params).promise()
      let waapilReturn = await axios({
        method: 'post',
        url: `https://waapi.app/api/v1/instances/${WAAPI_INSTANCE_ID}/client/action/send-message`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Bearer ${WAAPI_API_KEY}`,
        },
        data: {
          chatId: correo.correo,
          message: `${subject}\\n\\nhttps://media.controles.co.cr/informesmw/${mwId}.html`,
        },
      })
      //console.log('waapilReturn', waapilReturn)
    } catch (error) {
      // ya se envió
      console.log(error)
    }
  }
}
