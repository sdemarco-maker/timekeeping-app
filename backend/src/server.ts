import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database';
import employeeRoutes from './routes/employees';
import caseRoutes from './routes/cases';
import timeEntryRoutes from './routes/timeEntries';
import payrollRoutes from './routes/payroll';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Initialize database
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/payroll', payrollRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
