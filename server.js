import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, 'dist')
const PORT = parseInt(process.env.PORT || '4173', 10)
const API_PROXY = process.env.API_PROXY || 'http://localhost:3000'

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  let filePath = path.join(DIST, url.pathname === '/' ? 'index.html' : url.pathname)

  const ext = path.extname(filePath)
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(DIST, 'index.html'), (_, indexData) => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(indexData)
        })
      } else {
        res.writeHead(500)
        res.end('Internal Server Error')
      }
      return
    }
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
})

server.listen(PORT, () => {
  console.log(`VoxWiki production server running at http://localhost:${PORT}`)
  console.log(`API proxy: ${API_PROXY}`)
})
