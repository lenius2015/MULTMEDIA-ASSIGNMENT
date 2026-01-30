const express = require('express');
const router = express.Router();
const pool = require('../db');
const { isAuthenticated } = require('../middleware/auth');

// Get onboarding status
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Check if user has completed onboarding
    const [onboardingRecords] = await pool.query(
      'SELECT * FROM user_onboarding WHERE user_id = ?',
      [userId]
    );

    if (onboardingRecords.length > 0) {
      const record = onboardingRecords[0];
      res.json({
        completed: record.completed,
        skipped: record.skipped,
        completed_at: record.completed_at,
        language: record.language,
        sections_viewed: record.sections_viewed
      });
    } else {
      res.json({
        completed: false,
        skipped: false,
        first_time: true
      });
    }
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch onboarding status' });
  }
});

// Mark onboarding as complete
router.post('/complete', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { completed, skipped, language, sectionsViewed } = req.body;

    // Insert or update onboarding record
    await pool.query(`
      INSERT INTO user_onboarding (user_id, completed, skipped, language, sections_viewed, completed_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
      completed = VALUES(completed),
      skipped = VALUES(skipped),
      language = VALUES(language),
      sections_viewed = VALUES(sections_viewed),
      completed_at = NOW()
    `, [userId, completed, skipped, language, sectionsViewed]);

    res.json({ success: true, message: 'Onboarding status updated' });
  } catch (error) {
    console.error('Error updating onboarding status:', error);
    res.status(500).json({ success: false, message: 'Failed to update onboarding status' });
  }
});

// Reset onboarding (for "Help" feature)
router.post('/reset', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Delete onboarding record to reset
    await pool.query('DELETE FROM user_onboarding WHERE user_id = ?', [userId]);

    res.json({ success: true, message: 'Onboarding reset successfully' });
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    res.status(500).json({ success: false, message: 'Failed to reset onboarding' });
  }
});

module.exports = router;