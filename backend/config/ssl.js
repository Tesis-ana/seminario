// Ejemplo de configuración HTTPS para server.js
// Descomente y configure si necesita HTTPS directo en Node.js

/*
const https = require('https');
const fs = require('fs');

// Configuración SSL
const sslOptions = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  // ca: fs.readFileSync('/path/to/ca-bundle.pem') // Si usa un certificado intermedio
};

// Crear servidor HTTPS
const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(5001, '0.0.0.0', () => {
  console.log('🔒 Servidor HTTPS corriendo en puerto 5001');
});

// Opcional: Redirigir HTTP a HTTPS
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();
}).listen(80);
*/

module.exports = {
    // Configuración SSL para implementación futura
    ssl: {
        enabled: process.env.SSL_ENABLED === 'true',
        keyPath: process.env.SSL_KEY_PATH,
        certPath: process.env.SSL_CERT_PATH,
        caPath: process.env.SSL_CA_PATH,
    },
};
