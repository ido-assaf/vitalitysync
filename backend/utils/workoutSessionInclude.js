const { Exercise, SetLog, User, WorkoutIssue, WorkoutPlan } = require("../models");

// Shared WorkoutSession eager-load tree (User + WorkoutPlan + SetLog/Exercise +
// WorkoutIssue). Callers pass their exact User attribute list — the consumers
// intentionally expose different user fields and response payloads must stay
// identical, so the attributes are not unioned here.
function buildWorkoutSessionInclude({ userAttributes }) {
  return [
    {
      model: User,
      attributes: userAttributes
    },
    { model: WorkoutPlan },
    {
      model: SetLog,
      include: [{ model: Exercise }]
    },
    { model: WorkoutIssue }
  ];
}

module.exports = { buildWorkoutSessionInclude };
