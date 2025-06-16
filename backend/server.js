const express = require('express');
const cors = require('cors');
const app = express();
const db = require("./models/index.js");
const values = require("./config/const.js");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Función para conectar a la base de datos con reintentos infinitos
async function connectToDatabase() {
  let attempt = 0;
  
  while (true) {
    attempt++;
    try {
      await db.sequelize.authenticate();
      
      // Sincronizar modelos después de conectar
      await db.sequelize.sync({ sync: true });
      console.log("🗄️ Actualización de base de datos lista.");
      return;
    } catch (error) {
      console.error(`❌ Error al conectar a la base de datos (Intento ${attempt}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Iniciar conexión a la base de datos
connectToDatabase().then(() => {
  // Configurar rutas solo después de conectar a la base de datos
  app.get("/", (req, res) => {
    res.json({ message: "Aplicación funcionando." });
  });

  // Importación de Router principal
  require('./routes/main.routes')(app);

  const PORT = values.RUN_PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error("❌ Error crítico inesperado:", error);
  process.exit(1);
});