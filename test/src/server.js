const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const router = require('express').Router()
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
router.post('/file', upload.any(), (req, res) => {
  console.log(req.body)
  res.send(req.files)
})
router.post('/api/json', (req, res) => {
  console.log(req.headers)
  res.send(req.body)
})
router.post('/api/urlencoded', (req, res) => {
  res.send(req.body)
})
app.use(router)

// app.listen(3002, () => {
//   console.log('start at 3002')
// })

router.post('/another/file', upload.any(), (req, res) => {
  console.log(req.body)
  res.send(req.files[0])
})
router.post('/api/proxy-request', (req, res) => {
  res.send(req.body)
})
app.listen(3003, () => {
  console.log('start at 3003')
})