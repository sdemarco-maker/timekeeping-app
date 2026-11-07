import express, { Request, Response } from 'express';
import pool from '../database';

const router = express.Router();

// Get all cases (admin)
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM cases ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cases for employee
router.get('/employee/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(`
      SELECT c.*, ca.percentage_split
      FROM cases c
      JOIN case_assignments ca ON c.id = ca.case_id
      WHERE ca.employee_id = $1 AND c.status = 'active'
      ORDER BY c.created_at DESC
    `, [employeeId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employee cases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create case (admin)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { case_number, total_fee } = req.body;

    if (!case_number || !total_fee) {
      return res.status(400).json({ error: 'Case number and total fee required' });
    }

    const result = await pool.query(
      'INSERT INTO cases (case_number, total_fee) VALUES ($1, $2) RETURNING *',
      [case_number, total_fee]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Case number already exists' });
    }
    console.error('Error creating case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign employee to case
router.post('/:caseId/assign', async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const { employee_id, percentage_split } = req.body;

    if (!employee_id || !percentage_split) {
      return res.status(400).json({ error: 'Employee ID and percentage split required' });
    }

    const result = await pool.query(
      'INSERT INTO case_assignments (case_id, employee_id, percentage_split) VALUES ($1, $2, $3) RETURNING *',
      [caseId, employee_id, percentage_split]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Employee already assigned to this case' });
    }
    console.error('Error assigning employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close case
router.put('/:caseId/close', async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const result = await pool.query(
      'UPDATE cases SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['closed', caseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error closing case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
