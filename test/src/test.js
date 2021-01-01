const fs = require('fs')
const rs = fs.createReadStream('./test1.txt')

rs.pipe(fs.createWriteStream('./test2.txt'))
rs.pipe(fs.createWriteStream('./test3.txt'))