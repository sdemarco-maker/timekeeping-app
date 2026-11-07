import express, { Request, Response } from 'express';
import pool from '../database';

const router = express.Router();

// Clock in
router.post('/clock-in', async (req: Request, res: Response) => {
  try {
    const { employee_id, case_id, hour_type } = req.body;

    if (!employee_id || !case_id || !hour_type) {
      return res.status(400).json({ error: 'Employee ID, case ID, and hour type required' });
    }

    // Check for active clock-in
    const active = await pool.query(
      'SELECT * FROM time_entries WHERE employee_id = $1 AND end_time IS NULL',
      [employee_id]
    );

    if (active.rows.length > 0) {
      return res.status(400).json({ error: 'Employee already clocked in' });
    }

    const result = await pool.query(
      'INSERT INTO time_entries (employee_id, case_id, start_time, hour_type) VALUES ($1, $2, CURRENT_TIMESTAMP, $3) RETURNING *',
      [employee_id, case_id, hour_type]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clock out
router.post('/clock-out', async (req: Request, res: Response) => {
  try {
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID required' });
    }

    // Get active time entry
    const active = await pool.query(
      'SELECT * FROM time_entries WHERE employee_id = $1 AND end_time IS NULL',
      [employee_id]
    );

    if (active.rows.length === 0) {
      return res.status(400).json({ error: 'No active time entry' });
    }

    const entry = active.rows[0];
    const startTime = new Date(entry.start_time);
    const endTime = new Date();
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const result = await pool.query(
      'UPDATE time_entries SET end_time = CURRENT_TIMESTAMP, duration_hours = $1 WHERE id = $2 RETURNING *',
      [durationHours, entry.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get time entries for employee
router.get('/employee/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(`
      SELECT te.*, c.case_number
      FROM time_entries te
      JOIN cases c ON te.case_id = c.id
      WHERE te.employee_id = $1
      ORDER BY te.created_at DESC
    `, [employeeId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all time entries (admin)
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT te.*, e.name, c.case_number
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      JOIN cases c ON te.case_id = c.id
      ORDER BY te.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get hours per case for employee
router.get('/case-summary/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(`
      SELECT
        c.id,
        c.case_number,
        c.total_fee,
        ca.percentage_split,
        SUM(CASE WHEN te.hour_type = 'clinical' THEN te.duration_hours ELSE 0 END) as clinical_hours,
        SUM(CASE WHEN te.hour_type = 'admin' THEN te.duration_hours ELSE 0 END) as admin_hours
      FROM cases c
      JOIN case_assignments ca ON c.id = ca.case_id
      LEFT JOIN time_entries te ON c.id = te.case_id AND te.employee_id = $1
      WHERE ca.employee_id = $1
      GROUP BY c.id, ca.percentage_split
      ORDER BY c.created_at DESC
    `, [employeeId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching case summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
