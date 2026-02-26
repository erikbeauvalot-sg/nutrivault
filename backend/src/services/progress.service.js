/**
 * Progress Service
 * Calculates goal progress, checks for new achievements, generates recommendations
 */

const db = require('../../../models');
const { Op } = db.Sequelize;

/**
 * Calculate progress percentage for a numeric goal
 * @param {number} startValue
 * @param {number} targetValue
 * @param {number} currentValue
 * @param {string} direction - 'increase' | 'decrease' | 'reach' | 'maintain'
 * @returns {number} 0-100
 */
function calculateProgress(startValue, targetValue, currentValue, direction) {
  if (currentValue === null || currentValue === undefined) return 0;
  if (targetValue === null || targetValue === undefined) return 0;

  const start = parseFloat(startValue) || parseFloat(currentValue);
  const target = parseFloat(targetValue);
  const current = parseFloat(currentValue);

  if (direction === 'increase') {
    if (target <= start) return current >= target ? 100 : 0;
    const progress = ((current - start) / (target - start)) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  if (direction === 'decrease') {
    if (target >= start) return current <= target ? 100 : 0;
    const progress = ((start - current) / (start - target)) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  if (direction === 'reach') {
    // How close to target (within 5% = 100%)
    if (Math.abs(current - target) / Math.abs(target || 1) <= 0.05) return 100;
    const distance = Math.abs(current - target);
    const totalDistance = Math.abs(start - target) || 1;
    const progress = ((totalDistance - distance) / totalDistance) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  if (direction === 'maintain') {
    // Within 5% of target = 100%
    const tolerance = Math.abs(target) * 0.05 || 1;
    if (Math.abs(current - target) <= tolerance) return 100;
    return 50; // Active maintenance, give partial credit
  }

  return 0;
}

/**
 * Get the latest measure value for a patient + definition
 */
async function getLatestMeasureValue(patientId, measureDefinitionId) {
  const measure = await db.PatientMeasure.findOne({
    where: { patient_id: patientId, measure_definition_id: measureDefinitionId },
    order: [['measured_at', 'DESC']],
    attributes: ['numeric_value', 'measured_at']
  });
  return measure ? parseFloat(measure.numeric_value) : null;
}

/**
 * Get recent measure history (last 30 days) for a goal
 */
async function getMeasureHistory(patientId, measureDefinitionId, startDate) {
  const since = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const measures = await db.PatientMeasure.findAll({
    where: {
      patient_id: patientId,
      measure_definition_id: measureDefinitionId,
      measured_at: { [Op.gte]: since }
    },
    order: [['measured_at', 'ASC']],
    attributes: ['numeric_value', 'measured_at']
  });
  return measures.map(m => ({
    value: parseFloat(m.numeric_value),
    date: m.measured_at
  }));
}

/**
 * Enrich a goal with progress data
 */
async function enrichGoalWithProgress(goal, patientId) {
  const enriched = goal.toJSON ? goal.toJSON() : { ...goal };

  if (!goal.measure_definition_id) {
    // Text-based goal: no automatic progress calculation
    enriched.progress_pct = null;
    enriched.current_value = null;
    enriched.history = [];
    return enriched;
  }

  const currentValue = await getLatestMeasureValue(patientId, goal.measure_definition_id);
  const history = await getMeasureHistory(patientId, goal.measure_definition_id, goal.start_date);

  const progress = currentValue !== null
    ? calculateProgress(goal.start_value, goal.target_value, currentValue, goal.direction)
    : 0;

  enriched.progress_pct = progress;
  enriched.current_value = currentValue;
  enriched.history = history;

  return enriched;
}

/**
 * Generate rule-based recommendation for a goal
 */
function generateRecommendation(goal, progressPct, lang = 'fr') {
  if (!goal.measure_definition_id) {
    return lang === 'fr'
      ? `Continuez à travailler sur votre objectif : ${goal.title}`
      : `Keep working on your goal: ${goal.title}`;
  }

  if (progressPct === null) {
    return lang === 'fr'
      ? 'Commencez à enregistrer des mesures pour suivre vos progrès.'
      : 'Start logging measurements to track your progress.';
  }

  const measureName = goal.measureDefinition?.display_name || goal.measureDefinition?.name || 'mesure';

  if (progressPct >= 100) {
    return lang === 'fr'
      ? `🎉 Félicitations ! Vous avez atteint votre objectif "${goal.title}". Maintenez ce cap !`
      : `🎉 Congratulations! You've reached your goal "${goal.title}". Keep it up!`;
  }
  if (progressPct >= 75) {
    return lang === 'fr'
      ? `Vous êtes presque là ! Il ne vous reste que ${100 - progressPct}% pour atteindre votre objectif "${goal.title}".`
      : `Almost there! Only ${100 - progressPct}% left to reach your goal "${goal.title}".`;
  }
  if (progressPct >= 50) {
    return lang === 'fr'
      ? `Bonne progression ! Vous avez accompli la moitié du chemin vers "${goal.title}". Continuez !`
      : `Good progress! You're halfway to "${goal.title}". Keep going!`;
  }
  if (progressPct >= 25) {
    return lang === 'fr'
      ? `Vous progressez bien vers "${goal.title}". Pensez à enregistrer régulièrement votre ${measureName}.`
      : `You're making progress toward "${goal.title}". Remember to regularly log your ${measureName}.`;
  }
  return lang === 'fr'
    ? `Commencez votre parcours vers "${goal.title}" en enregistrant régulièrement votre ${measureName}.`
    : `Start your journey to "${goal.title}" by regularly logging your ${measureName}.`;
}

/**
 * Check and award new achievements for a patient
 */
async function checkAndAwardAchievements(patientId) {
  const newAchievements = [];

  // Check: first measure ever
  const firstMeasure = await db.PatientMeasure.findOne({ where: { patient_id: patientId } });
  if (firstMeasure) {
    const exists = await db.PatientAchievement.findOne({
      where: { patient_id: patientId, achievement_type: 'first_measure' }
    });
    if (!exists) {
      const ach = await db.PatientAchievement.create({
        patient_id: patientId,
        achievement_type: 'first_measure',
        title: 'Première mesure',
        description: 'Vous avez enregistré votre première mesure !',
        badge_icon: '📏',
        reward_points: 10,
        earned_at: firstMeasure.measured_at
      });
      newAchievements.push(ach);
    }
  }

  // Check: goals completed
  const completedGoals = await db.PatientGoal.findAll({
    where: { patient_id: patientId, status: 'completed' }
  });
  for (const goal of completedGoals) {
    const exists = await db.PatientAchievement.findOne({
      where: { patient_id: patientId, achievement_type: 'goal_completed', goal_id: goal.id }
    });
    if (!exists) {
      const ach = await db.PatientAchievement.create({
        patient_id: patientId,
        goal_id: goal.id,
        achievement_type: 'goal_completed',
        title: 'Objectif atteint !',
        description: `Vous avez atteint votre objectif : ${goal.title}`,
        badge_icon: '🏆',
        reward_points: 50,
        earned_at: new Date()
      });
      newAchievements.push(ach);
    }
  }

  // Check: 7-day measure streak
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentMeasures = await db.PatientMeasure.findAll({
    where: { patient_id: patientId, measured_at: { [Op.gte]: sevenDaysAgo } },
    attributes: ['measured_at'],
    order: [['measured_at', 'ASC']]
  });
  const streak = checkMeasureStreak(recentMeasures, 7);
  if (streak >= 7) {
    const exists = await db.PatientAchievement.findOne({
      where: { patient_id: patientId, achievement_type: 'streak_7' }
    });
    if (!exists) {
      const ach = await db.PatientAchievement.create({
        patient_id: patientId,
        achievement_type: 'streak_7',
        title: 'Semaine parfaite !',
        description: '7 jours consécutifs de mesures enregistrées.',
        badge_icon: '🌟',
        reward_points: 25,
        earned_at: new Date()
      });
      newAchievements.push(ach);
    }
  }

  return newAchievements;
}

/**
 * Check if there are consecutive days with measures
 */
function checkMeasureStreak(measures, requiredDays) {
  if (!measures.length) return 0;
  const days = new Set(measures.map(m => new Date(m.measured_at).toISOString().slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < requiredDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(d.toISOString().slice(0, 10))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Get full progress summary for portal
 */
async function getProgressSummary(patientId, lang = 'fr') {
  // Load active goals
  const goals = await db.PatientGoal.findAll({
    where: { patient_id: patientId },
    include: [
      { model: db.MeasureDefinition, as: 'measureDefinition', attributes: ['id', 'name', 'display_name', 'unit'] }
    ],
    order: [['display_order', 'ASC'], ['created_at', 'ASC']]
  });

  // Enrich goals with progress
  const enrichedGoals = await Promise.all(goals.map(g => enrichGoalWithProgress(g, patientId)));

  // Auto-complete goals that reached 100%
  for (const goal of enrichedGoals) {
    if (goal.status === 'active' && goal.progress_pct === 100) {
      await db.PatientGoal.update({ status: 'completed' }, { where: { id: goal.id } });
      goal.status = 'completed';
    }
  }

  // Check for new achievements
  await checkAndAwardAchievements(patientId);

  // Load achievements
  const achievements = await db.PatientAchievement.findAll({
    where: { patient_id: patientId },
    order: [['earned_at', 'DESC']],
    limit: 20
  });

  // Total points
  const totalPoints = achievements.reduce((sum, a) => sum + (a.reward_points || 0), 0);

  // Generate recommendations
  const recommendations = enrichedGoals
    .filter(g => g.status === 'active')
    .slice(0, 3)
    .map(g => ({
      goal_id: g.id,
      goal_title: g.title,
      progress_pct: g.progress_pct,
      text: generateRecommendation(g, g.progress_pct, lang)
    }));

  // Stats
  const activeGoals = enrichedGoals.filter(g => g.status === 'active').length;
  const completedGoals = enrichedGoals.filter(g => g.status === 'completed').length;
  const totalMeasures = await db.PatientMeasure.count({ where: { patient_id: patientId } });

  return {
    goals: enrichedGoals,
    achievements,
    recommendations,
    stats: {
      total_points: totalPoints,
      active_goals: activeGoals,
      completed_goals: completedGoals,
      total_measures: totalMeasures,
      achievements_count: achievements.length
    }
  };
}

module.exports = {
  calculateProgress,
  enrichGoalWithProgress,
  generateRecommendation,
  checkAndAwardAchievements,
  getProgressSummary
};
