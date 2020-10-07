This is an express proxy middleware. In addition to normal proxy forwarding function, it can also extend additional parameters, such as extending headers, extending URL parameters, and extending body parameters

## install
npm i express-create-proxy

## usage
```javascript
const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const { createProxy } = require('express-create-proxy')
const proxy = createProxy({
  proxy: {
    '^/api': {
      target: 'http://localhost:3002',
      pathRewrite: { // rewrite url reference to http-proxy-middleware
        '^/api': '/api'
      }
    }
  }
})
app.use(proxy)
app.listen(3000, () => {
  console.log('start at 3000')
})
```

# proxy config
```javascript
const proxy = createProxy({
  proxy: {
    '^/api': {
      target: 'http://localhost:3002',
      pathRewrite: { // rewrite url reference to http-proxy-middleware
        '^/api': '/api'
      }
    },
    '^/another': {
      target: 'http://xxxx.com'
    }
  }
})
// or proxy all
const proxy = createProxy({
  proxy: 'http://localhost:3002'
})
```

# requestOptions   (addtional params data headers for every request)
```javascript
const proxy = createProxy({
  proxy: {
    '^/api': {
      target: 'http://localhost:3002',
      pathRewrite: {
        '^/api': '/api'
      }
    }
  },
  requestOptions: {
    params: { // url search
      a: 'a'
    },
    data: { // body data
      b: 'b',
      c: 'c',
      file: { // post file (only when content-type: multipart/form-data)
        path: 'xxxx.jpg'
      }
    },
    headers: { // header
      'someHeader': 'headerValue'
    },
    beforeRequest(req, res, options) {
      // options is equal to requestOptions 
      console.log(options)
      return {
        params: {
          // some url params
          ...(options.params || {})
        },
        data: {
          // some body data
          ...(options.data || {})
        },
        headers: {
          // some headers
          ...(options.headers || {})
        }
      }
    }
  }
})
```


## modules
### 1. proxyRequest (req, res, url, options)
#### usage
```javascript
const { proxyRequest } = require('express-create-proxy')
app.get('/api/test', (req, res) => {
  proxyRequest(req, res, req.baseUrl + req.url, {
    params: {}, // aditional params
    data: {}, // aditional data
    headers: {}, // aditional headers
    // beforeRequest(req, res, options) {
    //   return options
    // }
  })
})
```

### 2. File
##### properties
1. type: file's MIME type
2. path: file's absolute path
3. size: file size
4. source: file stream (fs.createReadStream(file.path))
5. filename: file's name  defaults path.basename(file.path)
#### usage
```javascript
const { proxyRequest, File } = require('express-create-proxy')
// req.get('content-type')  must be multipart/form-data
// basic usage
app.post('/api/test', (req, res) => {
  proxyRequest(req, res, req.baseUrl + req.url, {
    params: {},
    data: {
      file: {
        path: 'xxxx.jpg',
        filename: 'xxx.jpg'  // default value is require('path').basename(file.path),
        type: 'image/jpeg' // default require('mime-types').lookup(file.path)
      }
    },
    headers: {},
    // beforeRequest(req, res, options) {
    //   return options
    // }
  })
})

// advanced usage
app.post('/api/test', (req, res) => {
  proxyRequest(req, res, req.baseUrl + req.url, {
    params: {},
    data: {
      file: new File('xxx.jpg', {
        filename: 'xxx.jpg'  // default value is require('path').basename(file.path),
        type: 'image/jpeg' // default require('mime-types').lookup(file.path)
      })
    },
    headers: {},
    // beforeRequest(req, res, options) {
    //   return options
    // }
  })
})
```

### 3. FormData
#### properties
1. form: instance of CombinedStream reference to combined-stream
2. boundary: multipart/form-data boundary defaults uuidv4()
#### methods
1. getContentType:  return `multipart/form-data; boundary=${this.boundary}`
2. getContentLength:  get form data's bytelength
3. setBoundary(boundary: String):  set boundary
4. append(key, value): append data
5. build(data: Object):   build form Data 
````javascript
const { FormData, File } = require('express-create-proxy')
const formData = new FormData()
formData.build({
  data1: 'data1',
  data2: 'data2',
  file: new File('xxxx.jpg'),
  file1: {
    path: 'xxxx.jpg'
  }
})
// build equal to 
// const data = {
//   data1: 'data1',
//   data2: 'data2',
//   file: new File('xxxx.jpg'),
//   file1: {
//     path: 'xxxx.jpg'
//   }
// }
// Object.keys(data).forEach(key => {
//   formData.append(key, data[key])
// })
````
6. pipe(src: writeStream, Duplex Transform, options: Object({hasTail: true | false}))
#### usage
```javascript
const { FormData, request, File } = require('express-create-proxy')
const formData = new FormData()
// formData.setBoundary('xxxxxx')  // set boundary defaults uuidv4()
formData.append('key', 'value')
formData.append('file1', new File(path.resolve(__dirname, '../test.txt')))
const httpReq = request('http://localhost:3003/file', {
  method: 'post',
  params: {},
  headers: { // set header  or use node clientRequest api httpReq.setHeader('content-type', formData.getContentType())
    'content-type': formData.getContentType(),
  }
})
httpReq.on('response', res => {
  console.log(res.statusCode)
})
httpReq.on('error', e => {
  console.log(e)
})
formData.pipe(httpReq, {hasTail: true}, () => { // if hasTail: false  There is no ending separator (source code is `--${this.boundary}--\r\n`) defaults true
  httpReq.setHeader('content-length', formData.getContentLength())
})
```