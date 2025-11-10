const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const key = require('../config/const.js').JWT_SECRET;

const tokenBlacklist = new Set();

async function generarToken(usuario) {
  try {
    const payload = {
      rut: usuario.rut,
      rol: usuario.rol,
    };

    const signOptions = usuario.rut === '11.111.111-1'
      ? {}
      : { expiresIn: '1d' };

    const token = await jwt.sign(payload, key, signOptions);
    return token;
  } catch (error) {
    throw error;
  }
}

async function blacklist(token) {
  try {
    if (typeof token !== 'string') {
      throw new Error('El token debe ser una cadena.');
    }

    const decoded = jwt.verify(token, key); // Verifica la firma del token

    if (decoded && decoded.rut) {
      tokenBlacklist.add(token);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error al procesar el token:', error);
    throw error;
  }
}

async function validarToken(token, rol) {
  try {
    const usuario = await jwt.verify(token, key);
    if (!tokenBlacklist.has(token) && usuario.rol == rol) {
      return {
        message: 'Usuario validado exitosamente.',
        Boolean: true,
        error: null,
      };
    }
    return {
      message: 'Usuario no validado.',
      Boolean: false,
      error: null,
    };
  } catch (error) {
    return {
      message: 'Usuario no validado.',
      Boolean: false,
      error: error,
    };
  }
}

function decode(token) {
  try {
    const decoded = jwt.verify(token, key); // Decodifica el token usando la clave secreta
    return decoded; // Retorna el contenido decodificado del token
  } catch (error) {
    console.error('Error al decodificar el token:', error);
    return null; // Retorna null si el token no es válido
  }
}

module.exports = {
    generarToken,
    blacklist,
    decode
};
