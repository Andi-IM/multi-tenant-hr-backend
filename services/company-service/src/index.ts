import 'dotenv/config';
import app from './app.js';

const port: number = process.env.PORT != null ? parseInt(process.env.PORT) : 3001;

app.listen(port, () => {
  console.log(`🚀 Company A Service listening on port ${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Company ID: ${process.env.COMPANY_ID || 'A'}`);
});