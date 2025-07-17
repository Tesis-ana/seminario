const db = require('../models');

const crearAtencion = async (req, res) => {
  const { paciente_id, profesional_id } = req.body;
  if (!paciente_id || !profesional_id) {
    return res.status(400).json({ message: 'Datos incompletos.' });
  }
  try {
    await db.Atencion.upsert({
      paciente_id,
      profesional_id,
      fecha_atencion: new Date()
    });
    res.status(200).json({ message: 'Atencion registrada.' });
  } catch (err) {
    res.status(500).json({ message: 'Error al registrar atencion.', err });
  }
};

module.exports = { crearAtencion };
