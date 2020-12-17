const { http: followHttp, https: followHttps } = require('follow-redirects')
const http = require('http')
const https = require('https')
const urlLib = require('url')
const qs = require('qs')
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const {
  generateRule,
  urlNormalize,
  isObject,
  getBoundaryFromContentType,
  stripBOM
} = require('./util')
const { FormData } = require('./FormData')
const HTTPClientMap = {
  'http:': http,
  'https:': https
}
const redirectsHTTPClientMap = {
  'http:': followHttp,
  'https:': followHttps
}

request.defaults = {
  baseURL: '/',
}

const defaultOptions = {
  hostname: 'localhost',
  port: 80,
  protocol: 'http:'
}

const emptyObject = {}
function request (url, { params, method, ...options } = {}) {
  params = params || emptyObject
  options = options || emptyObject
  const redirect = options.redirect || false
  const requestObj = urlLib.parse(urlNormalize(url), true)
  const requestUrl = urlNormalize(request.defaults.baseURL + url)
  let urlObj
  if (requestObj.hostname) {
    urlObj = requestObj
  } else {
    urlObj = urlLib.parse(requestUrl, true)
  }
  const urlParams = { ...urlObj.query, ...params }
  const searchParams = qs.stringify(urlParams)
  const urlSearch = searchParams ? '?' + searchParams : ''
  const HTTPClient = redirect ? redirectsHTTPClientMap[urlObj.protocol] : HTTPClientMap[urlObj.protocol]
  const requestOptions = {
    hostname: urlObj.hostname || defaultOptions.hostname,
    port: getPort(urlObj.port, urlObj.protocol) || defaultOptions.port,
    path: urlObj.pathname + urlSearch,
    method: method || 'get',
    ...options
  }
  const httpRequest = HTTPClient.request(requestOptions)
  if (options.timeout) {
    httpRequest.setTimeout(options.timeout, () => {
      httpRequest.abort();
    })
  }
  return httpRequest
}
function getPort (port, protocol) {
  if (port) return port
  if (protocol === 'https:') return 443
  if (protocal === 'http:') return 80
}
function createProxy (options = { proxy, requestOptions }) {
  const proxy = options.proxy || ''
  const requestOptions = options.requestOptions
  if (typeof proxy !== 'string' && !isObject(proxy)) throw new Error('proxy must be string or object')
  if (typeof proxy === 'string') {
    return (req, res) => {
      proxyRequest(req, res, proxy + req.originalUrl, requestOptions)
    }
  }
  const ruleCahes = generateRule(proxy)
  return (req, res, next) => {
    const requestUrl = req.originalUrl
    const rule = ruleCahes.find(item => item.rule.test(requestUrl))
    if (rule) {
      const proxyConfig = rule.value
      if (typeof proxyConfig === 'string') {
        proxyRequest(req, res, proxyConfig + requestUrl, requestOptions)
      } else if (isObject(proxyConfig)) {
        if (!proxyConfig.target) throw new Error('proxy target is required')
        const pathRewrite = proxyConfig.pathRewrite
        let proxyUrl = requestUrl
        if (pathRewrite) {
          Object.keys(pathRewrite).forEach(key => {
            const reg = new RegExp(key)
            proxyUrl = proxyUrl.replace(reg, pathRewrite[key])
          })
        }
        proxyRequest(req, res, proxyConfig.target + proxyUrl, requestOptions)
      } else {
        res.status(500).send('proxyConfig must be string or Object')
      }
    } else {
      next()
    }
  }
}
function proxyRequest (req, res, url, httpOptions = {}, responseCallback) {
  httpOptions = httpOptions || {}
  let requestOptions = httpOptions
  httpOptions.beforeRequest && (requestOptions = httpOptions.beforeRequest(req, res, requestOptions))
  const { headers, header, ...resetOptions } = requestOptions
  const clientHeaders = { ...req.headers }
  delete clientHeaders['content-length'] // 
  if (resetOptions.data && !isObject(resetOptions.data)) throw new Error('data must be object')
  const httpReq = request(url, {
    method: req.method,
    headers: {
      ...clientHeaders,
      ...(header || {}),
      ...(headers || {}),
    },
    ...resetOptions
  })
  // Ensure we abort proxy if request is aborted
  req.on('aborted', (e) => {
    if (httpReq.destroy) {
      httpReq.destroy()
    } else {
      httpReq.abort() // Added in: v0.3.8Deprecated since: v14.1.0   Stability: 0 - Deprecated: Use request.destroy() instead.
    }
    console.error(e)
  })
  req.on('error', (e) => {
    if (httpReq.destroy) {
      httpReq.destroy()
    } else {
      httpReq.abort() // Added in: v0.3.8Deprecated since: v14.1.0   Stability: 0 - Deprecated: Use request.destroy() instead.
    }
    console.error(e)
  })
  httpReq.on('response', httpRes => {
    httpOptions.onResponse && httpOptions.onResponse(httpRes)
    resolveResponse(httpOptions, httpRes, res, responseCallback)
  })
  httpReq.on('error', e => {
    res.status(500).send(e.message)
    console.error(e)
  })
  httpReq.on('aborted', e => {
    res.status(500).send('request aborted')
  })
  sendRequestData(req, res, httpReq, resetOptions.data)
}

