require('dotenv').config();
const { connectDB } = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on :${PORT}`));
  })
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });
