const express = require('express')
const app = express()
const expressWs = require('express-ws')(app)
const axios = require("axios")
const port = 3000

const clients = new Set;

app.use(express.static('data'))
app.use(express.static('src'))

app.get('/', (req, res) => {
    let dataMessage = require('./data/dataMessage.json');
    res.send(dataMessage)
})

let clientsForNotification = new Map;

app.post('/', function (req, res) {

  if (clientsForNotification.has(req.body.idClient.value)) {
    clientsForNotification.delete(req.body.idClient.value)
    clientsForNotification.set(req.body.idClient.value, req.body)
  } else {
    clientsForNotification.set(req.body.idClient.value, req.body)
  }

})


let DATA = require('./data/dataMessage')

app.ws('/', (ws, req, next) => {

  clients.add(ws);

  console.log('Новое соединение. Всего соединений:', clients.size)

  ws.on('message', (msg) => {

    let message = JSON.parse(msg);
    
    if (message.type === 'delete') {

      const id = message.value[0].id;

      DATA.forEach((item, index) => {
        if (item.id === id) {
          DATA.splice(index, 1)
        }
      })

      const newData = {
        type: 'delete',
        value: DATA
      }

      for(let client of clients) {
        client.send(JSON.stringify(newData));        
      }

    } else if (message.type === 'edit') {

      const id = message.value[0].id;

      DATA.forEach((item, index) => {
        if (item.id === id) {
          DATA.splice(index, 1, message.value[0])
          console.log(item)
        }
      })

      const newData = {
        type: 'edit',
        value: DATA
      }

      for(let client of clients) {
        client.send(JSON.stringify(newData));        
      }
    } else {

      DATA = [...message, ...DATA]

      for(let client of clients) {
        client.send(msg);        
      }

      for (let item of clientsForNotification.values()) {
        
        if (item.idClient.value !== message[0].idClient) {
          
            let notification = {
              to: item.token.value,
              title: message[0].nickName,
              body: message[0].message,
              channelId: item.channelName.value,
            }
            let notificationJson = JSON.stringify(notification)

            axios
                .post('https://exp.host/--/api/v2/push/send', notificationJson, {
                    headers: {
                        'host': 'exp.host',
                        'accept': 'application/json',
                        'accept-encoding': 'gzip, deflate',
                        'content-type': 'application/json',
                    }
                })
                .then(response => {
                  
                })
                .catch(error => console.log(error));
        } 
      }

    }


    const fs = require('fs');
    fs.writeFile('./data/dataMessage.json', JSON.stringify(DATA), (err) => {
      if(err) {
        console.log(err);
      }
        
    })

  })

  ws.on('close', () => {
    
    clients.delete(ws)
    console.log('Соединение закрыто. Всего соединений:', clients.size)
  })

})

app.listen(port, function() {
  console.log(`Started, port: 3000`)
})