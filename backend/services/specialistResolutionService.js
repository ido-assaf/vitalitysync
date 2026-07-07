const { AiSpecialist, TraineeProfile } = require("../models");
const {
  availableFitnessCoachWhere,
  availableNutritionistWhere,
  isAvailableNutritionist
} = require("../utils/aiSpecialistAvailability");

// Resolves which AI Specialist acts for a trainee: the assigned specialist when
// it is available for the domain, otherwise the first available one. This is the
// single place that encodes the assigned-or-fallback rule; callers decide how to
// serialize the returned Sequelize instance.

async function resolveFitnessCoach({ userId, profile } = {}) {
  const traineeProfile =
    profile || (await TraineeProfile.findOne({ where: { userId } }));
  const aiSpecialistId = traineeProfile?.aiSpecialistId;

  let specialist = aiSpecialistId
    ? await AiSpecialist.findOne({
        where: availableFitnessCoachWhere({ specialistId: aiSpecialistId })
      })
    : null;

  if (!specialist) {
    specialist = await AiSpecialist.findOne({
      where: availableFitnessCoachWhere(),
      order: [["specialistId", "ASC"]]
    });
  }

  return specialist;
}

async function resolveNutritionist(userId) {
  const traineeProfile = await TraineeProfile.findOne({
    where: { userId },
    include: [{ model: AiSpecialist }]
  });
  const assigned = traineeProfile?.AiSpecialist;

  if (isAvailableNutritionist(assigned)) {
    return assigned;
  }

  return AiSpecialist.findOne({
    where: availableNutritionistWhere(),
    order: [["specialistId", "ASC"]]
  });
}

module.exports = {
  resolveFitnessCoach,
  resolveNutritionist
};
