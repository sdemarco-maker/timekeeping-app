import express, { Request, Response } from 'express';
import pool from '../database';

const router = express.Router();

const CLINICAL_RATE = 60;
const ADMIN_RATE = 25;

// Generate payroll for a date range
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { payroll_date, employee_id } = req.body;

    if (!payroll_date) {
      return res.status(400).json({ error: 'Payroll date required' });
    }

    let query = `
      SELECT
        te.employee_id,
        e.name,
        SUM(CASE WHEN te.hour_type = 'clinical' THEN COALESCE(te.duration_hours, 0) ELSE 0 END) as clinical_hours,
        SUM(CASE WHEN te.hour_type = 'admin' THEN COALESCE(te.duration_hours, 0) ELSE 0 END) as admin_hours,
        ARRAY_AGG(DISTINCT json_build_object(
          'case_number', c.case_number,
          'case_fee', c.total_fee,
          'percentage_split', ca.percentage_split,
          'clinical_hours', SUM(CASE WHEN te.hour_type = 'clinical' THEN COALESCE(te.duration_hours, 0) ELSE 0 END) FILTER (WHERE c.id = te.case_id),
          'admin_hours', SUM(CASE WHEN te.hour_type = 'admin' THEN COALESCE(te.duration_hours, 0) ELSE 0 END) FILTER (WHERE c.id = te.case_id)
        )) as case_details
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      JOIN cases c ON te.case_id = c.id
      JOIN case_assignments ca ON c.id = ca.case_id AND te.employee_id = ca.employee_id
      WHERE DATE(te.created_at) <= $1
    `;

    const params: any[] = [payroll_date];

    if (employee_id) {
      query += ' AND te.employee_id = $2';
      params.push(employee_id);
    }

    query += ' GROUP BY te.employee_id, e.name';

    const result = await pool.query(query, params);

    const payrollData = result.rows.map((row: any) => {
      const clinicalHours = parseFloat(row.clinical_hours) || 0;
      const adminHours = parseFloat(row.admin_hours) || 0;
      const basePay = (clinicalHours * CLINICAL_RATE) + (adminHours * ADMIN_RATE);

      // Calculate bonus per case
      let totalBonus = 0;
      row.case_details?.forEach((caseDetail: any) => {
        if (caseDetail && caseDetail.percentage_split && caseDetail.case_fee) {
          const employeeEarnings = (caseDetail.case_fee * caseDetail.percentage_split) / 100;
          const caseBasePay = (caseDetail.clinical_hours * CLINICAL_RATE) + (caseDetail.admin_hours * ADMIN_RATE);
          const caseBonus = Math.max(0, employeeEarnings - caseBasePay);
          totalBonus += caseBonus;
        }
      });

      return {
        employee_id: row.employee_id,
        name: row.name,
        clinical_hours: clinicalHours,
        admin_hours: adminHours,
        total_bonus: totalBonus,
        total_earnings: basePay + totalBonus,
        case_breakdown: row.case_details
      };
    });

    res.json(payrollData);
  } catch (error) {
    console.error('Error generating payroll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save payroll record
router.post('/save', async (req: Request, res: Response) => {
  try {
    const { employee_id, payroll_date, clinical_hours, admin_hours, total_bonus, reimbursements } = req.body;

    if (!employee_id || !payroll_date) {
      return res.status(400).json({ error: 'Employee ID and payroll date required' });
    }

    const result = await pool.query(
      `INSERT INTO payroll_records (employee_id, payroll_date, clinical_hours, admin_hours, total_bonus, reimbursements)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id, payroll_date) DO UPDATE SET
       clinical_hours = $3, admin_hours = $4, total_bonus = $5, reimbursements = $6
       RETURNING *`,
      [employee_id, payroll_date, clinical_hours, admin_hours, total_bonus, reimbursements || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving payroll record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payroll records
router.get('/', async (req: Request, res: Response) => {
  try {
    const { employee_id, start_date, end_date } = req.query;

    let query = `
      SELECT pr.*, e.name
      FROM payroll_records pr
      JOIN employees e ON pr.employee_id = e.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (employee_id) {
      query += ` AND pr.employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }

    if (start_date) {
      query += ` AND pr.payroll_date >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND pr.payroll_date <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ' ORDER BY pr.payroll_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payroll records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
