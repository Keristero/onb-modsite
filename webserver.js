//test server for running with express
const express = require('express')
const app = express()
const port = 3000


app.use(express.static('.'))

app.listen(port)
console.log(`webserver hosted on http://localhost:${port}`)