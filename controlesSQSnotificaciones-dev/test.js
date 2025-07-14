let sqsArray = [
  {
    cliente: '5792a3868ac8f35b0aa93a12',
    nota: '62f1a722692a7bf69d91746e',
    titulo: 'PRUEBA',
    onesignalDevices: ['0278baee-8a81-11ec-9eec-0e1d3842f346'],
    correo: 'maria.robles@fifco.com',
    usuario: '585b028673a8cf472dcb9e34',
  },
  {
    cliente: '57930f718ac8f35b0aa94a6f',
    nota: '62f1a722692a7bf69d91746e',
    titulo: 'PRUEBA',
    onesignalDevices: ['07b64648-82e4-452e-8b7c-66c4c83598a6'],
    correo: 'ccordero@imacorpasesores.com',
    usuario: '6250add4f2407f78b00d7885',
  },
  {
    cliente: '57930f718ac8f35b0aa94a6f',
    nota: '62f1a722692a7bf69d91746e',
    titulo: 'PRUEBA',
    onesignalDevices: [
      'f5c47576-5fbb-11ec-849a-123a57a29f07',
      '70e5424c-cff1-416c-9a89-9095aac2240c',
    ],
    correo: 'luisporras@controles.co.cr',
    usuario: '6250addff2407f78b00d7886',
  },
  {
    cliente: '57929d268ac8f35b0aa9388d',
    nota: '62f1a722692a7bf69d91746e',
    titulo: 'PRUEBA',
    onesignalDevices: [
      'f5c47576-5fbb-11ec-849a-123a57a29f07',
      'e3130108-60bb-11ec-b52c-0e347b4dc901',
      '70e5424c-cff1-416c-9a89-9095aac2240c',
    ],
    correo: 'luisporras@controles.co.cr',
    usuario: '620277e0bad7cb0759d4cade',
  },
  {
    cliente: '5fe0d80ffd861936e5bbee7b',
    nota: '62f1a722692a7bf69d91746e',
    titulo: 'PRUEBA',
    onesignalDevices: ['f5c47576-5fbb-11ec-849a-123a57a29f07'],
    correo: 'yleon@imas.go.cr',
    usuario: '6283b8dbdef42b2d0e551482',
  },
  {
    cliente: '5fe0d80ffd861936e5bbee7b',
    nota: '62f1a722692a7bf69d91746e',
    titulo: 'PRUEBA',
    onesignalDevices: [
      'f5c47576-5fbb-11ec-849a-123a57a29f07',
      '70e5424c-cff1-416c-9a89-9095aac2240c',
    ],
    correo: 'luisporras@controles.co.cr',
    usuario: '6283c1b1def42b2d0e553335',
  },
]

let newNotas = []
let correos = []
for (const nota of sqsArray) {
  if (!correos.includes(nota.correo)) {
    correos.push(nota.correo)
    newNotas.push(nota)
  }
}
console.log(newNotas)
