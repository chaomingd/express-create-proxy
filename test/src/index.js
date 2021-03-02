const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const { createProxy, File, proxyRequest, FormData, request } = require('../../src/index')
const proxy = createProxy({
  proxy: {
    '^/api': {
      target: 'http://localhost',
    },
    '^/another': {
      target: 'http://localhost:3003'
    }
  },
  // proxy: 'http://localhost:3003',
  requestOptions: {
    data: {
      extraData: 'extraData'
    },
    beforeRequest(req, res, options) {
      return {
        data: {
          // extraFile: {
          //   path: path.resolve(__dirname, '../test.txt')
          // },
          extraFile: new File(path.resolve(__dirname, '../test.txt')),
          ...options.data
        },
        headers: {
          'Cookie': 'Webstorm-57d294ec=123'
        }
      }
    },
    onRequest (url, httpOptions, httpReq, req, res) {
      console.log(httpReq.getHeader('origin'))
      console.log(httpReq.getHeader('host'))
    },
    onResponse(httpRes) {
      console.log('onresponse')
    }
  }
})
app.use(express.static(path.resolve(__dirname, '../public')))
app.use(proxy)
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// app.post('/api/proxy-request', (req, res) => {
//   proxyRequest(req, res, 'http://localhost:3003' + req.baseUrl + req.url, {
//     params: {},
//     data: { // aditional data
//       proxyRequest: 'test'
//     },
//     headers: {}
//   })
// })

// const formData = new FormData()
// formData.append('key', 'value')
// formData.append('file1', new File(path.resolve(__dirname, '../test.txt')))
// const httpReq = request('http://localhost:3003/file', {
//   method: 'post',
//   params: {},
//   headers: { // set header  or use node clientRequest api httpReq.setHeader('content-type', formData.getContentType())
//     'content-type': formData.getContentType(),
//   }
// })
// httpReq.on('response', res => {
//   console.log(res.statusCode)
// })
// httpReq.on('error', e => {
//   console.log(e)
// })
// formData.pipe(httpReq, {hasTail: true}, () => {
//   httpReq.setHeader('content-length', formData.getContentLength())
// })

app.listen(3000, () => {
  console.log('start at 3000')
})