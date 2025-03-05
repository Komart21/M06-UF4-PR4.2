const { sequelize } = require('./config/database');
const { Usuari, Peticio } = require('./models');

async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Connexió a la base de dades establerta amb èxit.');

    // Força la recreació de les taules (elimina les dades existents)
    await sequelize.sync({ force: true });
    console.log('Models sincronitzats amb èxit.');
  } catch (error) {
    console.error('Error en la connexió o sincronització de la base de dades:', error);
  } finally {
    await sequelize.close();
  }
}

syncDatabase();
