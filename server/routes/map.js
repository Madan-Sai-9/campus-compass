/**
 * CAMPUS COMPASS - V2 Spatial Geo-Routing API
 * Database-driven vector routing routes for Amrita Amaravati landmarks
 */

import express from 'express';
import { pool } from '../database.js';

const router = express.Router();

/**
 * Fetch all registered geographic landmark matrix coordinates
 * GET /api/v2/map/locations
 */
router.get('/locations', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM map_locations ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Map Locations Query Error:', err);
    res.status(500).json({ error: 'Failed to access infrastructure positioning matrices.' });
  }
});

/**
 * Fetch detailed asset data and compute interactive path lines
 * GET /api/v2/map/route?origin=hostel_boys&destination=acad_b
 */
router.get('/route', async (req, res) => {
  const { origin, destination } = req.query;
  
  if (!origin || !destination) {
    return res.status(400).json({ error: 'Missing baseline routing node boundaries.' });
  }

  try {
    const queryText = 'SELECT id, name, center_x, center_y, walking_time_from_hostel FROM map_locations WHERE id IN ($1, $2)';
    const { rows } = await pool.query(queryText, [origin, destination]);
    
    // Handle self-routing node edge cases
    if (origin === destination) {
      const node = rows.find(r => r.id === origin);
      if (!node) return res.status(404).json({ error: 'Target coordinate boundaries do not exist.' });
      return res.json({
        path: `M ${node.center_x} ${node.center_y} L ${node.center_x} ${node.center_y}`,
        metrics: {
          distance_units: 0,
          estimated_minutes: "Instantaneous"
        }
      });
    }

    if (rows.length < 2) {
      return res.status(404).json({ error: 'Target coordinate boundaries do not exist.' });
    }

    const startNode = rows.find(r => r.id === origin);
    const endNode = rows.find(r => r.id === destination);

    // Dynamic generation of vector pathways for the frontend map renderer
    const svgPathData = `M ${startNode.center_x} ${startNode.center_y} L ${endNode.center_x} ${endNode.center_y}`;
    const calculatedMinutes = Math.ceil(endNode.walking_time_from_hostel / 60);

    res.json({
      path: svgPathData,
      metrics: {
        distance_units: Math.round(Math.hypot(endNode.center_x - startNode.center_x, endNode.center_y - startNode.center_y)),
        estimated_minutes: calculatedMinutes === 0 ? "Instantaneous" : `${calculatedMinutes} Mins`
      }
    });
  } catch (err) {
    console.error('Geo-routing system fault:', err);
    res.status(500).json({ error: 'System routing execution fault.' });
  }
});

export default router;
