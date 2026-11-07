// Container healthcheck: calls the service's own /health with its certificate, keeping mTLS on.
// Usage: node check-https-health.cjs <certificate name> <port>
const { readFileSync } = require('node:fs')
const https = require('node:https')

const [name, port] = process.argv.slice(2)

const request = https.get(
  {
    host: '127.0.0.1',
    port: Number(port),
    path: '/health',
    servername: name,
    ca: readFileSync('/certs/ca.crt'),
    cert: readFileSync('/certs/tls.crt'),
    key: readFileSync('/certs/tls.key'),
    timeout: 4000,
  },
  (response) => {
    response.resume()
    process.exitCode = response.statusCode === 200 ? 0 : 1
  },
)
request.on('timeout', () => request.destroy(new Error('timeout')))
request.on('error', () => {
  process.exitCode = 1
})
