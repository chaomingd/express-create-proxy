const fs = require('fs')
const pathLib = require('path')
const mime = require('mime-types')
const { isObject } = require('./util')
class File {
  constructor(path, options) {
    if (!path) throw new Error('path is required')
    options = options || {}
    this.size = 0
    if (!this.isAbsolutePath(path)) throw new Error('path must be absolute path')
    if (!isObject(options)) throw new Error('options must be object')
    this.path = path
    this.filename = options.filename || pathLib.basename(path)
    this.type = options.tpye || mime.lookup(path)
    this.size = this.getSize()
    this.source = fs.createReadStream(path)
  }
  isAbsolutePath(path) {
    return /^\//.test(path)
  }
  getSize() {
    if (!this.path) return 0
    if (this.size) return this.size
    try {
      const stat = fs.statSync(this.path)
      return stat.size
    } catch (error) {
      return 0
    }
  }
}

module.exports = {
  File
}