const CombinedStream = require('combined-stream')
const { v4: uuidv4 } = require('uuid')
const { isObject, isBuf } = require('./util')
const { File } = require('./File')
const LINE_BREAK = '\r\n'
const LINE_BREAK_LENGTH = Buffer.byteLength(LINE_BREAK)
const DEFAULT_CONTENTTYPE = 'application/octet-stream'

class FormData {
  constructor() {
    this.form = CombinedStream.create()
    this.boundary = uuidv4()
    this.length = 0
  }
  append(key, data) {
    const header = this.header(key, data)
    this.form.append(header.header)
    this.form.append(header.value)
    this.form.append(this.footer())
  }
  getContentType () {
    return `multipart/form-data; boundary=${this.boundary}`
  }
  getContentLength () {
    return this.length
  }
  addLength (len) {
    this.length += len
  }
  setBoundary(boundary) {
    this.boundary = boundary
  }
  header(key, data) {
    let value;
    let valueLength = 0
    let header = `--${this.boundary}` + LINE_BREAK
    let isStr = false
    let isFile = false
    if ((typeof data === 'string' && (isStr = true)) || isBuf(data)) {
      value = isStr ? Buffer.from(data): data
      valueLength += value.length
      header += `Content-Disposition: form-data; name="${key}"` + LINE_BREAK + LINE_BREAK
    } else if (isObject(data) || (data instanceof File && (isFile = true))) {
      if (!data.path) throw new Error('file path is required')
      let file
      if (isFile) {
        file = data
      } else {
        file = new File(data.path, data)
      }
      header += `Content-Disposition: form-data; name="${key}"; filename="${file.filename}"` + LINE_BREAK
      header += `Content-Type: ${file.type || DEFAULT_CONTENTTYPE}` + LINE_BREAK + LINE_BREAK
      value = file.source
      valueLength += file.size
    } else {
      throw new Error('value must be string buffer File or object')
    }
    header = Buffer.from(header)
    this.addLength(header.length + valueLength)
    return {
      header,
      value,
    }
  }
  footer() {
    this.addLength(LINE_BREAK_LENGTH)
    return Buffer.from(LINE_BREAK)
  }
  tail() {
    const tail = `--${this.boundary}--` + LINE_BREAK
    this.addLength(tail.length)
    return tail
  }
  build (formData) {
    if (!isObject(formData)) throw new Error('formData must be object')
    Object.keys(formData).forEach(key => {
      if (formData[key] instanceof Array) {
        formData[key].forEach(subKey => {
          this.append(key, formData[key][subKey])
        })
      } else {
        this.append(key, formData[key])
      }
    })
  }
  pipe(src, options, cb) {
    options = options || {}
    if (!isObject(options)) throw new Error('options must be object')
    const hasTail = options.hasTail == undefined ? true : options.hasTail
    if (hasTail) {
      this.form.append(this.tail())
    }
    cb && cb()
    this.form.pipe(src)
  }
}

module.exports = {
  FormData
}