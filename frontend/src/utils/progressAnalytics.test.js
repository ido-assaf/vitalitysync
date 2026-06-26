import { calculateProgressAnalytics } from "./progressAnalytics";

function session(workoutSessionId, logDate, logs) {
  return {
    workoutSessionId,
    status: "finished",
    finishedAt: logDate,
    SetLogs: logs.map((log, index) => ({
      setLogId: `${workoutSessionId}-${index}`,
      completed: true,
      exerciseId: log.exerciseId,
      logDate,
      reps: log.reps,
      weight: log.weight,
      Exercise: {
        exerciseId: log.exerciseId,
        name: log.name
      }
    }))
  };
}

describe("calculateProgressAnalytics", () => {
  test("calculates weekly volume, comparison, daily trend, activity, and heaviest set", () => {
    const sessions = [
      session(1, "2026-06-08T12:00:00", [
        { exerciseId: 1, name: "Squat", weight: 50, reps: 5 }
      ]),
      session(2, "2026-06-15T12:00:00", [
        { exerciseId: 1, name: "Squat", weight: 55, reps: 5 }
      ]),
      session(3, "2026-06-17T12:00:00", [
        { exerciseId: 2, name: "Bench Press", weight: 60, reps: 4 }
      ])
    ];

    const analytics = calculateProgressAnalytics(
      sessions,
      new Date("2026-06-18T12:00:00")
    );

    expect(analytics.currentWeekVolume).toBe(515);
    expect(analytics.previousWeekVolume).toBe(250);
    expect(analytics.volumeChangePercent).toBeCloseTo(106);
    expect(analytics.dailyVolume.map((day) => day.volume)).toEqual([
      275,
      0,
      240,
      0,
      0,
      0,
      0
    ]);
    expect(analytics.heaviestSet.exerciseName).toBe("Bench Press");
    expect(analytics.heaviestSet.weight).toBe(60);
    expect(analytics.weekSessionCount).toBe(2);
    expect(analytics.activeDays).toBe(2);
    expect(analytics.dailyVolume[0].completedSetCount).toBe(1);
  });

  test("reports exercise improvement only after two logged sessions", () => {
    const sessions = [
      session(1, "2026-06-08T12:00:00", [
        { exerciseId: 1, name: "Squat", weight: 50, reps: 5 },
        { exerciseId: 2, name: "Row", weight: 30, reps: 8 }
      ]),
      session(2, "2026-06-15T12:00:00", [
        { exerciseId: 1, name: "Squat", weight: 55, reps: 5 }
      ])
    ];

    const analytics = calculateProgressAnalytics(
      sessions,
      new Date("2026-06-18T12:00:00")
    );

    expect(analytics.exerciseChanges).toHaveLength(1);
    expect(analytics.exerciseChanges[0]).toMatchObject({
      exerciseName: "Squat",
      label: "Improved load",
      tone: "positive"
    });
    expect(analytics.exerciseChanges[0].previous.weight).toBe(50);
    expect(analytics.exerciseChanges[0].latest.weight).toBe(55);
    expect(analytics.bestImprovement.exerciseName).toBe("Squat");
    expect(analytics.bestImprovement.weightChange).toBe(5);
    expect(analytics.achievements.some((item) => item.includes("Squat"))).toBe(true);
  });

  test("ignores incomplete and invalid logs and handles missing comparison data", () => {
    const sessions = [
      {
        workoutSessionId: 1,
        finishedAt: "2026-06-15T12:00:00",
        SetLogs: [
          {
            completed: false,
            exerciseId: 1,
            weight: 100,
            reps: 5,
            logDate: "2026-06-15T12:00:00"
          },
          {
            completed: true,
            exerciseId: 1,
            weight: "invalid",
            reps: 5,
            logDate: "2026-06-15T12:00:00"
          }
        ]
      }
    ];

    const analytics = calculateProgressAnalytics(
      sessions,
      new Date("2026-06-18T12:00:00")
    );

    expect(analytics.logCount).toBe(0);
    expect(analytics.currentWeekVolume).toBe(0);
    expect(analytics.volumeChangePercent).toBeNull();
    expect(analytics.heaviestSet).toBeNull();
  });

  test("counts bodyweight activity without adding fake weighted volume", () => {
    const analytics = calculateProgressAnalytics(
      [
        session(1, "2026-06-15T12:00:00", [
          { exerciseId: 4, name: "Push Up", weight: 0, reps: 15 }
        ])
      ],
      new Date("2026-06-18T12:00:00")
    );

    expect(analytics.currentWeekVolume).toBe(0);
    expect(analytics.bodyweightSetCount).toBe(1);
    expect(analytics.activeDays).toBe(1);
    expect(analytics.heaviestSet).toBeNull();
  });

  test("labels extra reps at the same weight without claiming a load increase", () => {
    const analytics = calculateProgressAnalytics(
      [
        session(1, "2026-06-08T12:00:00", [
          { exerciseId: 1, name: "Squat", weight: 50, reps: 5 }
        ]),
        session(2, "2026-06-15T12:00:00", [
          { exerciseId: 1, name: "Squat", weight: 50, reps: 8 }
        ])
      ],
      new Date("2026-06-18T12:00:00")
    );

    expect(analytics.exerciseChanges[0]).toMatchObject({
      label: "More reps",
      tone: "positive"
    });
    expect(analytics.bestImprovement).toMatchObject({
      exerciseName: "Squat",
      repsChange: 3
    });
  });

  test("prefers a maintained-reps load increase over a reps-only improvement", () => {
    const analytics = calculateProgressAnalytics(
      [
        session(1, "2026-06-01T12:00:00", [
          { exerciseId: 1, name: "Squat", weight: 50, reps: 5 },
          { exerciseId: 2, name: "Row", weight: 30, reps: 8 }
        ]),
        session(2, "2026-06-08T12:00:00", [
          { exerciseId: 1, name: "Squat", weight: 55, reps: 5 },
          { exerciseId: 2, name: "Row", weight: 30, reps: 12 }
        ])
      ],
      new Date("2026-06-18T12:00:00")
    );

    expect(analytics.bestImprovement).toMatchObject({
      exerciseName: "Squat",
      label: "Improved load"
    });
  });
});