function resolveResponse (httpOptions, httpRes, res, responseCallback) {
  const headers = httpRes.headers
  Object.keys(headers).forEach(key => {
    res.set(key, headers[key])
  })
  res.status(httpRes.statusCode)
  if (responseCallback) {
    try {
      if (httpOptions.responseType === 'stream') {
        responseCallback(httpRes)
      } else {
        const responseBuffer = []
        httpRes.on('data', chunk => {
          responseBuffer.push(chunk)
        })
        httpRes.on('end', () => {
          let responseData = Buffer.concat(responseBuffer)
          if (httpOptions.responseType !== 'arraybuffer') {
            responseData = responseData.toString(httpOptions.responseEncoding)
            if (!httpOptions.responseEncoding || httpOptions.responseEncoding === 'utf8') {
              responseData = stripBOM(responseData)
            }
            try {
              responseData = JSON.parse(responseData)
            } catch (error) {
            }
          }
          responseCallback(responseData)
        })
      }
    } catch (e) {
      console.error(e)
      res.status(500).send(e.message)
    }
  } else {
    httpRes.pipe(res)
  }
}

const multipartContentType = 'multipart/form-data'
const jsonContentType = 'application/json'
const urlEncodedContentType = 'application/x-www-form-urlencoded'
const noBodyMethods = ['GET', 'HEAD', 'DELETE', 'OPTIONS']
function sendRequestData (req, res, httpReq, extraData) {
  try {
    if (noBodyMethods.some(method => method === req.method)) {
      httpReq.end()
    } else {
      const contentType = req.get('content-type')
      if (contentType.indexOf(jsonContentType) > -1) {
        resolveJson(req, httpReq, extraData)
      } else if (contentType.indexOf(urlEncodedContentType) > -1) {
        resolveUrlEncoded(req, httpReq, extraData)
      } else if (contentType.indexOf(multipartContentType) > -1) {
        resolveMultipart(req, httpReq, extraData)
      } else {
        req.pipe(httpReq)
      }
    }
  } catch (error) {
    res.status(500).send(error.message)
  }
}
function resolveJson (req, httpReq, extraData) {
  const transferEncoding = req.get('transfer-encoding')
  if (extraData) {
    if (req.body) {
      const resBody = Buffer.from(JSON.stringify({ ...req.body, ...extraData }))
      if (transferEncoding !== 'chunked') {
        httpReq.setHeader('content-length', resBody.length)
      }
      httpReq.end(resBody)
    } else {
      let body = ''
      req.on('data', chunk => {
        body += chunk
      })
      req.on('end', () => {
        try {
          let data = JSON.parse(body)
          const resBody = Buffer.from(JSON.stringify({ ...data, ...extraData }))
          if (transferEncoding !== 'chunked') {
            httpReq.setHeader('content-length', resBody.length)
          }
          httpReq.end(resBody)
        } catch (e) {
          httpReq.emit('error', e)
        }
      })
    }
  } else {
    if (transferEncoding !== 'chunked') {
      httpReq.setHeader('content-length', req.get('content-length') || 0)
    }
    req.pipe(httpReq)
  }
}
function resolveUrlEncoded (req, httpReq, extraData) {
  const transferEncoding = req.get('transfer-encoding')
  if (extraData) {
    if (req.body) {
      const resBody = Buffer.from(qs.stringify({ ...req.body, ...extraData }))
      if (transferEncoding !== 'chunked') {
        httpReq.setHeader('content-length', resBody.length)
      }
      httpReq.end(resBody)
    } else {
      let body = ''
      req.on('data', chunk => {
        body += chunk
      })
      req.on('end', () => {
        try {
          let data = qs.parse(body)
          const resBody = Buffer.from(qs.stringify({ ...data, ...extraData }))
          if (transferEncoding !== 'chunked') {
            httpReq.setHeader('content-length', resBody.length)
          }
          httpReq.end(resBody)
        } catch (e) {
          httpReq.emit('error', e)
        }
      })
    }
  } else {
    if (transferEncoding !== 'chunked') {
      httpReq.setHeader('content-length', req.get('content-length') || 0)
    }
    req.pipe(httpReq)
  }
}
function resolveMultipart (req, httpReq, extraData) {
  const contentLength = +req.get('content-length') || 0
  const transferEncoding = req.get('transfer-encoding')
  if (extraData) {
    const formData = new FormData()
    const boundary = getBoundaryFromContentType(req.get('content-type'))
    formData.setBoundary(boundary) // set boundary width front client's boundary
    formData.build(extraData)
    formData.form.append(req)
    if (transferEncoding !== 'chunked') {
      httpReq.setHeader('content-length', contentLength + formData.length)
    }
    formData.pipe(httpReq, { hasTail: false })
  } else {
    if (transferEncoding !== 'chunked') {
      httpReq.setHeader('content-length', contentLength)
    }
    req.pipe(httpReq)
  }
}

module.exports = {
  request,
  proxyRequest,
  createProxy,
  File: require('./File').File,
  FormData
}