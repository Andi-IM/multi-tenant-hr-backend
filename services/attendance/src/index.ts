import 'dotenv/config';
import app from './app.js';

const port: number = process.env.PORT != null ? parseInt(process.env.PORT) : 3002;

app.listen(port, () => {
  console.log(`🚀 Attendance Service listening on port ${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
