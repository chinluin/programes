const path = require('path')
const express = require('express')
const SocketIO = require('socket.io')
const Jimp = require('jimp')
const fs = require('fs')
const app = express()

const port = 3005
const server = app.listen(port, () => {
  console.log('server listening on port', port)
})

const io = SocketIO(server)

app.use(express.static(path.join(__dirname, '../fe/build')))

async function main() {
  const pixelData = await Jimp.read('./pixelData.png')
  let onlineCount = 0
  
  let dotOpreations = [] //批量发送
  setInterval(() => {
    if(dotOpreations.length > 0) {
      io.emit('update-dots', dotOpreations)
      dotOpreations = []
    }
  }, 100)   //批量发送

  io.on('connection', async (socket) => {
    onlineCount++
    io.emit('online-count', onlineCount)
    
    let pngBuffer = await pixelData.getBufferAsync(Jimp.MIME_PNG)
    let lastDrawTime = 0
    socket.emit('initial-pixel-data', pngBuffer)
    socket.on('draw-dot', async ({row, col, color}) => {
      let now = Date.now()
      if(now - lastDrawTime < 2000) {
        return
      } 
      lastDrawTime = now
      let hexColor = Jimp.cssColorToHex(color)
      pixelData.setPixelColor(hexColor, col, row)

      dotOpreations.push({row, col, color}) //批量发送
  
      // io.emit('update-dot', {row, col, color})
  
      // socket.broadcast.emit('update-dot', {row, col, color})
      // socket.emit('update-dot', {row, col, color})
  
      try {
        let buf = await pixelData.getBufferAsync(Jimp.MIME_PNG)
        await fs.promises.writeFile('./pixelData.png', buf)
        console.log('save pixel data success')
      } catch(e) {
        console.log(err)
      }

    })
    socket.on('disconnect', () => {
      onlineCount--
      io.emit('online-count', onlineCount)
      console.log('someone leaves')
    })
  })
}
main()


