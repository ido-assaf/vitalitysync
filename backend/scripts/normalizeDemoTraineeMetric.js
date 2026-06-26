const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true
});

const { TraineeProfile, User, sequelize } = require("../models");

const DEMO_USERNAME = "demo.trainee";

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

async function normalizeDemoTraineeMetric() {
  await sequelize.authenticate();

  const user = await User.findOne({
    where: { username: DEMO_USERNAME, userRole: "trainee" }
  });

  if (!user) {
    throw new Error(`Trainee ${DEMO_USERNAME} was not found.`);
  }

  const profile = await TraineeProfile.findOne({ where: { userId: user.userId } });

  if (!profile) {
    throw new Error(`Trainee profile for ${DEMO_USERNAME} was not found.`);
  }

  const weight = Number(profile.weight);
  const height = Number(profile.height);
  const hasLegacyBodyValues =
    Number.isFinite(weight) &&
    weight >= 70 &&
    weight <= 700 &&
    Number.isFinite(height) &&
    height >= 48 &&
    height <= 96;

  if (!hasLegacyBodyValues) {
    console.log(
      `${DEMO_USERNAME} already has metric-compatible body data: ` +
      `${profile.weight ?? "missing"} kg, ${profile.height ?? "missing"} cm.`
    );
    return;
  }

  const metricWeight = roundOne(weight / 2.20462);
  const metricHeight = roundOne(height * 2.54);

  await profile.update({
    weight: metricWeight,
    height: metricHeight
  });

  console.log(
    `Normalized ${DEMO_USERNAME} body data to ${metricWeight} kg and ${metricHeight} cm.`
  );
}

if (require.main === module) {
  normalizeDemoTraineeMetric()
    .catch((error) => {
      console.error(`Metric normalization failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await sequelize.close();
    });
}

module.exports = {
  normalizeDemoTraineeMetric
};
