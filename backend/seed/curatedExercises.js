const { Exercise } = require("../models");

const curatedExercises = [
  {
    "name": "Barbell Bench Press - Medium Grip",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Mid Chest",
    "equipment": "barbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "Lie back on a flat bench. Using a medium width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
      "From the starting position, breathe in and begin coming down slowly until the bar touches your middle chest.",
      "After a brief pause, push the bar back to the starting position as you breathe out. Focus on pushing the bar using your chest muscles. Lock your arms and squeeze your chest in the contracted position at the top of the motion, hold for a second and then start coming down slowly again. Tip: Ideally, lowering the weight should take about twice as long as raising it.",
      "Repeat the movement for the prescribed amount of repetitions.",
      "When you are done, place the bar back in the rack."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Mid Chest. Source id: Barbell_Bench_Press_-_Medium_Grip."
  },
  {
    "name": "Barbell Incline Bench Press - Medium Grip",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Upper Chest",
    "equipment": "barbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "Lie back on an incline bench. Using a medium-width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
      "As you breathe in, come down slowly until you feel the bar on you upper chest.",
      "After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your chest muscles. Lock your arms in the contracted position, squeeze your chest, hold for a second and then start coming down slowly again. Tip: it should take at least twice as long to go down than to come up.",
      "Repeat the movement for the prescribed amount of repetitions.",
      "When you are done, place the bar back in the rack."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Upper Chest. Source id: Barbell_Incline_Bench_Press_-_Medium_Grip."
  },
  {
    "name": "Decline Barbell Bench Press",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Lower Chest",
    "equipment": "barbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "Secure your legs at the end of the decline bench and slowly lay down on the bench.",
      "Using a medium width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. The arms should be perpendicular to the floor. This will be your starting position. Tip: In order to protect your rotator cuff, it is best if you have a spotter help you lift the barbell off the rack.",
      "As you breathe in, come down slowly until you feel the bar on your lower chest.",
      "After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your chest muscles. Lock your arms and squeeze your chest in the contracted position, hold for a second and then start coming down slowly again. Tip: It should take at least twice as long to go down than to come up).",
      "Repeat the movement for the prescribed amount of repetitions.",
      "When you are done, place the bar back in the rack."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Barbell_Bench_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Lower Chest. Source id: Decline_Barbell_Bench_Press."
  },
  {
    "name": "Dumbbell Bench Press",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Mid Chest",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "Lie down on a flat bench with a dumbbell in each hand resting on top of your thighs. The palms of your hands will be facing each other.",
      "Then, using your thighs to help raise the dumbbells up, lift the dumbbells one at a time so that you can hold them in front of you at shoulder width.",
      "Once at shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. The dumbbells should be just to the sides of your chest, with your upper arm and forearm creating a 90 degree angle. Be sure to maintain full control of the dumbbells at all times. This will be your starting position.",
      "Then, as you breathe out, use your chest to push the dumbbells up. Lock your arms at the top of the lift and squeeze your chest, hold for a second and then begin coming down slowly. Tip: Ideally, lowering the weight should take about twice as long as raising it.",
      "Repeat the movement for the prescribed amount of repetitions of your training program."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Mid Chest. Source id: Dumbbell_Bench_Press."
  },
  {
    "name": "Incline Dumbbell Press",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Upper Chest",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "Lie back on an incline bench with a dumbbell in each hand atop your thighs. The palms of your hands will be facing each other.",
      "Then, using your thighs to help push the dumbbells up, lift the dumbbells one at a time so that you can hold them at shoulder width.",
      "Once you have the dumbbells raised to shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. This will be your starting position.",
      "Be sure to keep full control of the dumbbells at all times. Then breathe out and push the dumbbells up with your chest.",
      "Lock your arms at the top, hold for a second, and then start slowly lowering the weight. Tip Ideally, lowering the weights should take about twice as long as raising them.",
      "Repeat the movement for the prescribed amount of repetitions.",
      "When you are done, place the dumbbells back on your thighs and then on the floor. This is the safest manner to release the dumbbells."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Upper Chest. Source id: Incline_Dumbbell_Press."
  },
  {
    "name": "Decline Dumbbell Bench Press",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Lower Chest",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "Secure your legs at the end of the decline bench and lie down with a dumbbell on each hand on top of your thighs. The palms of your hand will be facing each other.",
      "Once you are laying down, move the dumbbells in front of you at shoulder width.",
      "Once at shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. This will be your starting position.",
      "Bring down the weights slowly to your side as you breathe out. Keep full control of the dumbbells at all times. Tip: Throughout the motion, the forearms should always be perpendicular to the floor.",
      "As you breathe out, push the dumbbells up using your pectoral muscles. Lock your arms in the contracted position, squeeze your chest, hold for a second and then start coming down slowly. Tip: It should take at least twice as long to go down than to come up..",
      "Repeat the movement for the prescribed amount of repetitions of your training program."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Dumbbell_Bench_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Lower Chest. Source id: Decline_Dumbbell_Bench_Press."
  },
  {
    "name": "Dumbbell Flyes",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Chest Isolation",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Lie down on a flat bench with a dumbbell on each hand resting on top of your thighs. The palms of your hand will be facing each other.",
      "Then using your thighs to help raise the dumbbells, lift the dumbbells one at a time so you can hold them in front of you at shoulder width with the palms of your hands facing each other. Raise the dumbbells up like you're pressing them, but stop and hold just before you lock out. This will be your starting position.",
      "With a slight bend on your elbows in order to prevent stress at the biceps tendon, lower your arms out at both sides in a wide arc until you feel a stretch on your chest. Breathe in as you perform this portion of the movement. Tip: Keep in mind that throughout the movement, the arms should remain stationary; the movement should only occur at the shoulder joint.",
      "Return your arms back to the starting position as you squeeze your chest muscles and breathe out. Tip: Make sure to use the same arc of motion used to lower the weights.",
      "Hold for a second at the contracted position and repeat the movement for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Chest Isolation. Source id: Dumbbell_Flyes."
  },
  {
    "name": "Incline Dumbbell Flyes",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Upper Chest",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "compound",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "Hold a dumbbell on each hand and lie on an incline bench that is set to an incline angle of no more than 30 degrees.",
      "Extend your arms above you with a slight bend at the elbows.",
      "Now rotate the wrists so that the palms of your hands are facing you. Tip: The pinky fingers should be next to each other. This will be your starting position.",
      "As you breathe in, start to slowly lower the arms to the side while keeping the arms extended and while rotating the wrists until the palms of the hand are facing each other. Tip: At the end of the movement the arms will be by your side with the palms facing the ceiling.",
      "As you exhale start to bring the dumbbells back up to the starting position by reversing the motion and rotating the hands so that the pinky fingers are next to each other again. Tip: Keep in mind that the movement will only happen at the shoulder joint and at the wrist. There is no motion that happens at the elbow joint.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Flyes/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Upper Chest. Source id: Incline_Dumbbell_Flyes."
  },
  {
    "name": "Cable Crossover",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Chest Isolation",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "To get yourself into the starting position, place the pulleys on a high position (above your head), select the resistance to be used and hold the pulleys in each hand.",
      "Step forward in front of an imaginary straight line between both pulleys while pulling your arms together in front of you. Your torso should have a small forward bend from the waist. This will be your starting position.",
      "With a slight bend on your elbows in order to prevent stress at the biceps tendon, extend your arms to the side (straight out at both sides) in a wide arc until you feel a stretch on your chest. Breathe in as you perform this portion of the movement. Tip: Keep in mind that throughout the movement, the arms and torso should remain stationary; the movement should only occur at the shoulder joint.",
      "Return your arms back to the starting position as you breathe out. Make sure to use the same arc of motion used to lower the weights.",
      "Hold for a second at the starting position and repeat the movement for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Chest Isolation. Source id: Cable_Crossover."
  },
  {
    "name": "Low Cable Crossover",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Upper Chest",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "To move into the starting position, place the pulleys at the low position, select the resistance to be used and grasp a handle in each hand.",
      "Step forward, gaining tension in the pulleys. Your palms should be facing forward, hands below the waist, and your arms straight. This will be your starting position.",
      "With a slight bend in your arms, draw your hands upward and toward the midline of your body. Your hands should come together in front of your chest, palms facing up.",
      "Return your arms back to the starting position after a brief pause."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Low_Cable_Crossover/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Upper Chest. Source id: Low_Cable_Crossover."
  },
  {
    "name": "Leverage Incline Chest Press",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Upper Chest",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "Load an appropriate weight onto the pins and adjust the seat for your height. The handles should be near the top of the pectorals at the beginning of the motion. Your chest and head should be up and your shoulder blades retracted. This will be your starting position.",
      "Press the handles forward by extending through the elbow.",
      "After a brief pause at the top, return the weight just above the start position, keeping tension on the muscles by not returning the weight to the stops until the set is complete."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leverage_Incline_Chest_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Upper Chest. Source id: Leverage_Incline_Chest_Press."
  },
  {
    "name": "Pushups",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Mid Chest",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "Lie on the floor face down and place your hands about 36 inches apart while holding your torso up at arms length.",
      "Next, lower yourself downward until your chest almost touches the floor as you inhale.",
      "Now breathe out and press your upper body back up to the starting position while squeezing your chest.",
      "After a brief pause at the top contracted position, you can begin to lower yourself downward again for as many repetitions as needed."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Mid Chest. Source id: Pushups."
  },
  {
    "name": "Chin-Up",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Lats",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "vertical pull",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Grab the pull-up bar with the palms facing your torso and a grip closer than the shoulder width.",
      "As you have both arms extended in front of you holding the bar at the chosen grip width, keep your torso as straight as possible while creating a curvature on your lower back and sticking your chest out. This is your starting position. Tip: Keeping the torso as straight as possible maximizes biceps stimulation while minimizing back involvement.",
      "As you breathe out, pull your torso up until your head is around the level of the pull-up bar. Concentrate on using the biceps muscles in order to perform the movement. Keep the elbows close to your body. Tip: The upper torso should remain stationary as it moves through space and only the arms should move. The forearms should do no other work other than hold the bar.",
      "After a second of squeezing the biceps in the contracted position, slowly lower your torso back to the starting position; when your arms are fully extended. Breathe in as you perform this portion of the movement.",
      "Repeat this motion for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Chin-Up/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Lats. Source id: Chin-Up."
  },
  {
    "name": "Pullups",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Lats",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "vertical pull",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Grab the pull-up bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than your shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.",
      "As you have both arms extended in front of you holding the bar at the chosen grip width, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.",
      "Pull your torso up until the bar touches your upper chest by drawing the shoulders and the upper arms down and back. Exhale as you perform this portion of the movement. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary as it moves through space and only the arms should move. The forearms should do no other work other than hold the bar.",
      "After a second on the contracted position, start to inhale and slowly lower your torso back to the starting position when your arms are fully extended and the lats are fully stretched.",
      "Repeat this motion for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Lats. Source id: Pullups."
  },
  {
    "name": "Close-Grip Front Lat Pulldown",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Lats",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "vertical pull",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Sit down on a pull-down machine with a wide bar attached to the top pulley. Make sure that you adjust the knee pad of the machine to fit your height. These pads will prevent your body from being raised by the resistance attached to the bar.",
      "Grab the bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than your shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.",
      "As you have both arms extended in front of you - while holding the bar at the chosen grip width - bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.",
      "As you breathe out, bring the bar down until it touches your upper chest by drawing the shoulders and the upper arms down and back. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary (only the arms should move). The forearms should do no other work except for holding the bar; therefore do not try to pull the bar down using the forearms.",
      "After a second in the contracted position, while squeezing your shoulder blades together, slowly raise the bar back to the starting position when your arms are fully extended and the lats are fully stretched. Inhale during this portion of the movement.",
      "6. Repeat this motion for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Lats. Source id: Close-Grip_Front_Lat_Pulldown."
  },
  {
    "name": "Wide-Grip Lat Pulldown",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Lats",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "vertical pull",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Sit down on a pull-down machine with a wide bar attached to the top pulley. Make sure that you adjust the knee pad of the machine to fit your height. These pads will prevent your body from being raised by the resistance attached to the bar.",
      "Grab the bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.",
      "As you have both arms extended in front of you holding the bar at the chosen grip width, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.",
      "As you breathe out, bring the bar down until it touches your upper chest by drawing the shoulders and the upper arms down and back. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary and only the arms should move. The forearms should do no other work except for holding the bar; therefore do not try to pull down the bar using the forearms.",
      "After a second at the contracted position squeezing your shoulder blades together, slowly raise the bar back to the starting position when your arms are fully extended and the lats are fully stretched. Inhale during this portion of the movement.",
      "Repeat this motion for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Lats. Source id: Wide-Grip_Lat_Pulldown."
  },
  {
    "name": "Straight-Arm Pulldown",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Lats",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "vertical pull",
    "goalTags": [
      "strength",
      "isolation"
    ],
    "instructions": [
      "You will start by grabbing the wide bar from the top pulley of a pulldown machine and using a wider than shoulder-width pronated (palms down) grip. Step backwards two feet or so.",
      "Bend your torso forward at the waist by around 30-degrees with your arms fully extended in front of you and a slight bend at the elbows. If your arms are not fully extended then you need to step a bit more backwards until they are. Once your arms are fully extended and your torso is slightly bent at the waist, tighten the lats and then you are ready to begin.",
      "While keeping the arms straight, pull the bar down by contracting the lats until your hands are next to the side of the thighs. Breathe out as you perform this step.",
      "While keeping the arms straight, go back to the starting position while breathing in.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Straight-Arm_Pulldown/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Lats. Source id: Straight-Arm_Pulldown."
  },
  {
    "name": "One Arm Lat Pulldown",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Lats",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "vertical pull",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Select an appropriate weight and adjust the knee pad to help keep you down. Grasp the handle with a pronated grip. This will be your starting position.",
      "Pull the handle down, squeezing your elbow to your side as you flex the elbow.",
      "Pause at the bottom of the motion, and then slowly return the handle to the starting position.",
      "For multiple repetitions, avoid completely returning the weight to keep tension on the muscles being worked."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One_Arm_Lat_Pulldown/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Lats. Source id: One_Arm_Lat_Pulldown."
  },
  {
    "name": "Bent Over Barbell Row",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Mid Back",
    "equipment": "barbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal pull",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Holding a barbell with a pronated grip (palms facing down), bend your knees slightly and bring your torso forward, by bending at the waist, while keeping the back straight until it is almost parallel to the floor. Tip: Make sure that you keep the head up. The barbell should hang directly in front of you as your arms hang perpendicular to the floor and your torso. This is your starting position.",
      "Now, while keeping the torso stationary, breathe out and lift the barbell to you. Keep the elbows close to the body and only use the forearms to hold the weight. At the top contracted position, squeeze the back muscles and hold for a brief pause.",
      "Then inhale and slowly lower the barbell back to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Mid Back. Source id: Bent_Over_Barbell_Row."
  },
  {
    "name": "One-Arm Dumbbell Row",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Mid Back",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal pull",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Choose a flat bench and place a dumbbell on each side of it.",
      "Place the right leg on top of the end of the bench, bend your torso forward from the waist until your upper body is parallel to the floor, and place your right hand on the other end of the bench for support.",
      "Use the left hand to pick up the dumbbell on the floor and hold the weight while keeping your lower back straight. The palm of the hand should be facing your torso. This will be your starting position.",
      "Pull the resistance straight up to the side of your chest, keeping your upper arm close to your side and keeping the torso stationary. Breathe out as you perform this step. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. Also, make sure that the force is performed with the back muscles and not the arms. Finally, the upper torso should remain stationary and only the arms should move. The forearms should do no other work except for holding the dumbbell; therefore do not try to pull the dumbbell up using the forearms.",
      "Lower the resistance straight down to the starting position. Breathe in as you perform this step.",
      "Repeat the movement for the specified amount of repetitions.",
      "Switch sides and repeat again with the other arm."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Dumbbell_Row/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Mid Back. Source id: One-Arm_Dumbbell_Row."
  },
  {
    "name": "Seated Cable Rows",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Mid Back",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal pull",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "For this exercise you will need access to a low pulley row machine with a V-bar. Note: The V-bar will enable you to have a neutral grip where the palms of your hands face each other. To get into the starting position, first sit down on the machine and place your feet on the front platform or crossbar provided making sure that your knees are slightly bent and not locked.",
      "Lean over as you keep the natural alignment of your back and grab the V-bar handles.",
      "With your arms extended pull back until your torso is at a 90-degree angle from your legs. Your back should be slightly arched and your chest should be sticking out. You should be feeling a nice stretch on your lats as you hold the bar in front of you. This is the starting position of the exercise.",
      "Keeping the torso stationary, pull the handles back towards your torso while keeping the arms close to it until you touch the abdominals. Breathe out as you perform that movement. At that point you should be squeezing your back muscles hard. Hold that contraction for a second and slowly go back to the original position while breathing in.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Mid Back. Source id: Seated_Cable_Rows."
  },
  {
    "name": "T-Bar Row with Handle",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Mid Back",
    "equipment": "barbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal pull",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Position a bar into a landmine or in a corner to keep it from moving. Load an appropriate weight onto your end.",
      "Stand over the bar, and position a Double D row handle around the bar next to the collar. Using your hips and legs, rise to a standing position.",
      "Assume a wide stance with your hips back and your chest up. Your arms should be extended. This will be your starting position.",
      "Pull the weight to your upper abdomen by retracting the shoulder blades and flexing the elbows. Do not jerk the weight or cheat during the movement.",
      "After a brief pause, return to the starting position."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/T-Bar_Row_with_Handle/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Mid Back. Source id: T-Bar_Row_with_Handle."
  },
  {
    "name": "Inverted Row",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Mid Back",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal pull",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Position a bar in a rack to about waist height. You can also use a smith machine.",
      "Take a wider than shoulder width grip on the bar and position yourself hanging underneath the bar. Your body should be straight with your heels on the ground with your arms fully extended. This will be your starting position.",
      "Begin by flexing the elbow, pulling your chest towards the bar. Retract your shoulder blades as you perform the movement.",
      "Pause at the top of the motion, and return yourself to the start position.",
      "Repeat for the desired number of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Inverted_Row/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Mid Back. Source id: Inverted_Row."
  },
  {
    "name": "Leverage High Row",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Mid Back",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal pull",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Load an appropriate weight onto the pins and adjust the seat height so that you can just reach the handles above you. Adjust the knee pad to help keep you down. Grasp the handles with a pronated grip. This will be your starting position.",
      "Pull the handles towards your torso, retracting your shoulder blades as you flex the elbow.",
      "Pause at the bottom of the motion, and then slowly return the handles to the starting position.",
      "For multiple repetitions, avoid completely returning the weight to the stops to keep tension on the muscles being worked."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leverage_High_Row/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Mid Back. Source id: Leverage_High_Row."
  },
  {
    "name": "Barbell Deadlift",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Lower Back",
    "equipment": "barbell",
    "difficulty": "intermediate",
    "level": "intermediate",
    "movementPattern": "hinge/posterior chain",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Stand in front of a loaded barbell.",
      "While keeping the back as straight as possible, bend your knees, bend forward and grasp the bar using a medium (shoulder width) overhand grip. This will be the starting position of the exercise. Tip: If it is difficult to hold on to the bar with this grip, alternate your grip or use wrist straps.",
      "While holding the bar, start the lift by pushing with your legs while simultaneously getting your torso to the upright position as you breathe out. In the upright position, stick your chest out and contract the back by bringing the shoulder blades back. Think of how the soldiers in the military look when they are in standing in attention.",
      "Go back to the starting position by bending at the knees while simultaneously leaning the torso forward at the waist while keeping the back straight. When the weights on the bar touch the floor you are back at the starting position and ready to perform another repetition.",
      "Perform the amount of repetitions prescribed in the program."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Lower Back. Source id: Barbell_Deadlift."
  },
  {
    "name": "Hyperextensions (Back Extensions)",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Lower Back",
    "equipment": "other",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "hinge/posterior chain",
    "goalTags": [
      "strength",
      "isolation"
    ],
    "instructions": [
      "Lie face down on a hyperextension bench, tucking your ankles securely under the footpads.",
      "Adjust the upper pad if possible so your upper thighs lie flat across the wide pad, leaving enough room for you to bend at the waist without any restriction.",
      "With your body straight, cross your arms in front of you (my preference) or behind your head. This will be your starting position. Tip: You can also hold a weight plate for extra resistance in front of you under your crossed arms.",
      "Start bending forward slowly at the waist as far as you can while keeping your back flat. Inhale as you perform this movement. Keep moving forward until you feel a nice stretch on the hamstrings and you can no longer keep going without a rounding of the back. Tip: Never round the back as you perform this exercise. Also, some people can go farther than others. The key thing is that you go as far as your body allows you to without rounding the back.",
      "Slowly raise your torso back to the initial position as you inhale. Tip: Avoid the temptation to arch your back past a straight line. Also, do not swing the torso at any time in order to protect the back from injury.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hyperextensions_Back_Extensions/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Lower Back. Source id: Hyperextensions_Back_Extensions."
  },
  {
    "name": "Stiff Leg Barbell Good Morning",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Lower Back",
    "equipment": "barbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "hinge/posterior chain",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack that best matches your height. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it.",
      "Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso.",
      "Step away from the rack and position your legs using a shoulder width medium stance. Keep your head up at all times as looking down will get you off balance and also maintain a straight back. This will be your starting position.",
      "Keeping your legs stationary, move your torso forward by bending at the hips while inhaling. Lower your torso until it is parallel with the floor.",
      "Begin to raise the bar as you exhale by elevating your torso back to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stiff_Leg_Barbell_Good_Morning/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Lower Back. Source id: Stiff_Leg_Barbell_Good_Morning."
  },
  {
    "name": "Dumbbell Shrug",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Traps",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "isolation",
    "goalTags": [
      "strength",
      "isolation"
    ],
    "instructions": [
      "Stand erect with a dumbbell on each hand (palms facing your torso), arms extended on the sides.",
      "Lift the dumbbells by elevating the shoulders as high as possible while you exhale. Hold the contraction at the top for a second. Tip: The arms should remain extended at all times. Refrain from using the biceps to help lift the dumbbells. Only the shoulders should be moving up and down.",
      "Lower the dumbbells back to the original position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shrug/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Traps. Source id: Dumbbell_Shrug."
  },
  {
    "name": "Barbell Shrug",
    "muscleGroup": "Back",
    "mainMuscleGroup": "Back",
    "subMuscleGroup": "Traps",
    "equipment": "barbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "isolation",
    "goalTags": [
      "strength",
      "isolation"
    ],
    "instructions": [
      "Stand up straight with your feet at shoulder width as you hold a barbell with both hands in front of you using a pronated grip (palms facing the thighs). Tip: Your hands should be a little wider than shoulder width apart. You can use wrist wraps for this exercise for a better grip. This will be your starting position.",
      "Raise your shoulders up as far as you can go as you breathe out and hold the contraction for a second. Tip: Refrain from trying to lift the barbell by using your biceps.",
      "Slowly return to the starting position as you breathe in.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shrug/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Traps. Source id: Barbell_Shrug."
  },
  {
    "name": "Barbell Shoulder Press",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Front Delts",
    "equipment": "barbell",
    "difficulty": "intermediate",
    "level": "intermediate",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Sit on a bench with back support in a squat rack. Position a barbell at a height that is just above your head. Grab the barbell with a pronated grip (palms facing forward).",
      "Once you pick up the barbell with the correct grip width, lift the bar up over your head by locking your arms. Hold at about shoulder level and slightly in front of your head. This is your starting position.",
      "Lower the bar down to the shoulders slowly as you inhale.",
      "Lift the bar back up to the starting position as you exhale.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shoulder_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Front Delts. Source id: Barbell_Shoulder_Press."
  },
  {
    "name": "Seated Dumbbell Press",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Front Delts",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Grab a couple of dumbbells and sit on a military press bench or a utility bench that has a back support on it as you place the dumbbells upright on top of your thighs.",
      "Clean the dumbbells up one at a time by using your thighs to bring the dumbbells up to shoulder height at each side.",
      "Rotate the wrists so that the palms of your hands are facing forward. This is your starting position.",
      "As you exhale, push the dumbbells up until they touch at the top.",
      "After a second pause, slowly come down back to the starting position as you inhale.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Front Delts. Source id: Seated_Dumbbell_Press."
  },
  {
    "name": "Arnold Dumbbell Press",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Front Delts",
    "equipment": "dumbbell",
    "difficulty": "intermediate",
    "level": "intermediate",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Sit on an exercise bench with back support and hold two dumbbells in front of you at about upper chest level with your palms facing your body and your elbows bent. Tip: Your arms should be next to your torso. The starting position should look like the contracted portion of a dumbbell curl.",
      "Now to perform the movement, raise the dumbbells as you rotate the palms of your hands until they are facing forward.",
      "Continue lifting the dumbbells until your arms are extended above you in straight arm position. Breathe out as you perform this portion of the movement.",
      "After a second pause at the top, begin to lower the dumbbells to the original position by rotating the palms of your hands towards you. Tip: The left arm will be rotated in a counter clockwise manner while the right one will be rotated clockwise. Breathe in as you perform this portion of the movement.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arnold_Dumbbell_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Front Delts. Source id: Arnold_Dumbbell_Press."
  },
  {
    "name": "Dumbbell Shoulder Press",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Front Delts",
    "equipment": "dumbbell",
    "difficulty": "intermediate",
    "level": "intermediate",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "While holding a dumbbell in each hand, sit on a military press bench or utility bench that has back support. Place the dumbbells upright on top of your thighs.",
      "Now raise the dumbbells to shoulder height one at a time using your thighs to help propel them up into position.",
      "Make sure to rotate your wrists so that the palms of your hands are facing forward. This is your starting position.",
      "Now, exhale and push the dumbbells upward until they touch at the top.",
      "Then, after a brief pause at the top contracted position, slowly lower the weights back down to the starting position while inhaling.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Front Delts. Source id: Dumbbell_Shoulder_Press."
  },
  {
    "name": "One-Arm Side Laterals",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Side Delts",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Pick a dumbbell and place it in one of your hands. Your non lifting hand should be used to grab something steady such as an incline bench press. Lean towards your lifting arm and away from the hand that is gripping the incline bench as this will allow you to keep your balance.",
      "Stand with a straight torso and have the dumbbell by your side at arm's length with the palm of the hand facing you. This will be your starting position.",
      "While maintaining the torso stationary (no swinging), lift the dumbbell to your side with a slight bend on the elbow and your hand slightly tilted forward as if pouring water in a glass. Continue to go up until you arm is parallel to the floor. Exhale as you execute this movement and pause for a second at the top.",
      "Lower the dumbbell back down slowly to the starting position as you inhale.",
      "Repeat for the recommended amount of repetitions.",
      "Switch arms and repeat the exercise."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Side_Laterals/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Side Delts. Source id: One-Arm_Side_Laterals."
  },
  {
    "name": "Seated Side Lateral Raise",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Side Delts",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "core flexion",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Pick a couple of dumbbells and sit at the end of a flat bench with your feet firmly on the floor. Hold the dumbbells with your palms facing in and your arms straight down at your sides at arms' length. This will be your starting position.",
      "While maintaining the torso stationary (no swinging), lift the dumbbells to your side with a slight bend on the elbow and the hands slightly tilted forward as if pouring water in a glass. Continue to go up until you arms are parallel to the floor. Exhale as you execute this movement and pause for a second at the top.",
      "Lower the dumbbells back down slowly to the starting position as you inhale.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Side_Lateral_Raise/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Side Delts. Source id: Seated_Side_Lateral_Raise."
  },
  {
    "name": "Cable Rear Delt Fly",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Rear Delts",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Adjust the pulleys to the appropriate height and adjust the weight. The pulleys should be above your head.",
      "Grab the left pulley with your right hand and the right pulley with your left hand, crossing them in front of you. This will be your starting position.",
      "Initiate the movement by moving your arms back and outward, keeping your arms straight as you execute the movement.",
      "Pause at the end of the motion before returning the handles to the start position."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rear_Delt_Fly/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Rear Delts. Source id: Cable_Rear_Delt_Fly."
  },
  {
    "name": "Face Pull",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Rear Delts",
    "equipment": "cable",
    "difficulty": "intermediate",
    "level": "intermediate",
    "movementPattern": "compound",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "Facing a high pulley with a rope or dual handles attached, pull the weight directly towards your face, separating your hands as you do so. Keep your upper arms parallel to the ground."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Rear Delts. Source id: Face_Pull."
  },
  {
    "name": "Reverse Machine Flyes",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Rear Delts",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "vertical pull",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Adjust the handles so that they are fully to the rear. Make an appropriate weight selection and adjust the seat height so the handles are at shoulder level. Grasp the handles with your hands facing inwards. This will be your starting position.",
      "In a semicircular motion, pull your hands out to your side and back, contracting your rear delts.",
      "Keep your arms slightly bent throughout the movement, with all of the motion occurring at the shoulder joint.",
      "Pause at the rear of the movement, and slowly return the weight to the starting position."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Machine_Flyes/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Rear Delts. Source id: Reverse_Machine_Flyes."
  },
  {
    "name": "External Rotation with Band",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Rotator Cuff",
    "equipment": "bands",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "compound",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Choke the band around a post. The band should be at the same height as your elbow. Stand with your left side to the band a couple of feet away.",
      "Grasp the end of the band with your right hand, and keep your elbow pressed firmly to your side. We recommend you hold a pad or foam roll in place with your elbow to keep it firmly in position.",
      "With your upper arm in position, your elbow should be flexed to 90 degrees with your hand reaching across the front of your torso. This will be your starting position.",
      "Execute the movement by rotating your arm in a backhand motion, keeping your elbow in place.",
      "Continue as far as you are able, pause, and then return to the starting position."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/External_Rotation_with_Band/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Rotator Cuff. Source id: External_Rotation_with_Band."
  },
  {
    "name": "Lateral Raise - With Bands",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Side Delts",
    "equipment": "bands",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "core flexion",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "To begin, stand on an exercise band so that tension begins at arm's length. Grasp the handles using a pronated (palms facing your thighs) grip that is slightly less than shoulder width. The handles should be resting on the sides of your thighs. Your arms should be extended with a slight bend at the elbows and your back should be straight. This will be your starting position.",
      "Use your side shoulders to lift the handles to the sides as you exhale. Continue to lift the handles until they are slightly above parallel. Tip: As you lift the handles, slightly tilt the hand as if you were pouring water and keep your arms extended. Also, keep your torso stationary and pause for a second at the top of the movement.",
      "Lower the handles back down slowly to the starting position. Inhale as you perform this portion of the movement.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lateral_Raise_-_With_Bands/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Side Delts. Source id: Lateral_Raise_-_With_Bands."
  },
  {
    "name": "Front Plate Raise",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Front Delts",
    "equipment": "other",
    "difficulty": "intermediate",
    "level": "intermediate",
    "movementPattern": "core flexion",
    "goalTags": [
      "strength",
      "isolation"
    ],
    "instructions": [
      "While standing straight, hold a barbell plate in both hands at the 3 and 9 o'clock positions. Your palms should be facing each other and your arms should be extended and locked with a slight bend at the elbows and the plate should be down near your waist in front of you as far as you can go. Tip: The arms will remain in this position throughout the exercise. This will be your starting position.",
      "Slowly raise the plate as you exhale until it is a little above shoulder level. Hold the contraction for a second. Tip: make sure that you do not swing the weight or bend at the elbows. Your torso should remain stationary throughout the movement as well.",
      "As you inhale, slowly lower the plate back down to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Plate_Raise/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Front Delts. Source id: Front_Plate_Raise."
  },
  {
    "name": "Barbell Squat",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "barbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "squat/lunge",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack to just below shoulder level. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it.",
      "Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso.",
      "Step away from the rack and position your legs using a shoulder width medium stance with the toes slightly pointed out. Keep your head up at all times and also maintain a straight back. This will be your starting position. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances discussed in the foot stances section).",
      "Begin to slowly lower the bar by bending the knees and hips as you maintain a straight posture with the head up. Continue down until the angle between the upper leg and the calves becomes slightly less than 90-degrees. Inhale as you perform this portion of the movement. Tip: If you performed the exercise correctly, the front of the knees should make an imaginary straight line with the toes that is perpendicular to the front. If your knees are past that imaginary line (if they are past your toes) then you are placing undue stress on the knee and the exercise has been performed incorrectly.",
      "Begin to raise the bar as you exhale by pushing the floor with the heel of your foot as you straighten the legs again and go back to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Quads. Source id: Barbell_Squat."
  },
  {
    "name": "Front Squat (Clean Grip)",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "barbell",
    "difficulty": "intermediate",
    "level": "intermediate",
    "movementPattern": "squat/lunge",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "To begin, first set the bar in a rack slightly below shoulder level. Rest the bar on top of the deltoids, pushing into the clavicles, and lightly touching the throat. Your hands should be in a clean grip, touching the bar only with your fingers to help keep it in position.",
      "Lift the bar off the rack by first pushing with your legs and at the same time straightening your torso. Step away from the rack and position your legs using a shoulder width medium stance with the toes slightly pointed out. Keep your head and elbows up at all times. This will be your starting position.",
      "Bend at the knees, sitting down between your legs. Continue down until your hamstrings are on your calves. Keep your knees aligned with your feet by consciously using your abductors to push your knees out as you squat.",
      "Begin to raise the bar as you exhale by pushing the floor mainly with the heel or middle of your foot as you straighten the legs again and return to the starting position."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Squat_Clean_Grip/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Quads. Source id: Front_Squat_Clean_Grip."
  },
  {
    "name": "Goblet Squat",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "kettlebells",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "squat/lunge",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Stand holding a light kettlebell by the horns close to your chest. This will be your starting position.",
      "Squat down between your legs until your hamstrings are on your calves. Keep your chest and head up and your back straight.",
      "At the bottom position, pause and use your elbows to push your knees out. Return to the starting position, and repeat for 10-20 repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Goblet_Squat/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Quads. Source id: Goblet_Squat."
  },
  {
    "name": "Leg Press",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Using a leg press machine, sit down on the machine and place your legs on the platform directly in front of you at a medium (shoulder width) foot stance. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances described in the foot positioning section).",
      "Lower the safety bars holding the weighted platform in place and press the platform all the way up until your legs are fully extended in front of you. Tip: Make sure that you do not lock your knees. Your torso and the legs should make a perfect 90-degree angle. This will be your starting position.",
      "As you inhale, slowly lower the platform until your upper and lower legs make a 90-degree angle.",
      "Pushing mainly with the heels of your feet and using the quadriceps go back to the starting position as you exhale.",
      "Repeat for the recommended amount of repetitions and ensure to lock the safety pins properly once you are done. You do not want that platform falling on you fully loaded."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Quads. Source id: Leg_Press."
  },
  {
    "name": "Leg Extensions",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "isolation",
    "goalTags": [
      "strength",
      "isolation"
    ],
    "instructions": [
      "For this exercise you will need to use a leg extension machine. First choose your weight and sit on the machine with your legs under the pad (feet pointed forward) and the hands holding the side bars. This will be your starting position. Tip: You will need to adjust the pad so that it falls on top of your lower leg (just above your feet). Also, make sure that your legs form a 90-degree angle between the lower and upper leg. If the angle is less than 90-degrees then that means the knee is over the toes which in turn creates undue stress at the knee joint. If the machine is designed that way, either look for another machine or just make sure that when you start executing the exercise you stop going down once you hit the 90-degree angle.",
      "Using your quadriceps, extend your legs to the maximum as you exhale. Ensure that the rest of the body remains stationary on the seat. Pause a second on the contracted position.",
      "Slowly lower the weight back to the original position as you inhale, ensuring that you do not go past the 90-degree angle limit.",
      "Repeat for the recommended amount of times."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Quads. Source id: Leg_Extensions."
  },
  {
    "name": "Dumbbell Lunges",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "squat/lunge",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Stand with your torso upright holding two dumbbells in your hands by your sides. This will be your starting position.",
      "Step forward with your right leg around 2 feet or so from the foot being left stationary behind and lower your upper body down, while keeping the torso upright and maintaining balance. Inhale as you go down. Note: As in the other exercises, do not allow your knee to go forward beyond your toes as you come down, as this will put undue stress on the knee joint. Make sure that you keep your front shin perpendicular to the ground.",
      "Using mainly the heel of your foot, push up and go back to the starting position as you exhale.",
      "Repeat the movement for the recommended amount of repetitions and then perform with the left leg."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Quads. Source id: Dumbbell_Lunges."
  },
  {
    "name": "Split Squat with Dumbbells",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "squat/lunge",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Position yourself into a staggered stance with the rear foot elevated and front foot forward.",
      "Hold a dumbbell in each hand, letting them hang at the sides. This will be your starting position.",
      "Begin by descending, flexing your knee and hip to lower your body down. Maintain good posture througout the movement. Keep the front knee in line with the foot as you perform the exercise.",
      "At the bottom of the movement, drive through the heel to extend the knee and hip to return to the starting position."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Quads. Source id: Split_Squat_with_Dumbbells."
  },
  {
    "name": "Bodyweight Squat",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "squat/lunge",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Stand with your feet shoulder width apart. You can place your hands behind your head. This will be your starting position.",
      "Begin the movement by flexing your knees and hips, sitting back with your hips.",
      "Continue down to full depth if you are able,and quickly reverse the motion until you return to the starting position. As you squat, keep your head and chest up and push your knees out."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Quads. Source id: Bodyweight_Squat."
  },
  {
    "name": "Barbell Walking Lunge",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "barbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "squat/lunge",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Begin standing with your feet shoulder width apart and a barbell across your upper back.",
      "Step forward with one leg, flexing the knees to drop your hips. Descend until your rear knee nearly touches the ground. Your posture should remain upright, and your front knee should stay above the front foot.",
      "Drive through the heel of your lead foot and extend both knees to raise yourself back up.",
      "Step forward with your rear foot, repeating the lunge on the opposite leg."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Walking_Lunge/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Quads. Source id: Barbell_Walking_Lunge."
  },
  {
    "name": "Hack Squat",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "squat/lunge",
    "goalTags": [
      "strength",
      "compound"
    ],
    "instructions": [
      "Place the back of your torso against the back pad of the machine and hook your shoulders under the shoulder pads provided.",
      "Position your legs in the platform using a shoulder width medium stance with the toes slightly pointed out. Tip: Keep your head up at all times and also maintain the back on the pad at all times.",
      "Place your arms on the side handles of the machine and disengage the safety bars (which on most designs is done by moving the side handles from a facing front position to a diagonal position).",
      "Now straighten your legs without locking the knees. This will be your starting position. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances described in the foot positioning section).",
      "Begin to slowly lower the unit by bending the knees as you maintain a straight posture with the head up (back on the pad at all times). Continue down until the angle between the upper leg and the calves becomes slightly less than 90-degrees (which is the point in which the upper legs are below parallel to the floor). Inhale as you perform this portion of the movement. Tip: If you performed the exercise correctly, the front of the knees should make an imaginary straight line with the toes that is perpendicular to the front. If your knees are past that imaginary line (if they are past your toes) then you are placing undue stress on the knee and the exercise has been performed incorrectly.",
      "Begin to raise the unit as you exhale by pushing the floor with mainly with the heel of your foot as you straighten the legs again and go back to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hack_Squat/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Quads. Source id: Hack_Squat."
  },
  {
    "name": "Romanian Deadlift",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Hamstrings",
    "equipment": "barbell",
    "difficulty": "intermediate",
    "level": "intermediate",
    "movementPattern": "hinge/posterior chain",
    "goalTags": [
      "strength",
      "compound",
      "sport performance"
    ],
    "instructions": [
      "Put a barbell in front of you on the ground and grab it using a pronated (palms facing down) grip that a little wider than shoulder width. Tip: Depending on the weight used, you may need wrist wraps to perform the exercise and also a raised platform in order to allow for better range of motion.",
      "Bend the knees slightly and keep the shins vertical, hips back and back straight. This will be your starting position.",
      "Keeping your back and arms completely straight at all times, use your hips to lift the bar as you exhale. Tip: The movement should not be fast but steady and under control.",
      "Once you are standing completely straight up, lower the bar by pushing the hips back, only slightly bending the knees, unlike when squatting. Tip: Take a deep breath at the start of the movement and keep your chest up. Hold your breath as you lower and exhale as you complete the movement.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Hamstrings. Source id: Romanian_Deadlift."
  },
  {
    "name": "Stiff-Legged Dumbbell Deadlift",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Hamstrings",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "hinge/posterior chain",
    "goalTags": [
      "strength",
      "compound",
      "sport performance"
    ],
    "instructions": [
      "Grasp a couple of dumbbells holding them by your side at arm's length.",
      "Stand with your torso straight and your legs spaced using a shoulder width or narrower stance. The knees should be slightly bent. This is your starting position.",
      "Keeping the knees stationary, lower the dumbbells to over the top of your feet by bending at the waist while keeping your back straight. Keep moving forward as if you were going to pick something from the floor until you feel a stretch on the hamstrings. Exhale as you perform this movement",
      "Start bringing your torso up straight again by extending your hips and waist until you are back at the starting position. Inhale as you perform this movement.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stiff-Legged_Dumbbell_Deadlift/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Hamstrings. Source id: Stiff-Legged_Dumbbell_Deadlift."
  },
  {
    "name": "Lying Leg Curls",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Hamstrings",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "hinge/posterior chain",
    "goalTags": [
      "strength",
      "isolation",
      "sport performance"
    ],
    "instructions": [
      "Adjust the machine lever to fit your height and lie face down on the leg curl machine with the pad of the lever on the back of your legs (just a few inches under the calves). Tip: Preferably use a leg curl machine that is angled as opposed to flat since an angled position is more favorable for hamstrings recruitment.",
      "Keeping the torso flat on the bench, ensure your legs are fully stretched and grab the side handles of the machine. Position your toes straight (or you can also use any of the other two stances described on the foot positioning section). This will be your starting position.",
      "As you exhale, curl your legs up as far as possible without lifting the upper legs from the pad. Once you hit the fully contracted position, hold it for a second.",
      "As you inhale, bring the legs back to the initial position. Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Leg_Curls/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Hamstrings. Source id: Lying_Leg_Curls."
  },
  {
    "name": "Seated Leg Curl",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Hamstrings",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "hinge/posterior chain",
    "goalTags": [
      "strength",
      "isolation",
      "sport performance"
    ],
    "instructions": [
      "Adjust the machine lever to fit your height and sit on the machine with your back against the back support pad.",
      "Place the back of lower leg on top of padded lever (just a few inches under the calves) and secure the lap pad against your thighs, just above the knees. Then grasp the side handles on the machine as you point your toes straight (or you can also use any of the other two stances) and ensure that the legs are fully straight right in front of you. This will be your starting position.",
      "As you exhale, pull the machine lever as far as possible to the back of your thighs by flexing at the knees. Keep your torso stationary at all times. Hold the contracted position for a second.",
      "Slowly return to the starting position as you breathe in.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Leg_Curl/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Hamstrings. Source id: Seated_Leg_Curl."
  },
  {
    "name": "Natural Glute Ham Raise",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Hamstrings",
    "equipment": "body only",
    "difficulty": "intermediate",
    "level": "intermediate",
    "movementPattern": "core flexion",
    "goalTags": [
      "strength",
      "compound",
      "sport performance"
    ],
    "instructions": [
      "Using the leg pad of a lat pulldown machine or a preacher bench, position yourself so that your ankles are under the pads, knees on the seat, and you are facing away from the machine. You should be upright and maintaining good posture.",
      "This will be your starting position. Lower yourself under control until your knees are almost completely straight.",
      "Remaining in control, raise yourself back up to the starting position.",
      "If you are unable to complete a rep, use a band, a partner, or push off of a box to aid in completing a repetition."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Natural_Glute_Ham_Raise/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Hamstrings. Source id: Natural_Glute_Ham_Raise."
  },
  {
    "name": "Butt Lift (Bridge)",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Glutes",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "hinge/posterior chain",
    "goalTags": [
      "strength",
      "isolation",
      "sport performance"
    ],
    "instructions": [
      "Lie flat on the floor on your back with the hands by your side and your knees bent. Your feet should be placed around shoulder width. This will be your starting position.",
      "Pushing mainly with your heels, lift your hips off the floor while keeping your back straight. Breathe out as you perform this part of the motion and hold at the top for a second.",
      "Slowly go back to the starting position as you breathe in."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Butt_Lift_Bridge/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Glutes. Source id: Butt_Lift_Bridge."
  },
  {
    "name": "Glute Kickback",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Glutes",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "compound",
    "goalTags": [
      "strength",
      "compound",
      "sport performance"
    ],
    "instructions": [
      "Kneel on the floor or an exercise mat and bend at the waist with your arms extended in front of you (perpendicular to the torso) in order to get into a kneeling push-up position but with the arms spaced at shoulder width. Your head should be looking forward and the bend of the knees should create a 90-degree angle between the hamstrings and the calves. This will be your starting position.",
      "As you exhale, lift up your right leg until the hamstrings are in line with the back while maintaining the 90-degree angle bend. Contract the glutes throughout this movement and hold the contraction at the top for a second. Tip: At the end of the movement the upper leg should be parallel to the floor while the calf should be perpendicular to it.",
      "Go back to the initial position as you inhale and now repeat with the left leg.",
      "Continue to alternate legs until all of the recommended repetitions have been performed."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Glute_Kickback/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Glutes. Source id: Glute_Kickback."
  },
  {
    "name": "Barbell Hip Thrust",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Glutes",
    "equipment": "barbell",
    "difficulty": "intermediate",
    "level": "intermediate",
    "movementPattern": "hinge/posterior chain",
    "goalTags": [
      "strength",
      "powerlifting",
      "compound",
      "sport performance"
    ],
    "instructions": [
      "Begin seated on the ground with a bench directly behind you. Have a loaded barbell over your legs. Using a fat bar or having a pad on the bar can greatly reduce the discomfort caused by this exercise.",
      "Roll the bar so that it is directly above your hips, and lean back against the bench so that your shoulder blades are near the top of it.",
      "Begin the movement by driving through your feet, extending your hips vertically through the bar. Your weight should be supported by your shoulder blades and your feet. Extend as far as possible, then reverse the motion to return to the starting position."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "powerlifting compound targeting Glutes. Source id: Barbell_Hip_Thrust."
  },
  {
    "name": "Calf Press",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Calves",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "isolation",
      "sport performance"
    ],
    "instructions": [
      "Adjust the seat so that your legs are only slightly bent in the start position. The balls of your feet should be firmly on the platform.",
      "Select an appropriate weight, and grasp the handles. This will be your starting position.",
      "Straighten the legs by extending the knees, just barely lifting the weight from the stack. Your ankle should be fully flexed, toes pointing up. Execute the movement by pressing downward through the balls of your feet as far as possible.",
      "After a brief pause, reverse the motion and repeat."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Calves. Source id: Calf_Press."
  },
  {
    "name": "Standing Barbell Calf Raise",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Calves",
    "equipment": "barbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "calf raise",
    "goalTags": [
      "strength",
      "isolation",
      "sport performance"
    ],
    "instructions": [
      "This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack that best matches your height. Once the correct height is chosen and the bar is loaded, step under the bar and place the bar on the back of your shoulders (slightly below the neck).",
      "Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso.",
      "Step away from the rack and position your legs using a shoulder width medium stance with the toes slightly pointed out. Keep your head up at all times as looking down will get you off balance and also maintain a straight back. The knees should be kept with a slight bend; never locked. This will be your starting position. Tip: For better range of motion you may also place the ball of your feet on a wooden block but be careful as this option requires more balance and a sturdy block.",
      "Raise your heels as you breathe out by extending your ankles as high as possible and flexing your calf. Ensure that the knee is kept stationary at all times. There should be no bending at any time. Hold the contracted position by a second before you start to go back down.",
      "Go back slowly to the starting position as you breathe in by lowering your heels as you bend the ankles until calves are stretched.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Barbell_Calf_Raise/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Calves. Source id: Standing_Barbell_Calf_Raise."
  },
  {
    "name": "Thigh Adductor",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Adductors",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "isolation",
    "goalTags": [
      "strength",
      "isolation",
      "sport performance"
    ],
    "instructions": [
      "To begin, sit down on the adductor machine and select a weight you are comfortable with. When your legs are positioned properly on the leg pads of the machine, grip the handles on each side. Your entire upper body (from the waist up) should be stationary. This is the starting position.",
      "Slowly press against the machine with your legs to move them towards each other while exhaling.",
      "Feel the contraction for a second and begin to move your legs back to the starting position while breathing in. Note: Remember to keep your upper body stationary and avoid fast jerking motions in order to prevent any injuries from occurring.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Thigh_Adductor/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Adductors. Source id: Thigh_Adductor."
  },
  {
    "name": "Thigh Abductor",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Abductors",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "isolation",
    "goalTags": [
      "strength",
      "isolation",
      "sport performance"
    ],
    "instructions": [
      "To begin, sit down on the abductor machine and select a weight you are comfortable with. When your legs are positioned properly, grip the handles on each side. Your entire upper body (from the waist up) should be stationary. This is the starting position.",
      "Slowly press against the machine with your legs to move them away from each other while exhaling.",
      "Feel the contraction for a second and begin to move your legs back to the starting position while breathing in. Note: Remember to keep your upper body stationary to prevent any injuries from occurring.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Thigh_Abductor/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Abductors. Source id: Thigh_Abductor."
  },
  {
    "name": "Monster Walk",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Abductors",
    "equipment": "bands",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "conditioning/power",
    "goalTags": [
      "strength",
      "compound",
      "power",
      "conditioning",
      "sport performance"
    ],
    "instructions": [
      "Place a band around both ankles and another around both knees. There should be enough tension that they are tight when your feet are shoulder width apart.",
      "To begin, take short steps forward alternating your left and right foot.",
      "After several steps, do just the opposite and walk backward to where you started."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Monster_Walk/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Abductors. Source id: Monster_Walk."
  },
  {
    "name": "Alternate Hammer Curl",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Biceps",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "arm isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Stand up with your torso upright and a dumbbell in each hand being held at arms length. The elbows should be close to the torso.",
      "The palms of the hands should be facing your torso. This will be your starting position.",
      "While holding the upper arm stationary, curl the right weight forward while contracting the biceps as you breathe out. Continue the movement until your biceps is fully contracted and the dumbbells are at shoulder level. Hold the contracted position for a second as you squeeze the biceps. Tip: Only the forearms should move.",
      "Slowly begin to bring the dumbbells back to starting position as your breathe in.",
      "Repeat the movement with the left hand. This equals one repetition.",
      "Continue alternating in this manner for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternate_Hammer_Curl/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Biceps. Source id: Alternate_Hammer_Curl."
  },
  {
    "name": "Alternate Incline Dumbbell Curl",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Biceps",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "arm isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Sit down on an incline bench with a dumbbell in each hand being held at arms length. Tip: Keep the elbows close to the torso.This will be your starting position.",
      "While holding the upper arm stationary, curl the right weight forward while contracting the biceps as you breathe out. As you do so, rotate the hand so that the palm is facing up. Continue the movement until your biceps is fully contracted and the dumbbells are at shoulder level. Hold the contracted position for a second as you squeeze the biceps. Tip: Only the forearms should move.",
      "Slowly begin to bring the dumbbell back to starting position as your breathe in.",
      "Repeat the movement with the left hand. This equals one repetition.",
      "Continue alternating in this manner for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternate_Incline_Dumbbell_Curl/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Biceps. Source id: Alternate_Incline_Dumbbell_Curl."
  },
  {
    "name": "Concentration Curls",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Biceps",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "arm isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Sit down on a flat bench with one dumbbell in front of you between your legs. Your legs should be spread with your knees bent and feet on the floor.",
      "Use your right arm to pick the dumbbell up. Place the back of your right upper arm on the top of your inner right thigh. Rotate the palm of your hand until it is facing forward away from your thigh. Tip: Your arm should be extended and the dumbbell should be above the floor. This will be your starting position.",
      "While holding the upper arm stationary, curl the weights forward while contracting the biceps as you breathe out. Only the forearms should move. Continue the movement until your biceps are fully contracted and the dumbbells are at shoulder level. Tip: At the top of the movement make sure that the little finger of your arm is higher than your thumb. This guarantees a good contraction. Hold the contracted position for a second as you squeeze the biceps.",
      "Slowly begin to bring the dumbbells back to starting position as your breathe in. Caution: Avoid swinging motions at any time.",
      "Repeat for the recommended amount of repetitions. Then repeat the movement with the left arm."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Concentration_Curls/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Biceps. Source id: Concentration_Curls."
  },
  {
    "name": "Dumbbell Bicep Curl",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Biceps",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "arm isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Stand up straight with a dumbbell in each hand at arm's length. Keep your elbows close to your torso and rotate the palms of your hands until they are facing forward. This will be your starting position.",
      "Now, keeping the upper arms stationary, exhale and curl the weights while contracting your biceps. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level. Hold the contracted position for a brief pause as you squeeze your biceps.",
      "Then, inhale and slowly begin to lower the dumbbells back to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Biceps. Source id: Dumbbell_Bicep_Curl."
  },
  {
    "name": "Barbell Curl",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Biceps",
    "equipment": "barbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "arm isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Stand up with your torso upright while holding a barbell at a shoulder-width grip. The palm of your hands should be facing forward and the elbows should be close to the torso. This will be your starting position.",
      "While holding the upper arms stationary, curl the weights forward while contracting the biceps as you breathe out. Tip: Only the forearms should move.",
      "Continue the movement until your biceps are fully contracted and the bar is at shoulder level. Hold the contracted position for a second and squeeze the biceps hard.",
      "Slowly begin to bring the bar back to starting position as your breathe in.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Biceps. Source id: Barbell_Curl."
  },
  {
    "name": "EZ-Bar Curl",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Biceps",
    "equipment": "e-z curl bar",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "arm isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Stand up straight while holding an EZ curl bar at the wide outer handle. The palms of your hands should be facing forward and slightly tilted inward due to the shape of the bar. Keep your elbows close to your torso. This will be your starting position.",
      "Now, while keeping your upper arms stationary, exhale and curl the weights forward while contracting the biceps. Focus on only moving your forearms.",
      "Continue to raise the weight until your biceps are fully contracted and the bar is at shoulder level. Hold the top contracted position for a moment and squeeze the biceps.",
      "Then inhale and slowly lower the bar back to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Curl/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Biceps. Source id: EZ-Bar_Curl."
  },
  {
    "name": "Bench Dips",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Triceps",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "For this exercise you will need to place a bench behind your back. With the bench perpendicular to your body, and while looking away from it, hold on to the bench on its edge with the hands fully extended, separated at shoulder width. The legs will be extended forward, bent at the waist and perpendicular to your torso. This will be your starting position.",
      "Slowly lower your body as you inhale by bending at the elbows until you lower yourself far enough to where there is an angle slightly smaller than 90 degrees between the upper arm and the forearm. Tip: Keep the elbows as close as possible throughout the movement. Forearms should always be pointing down.",
      "Using your triceps to bring your torso up again, lift yourself back to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bench_Dips/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Triceps. Source id: Bench_Dips."
  },
  {
    "name": "Dips - Triceps Version",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Triceps",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "To get into the starting position, hold your body at arm's length with your arms nearly locked above the bars.",
      "Now, inhale and slowly lower yourself downward. Your torso should remain upright and your elbows should stay close to your body. This helps to better focus on tricep involvement. Lower yourself until there is a 90 degree angle formed between the upper arm and forearm.",
      "Then, exhale and push your torso back up using your triceps to bring your body back to the starting position.",
      "Repeat the movement for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Triceps_Version/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Triceps. Source id: Dips_-_Triceps_Version."
  },
  {
    "name": "Close-Grip Dumbbell Press",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Triceps",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "hypertrophy"
    ],
    "instructions": [
      "Place a dumbbell standing up on a flat bench.",
      "Ensuring that the dumbbell stays securely placed at the top of the bench, lie perpendicular to the bench with only your shoulders lying on the surface. Hips should be below the bench and your legs bent with your feet firmly on the floor.",
      "Grasp the dumbbell with both hands and hold it straight over your chest at arm's length. Both palms should be pressing against the underside of the sides of the dumbbell. This will be your starting position.",
      "Initiate the movement by lowering the dumbbell to your chest.",
      "Return to the starting position by extending the elbows."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Dumbbell_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Triceps. Source id: Close-Grip_Dumbbell_Press."
  },
  {
    "name": "Cable Rope Overhead Triceps Extension",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Triceps",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "vertical push",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Attach a rope to the bottom pulley of the pulley machine.",
      "Grasping the rope with both hands, extend your arms with your hands directly above your head using a neutral grip (palms facing each other). Your elbows should be in close to your head and the arms should be perpendicular to the floor with the knuckles aimed at the ceiling. This will be your starting position.",
      "Slowly lower the rope behind your head as you hold the upper arms stationary. Inhale as you perform this movement and pause when your triceps are fully stretched.",
      "Return to the starting position by flexing your triceps as you breathe out.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rope_Overhead_Triceps_Extension/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Triceps. Source id: Cable_Rope_Overhead_Triceps_Extension."
  },
  {
    "name": "Triceps Pushdown",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Triceps",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "arm isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Attach a straight or angled bar to a high pulley and grab with an overhand grip (palms facing down) at shoulder width.",
      "Standing upright with the torso straight and a very small inclination forward, bring the upper arms close to your body and perpendicular to the floor. The forearms should be pointing up towards the pulley as they hold the bar. This is your starting position.",
      "Using the triceps, bring the bar down until it touches the front of your thighs and the arms are fully extended perpendicular to the floor. The upper arms should always remain stationary next to your torso and only the forearms should move. Exhale as you perform this movement.",
      "After a second hold at the contracted position, bring the bar slowly up to the starting point. Breathe in as you perform this step.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Triceps. Source id: Triceps_Pushdown."
  },
  {
    "name": "Triceps Pushdown - Rope Attachment",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Triceps",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "arm isolation",
    "goalTags": [
      "strength",
      "isolation",
      "hypertrophy"
    ],
    "instructions": [
      "Attach a rope attachment to a high pulley and grab with a neutral grip (palms facing each other).",
      "Standing upright with the torso straight and a very small inclination forward, bring the upper arms close to your body and perpendicular to the floor. The forearms should be pointing up towards the pulley as they hold the rope with the palms facing each other. This is your starting position.",
      "Using the triceps, bring the rope down as you bring each side of the rope to the side of your thighs. At the end of the movement the arms are fully extended and perpendicular to the floor. The upper arms should always remain stationary next to your torso and only the forearms should move. Exhale as you perform this movement.",
      "After holding for a second, at the contracted position, bring the rope slowly up to the starting point. Breathe in as you perform this step.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Triceps. Source id: Triceps_Pushdown_-_Rope_Attachment."
  },
  {
    "name": "Palms-Up Dumbbell Wrist Curl Over A Bench",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Forearms",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "isolation"
    ],
    "instructions": [
      "Start out by placing two dumbbells on one side of a flat bench.",
      "Kneel down on both of your knees so that your body is facing the flat bench.",
      "Use your arms to grab both of the dumbbells with a supinated grip (palms up) and bring them up so that your forearms are resting against the flat bench. Your wrists should be hanging over the edge.",
      "Start out by curling your wrist upwards and exhaling.",
      "Slowly lower your wrists back down to the starting position while inhaling. Make sure to inhale during this part of the exercise.",
      "Your forearms should be stationary as your wrist is the only movement needed to perform this exercise.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Forearms. Source id: Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench."
  },
  {
    "name": "Palms-Down Dumbbell Wrist Curl Over A Bench",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Forearms",
    "equipment": "dumbbell",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "isolation"
    ],
    "instructions": [
      "Start out by placing two dumbbells on one side of a flat bench.",
      "Kneel down on both of your knees so that your body is facing the flat bench.",
      "Use your arms to grab both of the dumbbells with a pronated grip (palms facing down) and bring them up so that your forearms are resting against the flat bench. Your wrists should be hanging over the edge.",
      "Start out by curling your wrist upwards and exhaling.",
      "Slowly lower your wrists back down to the starting position while inhaling.",
      "Your forearms should be stationary as your wrist is the only movement needed to perform this exercise.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Forearms. Source id: Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench."
  },
  {
    "name": "3/4 Sit-Up",
    "muscleGroup": "Core",
    "mainMuscleGroup": "Core",
    "subMuscleGroup": "Abs",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "core flexion",
    "goalTags": [
      "strength",
      "compound",
      "core"
    ],
    "instructions": [
      "Lie down on the floor and secure your feet. Your legs should be bent at the knees.",
      "Place your hands behind or to the side of your head. You will begin with your back on the ground. This will be your starting position.",
      "Flex your hips and spine to raise your torso toward your knees.",
      "At the top of the contraction your torso should be perpendicular to the ground. Reverse the motion, going only ¾ of the way down.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/3_4_Sit-Up/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Abs. Source id: 3_4_Sit-Up."
  },
  {
    "name": "Air Bike",
    "muscleGroup": "Core",
    "mainMuscleGroup": "Core",
    "subMuscleGroup": "Abs",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "core flexion",
    "goalTags": [
      "strength",
      "compound",
      "core"
    ],
    "instructions": [
      "Lie flat on the floor with your lower back pressed to the ground. For this exercise, you will need to put your hands beside your head. Be careful however to not strain with the neck as you perform it. Now lift your shoulders into the crunch position.",
      "Bring knees up to where they are perpendicular to the floor, with your lower legs parallel to the floor. This will be your starting position.",
      "Now simultaneously, slowly go through a cycle pedal motion kicking forward with the right leg and bringing in the knee of the left leg. Bring your right elbow close to your left knee by crunching to the side, as you breathe out.",
      "Go back to the initial position as you breathe in.",
      "Crunch to the opposite side as you cycle your legs and bring closer your left elbow to your right knee and exhale.",
      "Continue alternating in this manner until all of the recommended repetitions for each side have been completed."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Air_Bike/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Abs. Source id: Air_Bike."
  },
  {
    "name": "Alternate Heel Touchers",
    "muscleGroup": "Core",
    "mainMuscleGroup": "Core",
    "subMuscleGroup": "Obliques",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "isolation",
    "goalTags": [
      "strength",
      "isolation",
      "core"
    ],
    "instructions": [
      "Lie on the floor with the knees bent and the feet on the floor around 18-24 inches apart. Your arms should be extended by your side. This will be your starting position.",
      "Crunch over your torso forward and up about 3-4 inches to the right side and touch your right heel as you hold the contraction for a second. Exhale while performing this movement.",
      "Now go back slowly to the starting position as you inhale.",
      "Now crunch over your torso forward and up around 3-4 inches to the left side and touch your left heel as you hold the contraction for a second. Exhale while performing this movement and then go back to the starting position as you inhale. Now that both heels have been touched, that is considered 1 repetition.",
      "Continue alternating sides in this manner until all prescribed repetitions are done."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternate_Heel_Touchers/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Obliques. Source id: Alternate_Heel_Touchers."
  },
  {
    "name": "Bent-Knee Hip Raise",
    "muscleGroup": "Core",
    "mainMuscleGroup": "Core",
    "subMuscleGroup": "Abs",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "core flexion",
    "goalTags": [
      "strength",
      "compound",
      "core"
    ],
    "instructions": [
      "Lay flat on the floor with your arms next to your sides.",
      "Now bend your knees at around a 75 degree angle and lift your feet off the floor by around 2 inches.",
      "Using your lower abs, bring your knees in towards you as you maintain the 75 degree angle bend in your legs. Continue this movement until you raise your hips off of the floor by rolling your pelvis backward. Breathe out as you perform this portion of the movement. Tip: At the end of the movement your knees will be over your chest.",
      "Squeeze your abs at the top of the movement for a second and then return to the starting position slowly as you breathe in. Tip: Maintain a controlled motion at all times.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent-Knee_Hip_Raise/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Abs. Source id: Bent-Knee_Hip_Raise."
  },
  {
    "name": "Plank",
    "muscleGroup": "Core",
    "mainMuscleGroup": "Core",
    "subMuscleGroup": "Anti-Rotation",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "core stability",
    "goalTags": [
      "strength",
      "isolation",
      "sport performance",
      "core"
    ],
    "instructions": [
      "Get into a prone position on the floor, supporting your weight on your toes and your forearms. Your arms are bent and directly below the shoulder.",
      "Keep your body straight at all times, and hold this position as long as possible. To increase difficulty, an arm or leg can be raised."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Anti-Rotation. Source id: Plank."
  },
  {
    "name": "Side Bridge",
    "muscleGroup": "Core",
    "mainMuscleGroup": "Core",
    "subMuscleGroup": "Obliques",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "hinge/posterior chain",
    "goalTags": [
      "strength",
      "core"
    ],
    "instructions": [],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Bridge/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength movement targeting Obliques. Source id: Side_Bridge."
  },
  {
    "name": "Pallof Press",
    "muscleGroup": "Core",
    "mainMuscleGroup": "Core",
    "subMuscleGroup": "Anti-Rotation",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "isolation",
      "sport performance",
      "core"
    ],
    "instructions": [
      "Connect a standard handle to a tower, and—if possible—position the cable to shoulder height. If not, a low pulley will suffice.",
      "With your side to the cable, grab the handle with both hands and step away from the tower. You should be approximately arm's length away from the pulley, with the tension of the weight on the cable.",
      "With your feet positioned hip-width apart and knees slightly bent, hold the cable to the middle of your chest. This will be your starting position.",
      "Press the cable away from your chest, fully extending both arms. You core should be tight and engaged.",
      "Hold the repetition for several seconds before returning to the starting position.",
      "At the conclusion of the set, repeat facing the other direction."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pallof_Press/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength isolation targeting Anti-Rotation. Source id: Pallof_Press."
  },
  {
    "name": "Pallof Press With Rotation",
    "muscleGroup": "Core",
    "mainMuscleGroup": "Core",
    "subMuscleGroup": "Obliques",
    "equipment": "cable",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "compound",
      "core"
    ],
    "instructions": [
      "Connect a standard handle to a tower, and position the cable to shoulder height.",
      "With your side to the cable, grab the handle with one hand and step away from the tower. You should be approximately arm's length away from the pulley, with the tension of the weight on the cable. Align outstretched arm with cable.",
      "With your feet positioned hip-width apart, pull the cable into your chest and grab the handle with your other hand. Both hands should be on the handle at this time.",
      "Facing forward, press the cable away from your chest. You core should be tight and engaged.",
      "Keeping your hips straight, twist your torso away from the pulley until you get a full quarter rotation.",
      "Maintain your rigid stance and straight arms. Return to the neutral position in a slow and controlled manner. Your arms should be extended in front of you.",
      "With the side tension still engaging your core, bring your hands to your chest and immediately press outward to a fully extended position. This constitutes one rep.",
      "Repeat to failure.",
      "Then, reposition and repeat the same series of movements on the opposite side."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pallof_Press_With_Rotation/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Obliques. Source id: Pallof_Press_With_Rotation."
  },
  {
    "name": "Mountain Climbers",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "body only",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "conditioning/power",
    "goalTags": [
      "strength",
      "plyometrics",
      "compound",
      "power",
      "conditioning"
    ],
    "instructions": [
      "Begin in a pushup position, with your weight supported by your hands and toes. Flexing the knee and hip, bring one leg until the knee is approximately under the hip. This will be your starting position.",
      "Explosively reverse the positions of your legs, extending the bent leg until the leg is straight and supported by the toe, and bringing the other foot up with the hip and knee flexed. Repeat in an alternating fashion for 20-30 seconds."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Mountain_Climbers/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "plyometrics compound targeting Quads. Source id: Mountain_Climbers."
  },
  {
    "name": "Box Jump (Multiple Response)",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Hamstrings",
    "equipment": "other",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "conditioning/power",
    "goalTags": [
      "strength",
      "plyometrics",
      "compound",
      "power",
      "conditioning",
      "sport performance"
    ],
    "instructions": [
      "Assume a relaxed stance facing the box or platform approximately an arm's length away. Arms should be down at the sides and legs slightly bent.",
      "Using the arms to aid in the initial burst, jump upward and forward, landing with feet simultaneously on top of the box or platform.",
      "Immediately drop or jump back down to the original starting place; then repeat the sequence."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Box_Jump_Multiple_Response/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "plyometrics compound targeting Hamstrings. Source id: Box_Jump_Multiple_Response."
  },
  {
    "name": "Front Box Jump",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Hamstrings",
    "equipment": "other",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "conditioning/power",
    "goalTags": [
      "strength",
      "plyometrics",
      "compound",
      "power",
      "conditioning",
      "sport performance"
    ],
    "instructions": [
      "Begin with a box of an appropriate height 1-2 feet in front of you. Stand with your feet should width apart. This will be your starting position.",
      "Perform a short squat in preparation for jumping, swinging your arms behind you.",
      "Rebound out of this position, extending through the hips, knees, and ankles to jump as high as possible. Swing your arms forward and up.",
      "Land on the box with the knees bent, absorbing the impact through the legs. You can jump from the box back to the ground, or preferably step down one leg at a time."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Box_Jump/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "plyometrics compound targeting Hamstrings. Source id: Front_Box_Jump."
  },
  {
    "name": "Lateral Box Jump",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Adductors",
    "equipment": "other",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "conditioning/power",
    "goalTags": [
      "strength",
      "plyometrics",
      "compound",
      "power",
      "conditioning",
      "sport performance"
    ],
    "instructions": [
      "Assume a comfortable standing position, with a short box positioned next to you. This will be your starting position.",
      "Quickly dip into a quarter squat to initiate the stretch reflex, and immediately reverse direction to jump up and to the side.",
      "Bring your knees high enough to ensure your feet have good clearance over the box.",
      "Land on the center of the box, using your legs to absorb the impact.",
      "Carefully jump down to the other side of the box, and continue going back and forth for several repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lateral_Box_Jump/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "plyometrics compound targeting Adductors. Source id: Lateral_Box_Jump."
  },
  {
    "name": "Running, Treadmill",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "machine",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "conditioning/power",
    "goalTags": [
      "strength",
      "cardio",
      "power",
      "conditioning"
    ],
    "instructions": [
      "To begin, step onto the treadmill and select the desired option from the menu. Most treadmills have a manual setting, or you can select a program to run. Typically, you can enter your age and weight to estimate the amount of calories burned during exercise. Elevation can be adjusted to change the intensity of the workout.",
      "Treadmills offer convenience, cardiovascular benefits, and usually have less impact than running outside. A 150 lb person will burn over 450 calories running 8 miles per hour for 30 minutes. Maintain proper posture as you run, and only hold onto the handles when necessary, such as when dismounting or checking your heart rate."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Running_Treadmill/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "cardio movement targeting Quads. Source id: Running_Treadmill."
  },
  {
    "name": "Battling Ropes",
    "muscleGroup": "Shoulders",
    "mainMuscleGroup": "Shoulders",
    "subMuscleGroup": "Front Delts",
    "equipment": "other",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "conditioning/power",
    "goalTags": [
      "strength",
      "compound",
      "power",
      "conditioning"
    ],
    "instructions": [
      "For this exercise you will need a heavy rope anchored at its center 15-20 feet away. Standing in front of the rope, take an end in each hand with your arms extended at your side. This will be your starting position.",
      "Initiate the movement by rapidly raising one arm to shoulder level as quickly as you can.",
      "As you let that arm drop to the starting position, raise the opposite side.",
      "Continue alternating your left and right arms, whipping the ropes up and down as fast as you can."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Battling_Ropes/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strength compound targeting Front Delts. Source id: Battling_Ropes."
  },
  {
    "name": "Medicine Ball Chest Pass",
    "muscleGroup": "Chest",
    "mainMuscleGroup": "Chest",
    "subMuscleGroup": "Mid Chest",
    "equipment": "medicine ball",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "horizontal push",
    "goalTags": [
      "strength",
      "plyometrics",
      "compound",
      "power",
      "hypertrophy"
    ],
    "instructions": [
      "You will need a partner for this exercise. Lacking one, this movement can be performed against a wall.",
      "Begin facing your partner holding the medicine ball at your torso with both hands.",
      "Pull the ball to your chest, and reverse the motion by extending through the elbows. For sports applications, you can take a step as you throw.",
      "Your partner should catch the ball, and throw it back to you.",
      "Receive the throw with both hands at chest height."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Medicine_Ball_Chest_Pass/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "plyometrics compound targeting Mid Chest. Source id: Medicine_Ball_Chest_Pass."
  },
  {
    "name": "Medicine Ball Full Twist",
    "muscleGroup": "Core",
    "mainMuscleGroup": "Core",
    "subMuscleGroup": "Obliques",
    "equipment": "medicine ball",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "compound",
    "goalTags": [
      "strength",
      "plyometrics",
      "compound",
      "power",
      "core"
    ],
    "instructions": [
      "For this exercise you will need a medicine ball and a partner. Stand back to back with your partner, spaced 2-3 feet apart. This will be your starting position.",
      "Hold the ball in front of the trunk. Open the hips and turn the shoulders at the same time as your partner.",
      "For full rotation, you and your partner should twist in the same direction, i.e. counter-clockwise.",
      "Pass the ball to your partner, and both of you can now twist in the opposite direction to repeat the procedure."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Medicine_Ball_Full_Twist/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "plyometrics compound targeting Obliques. Source id: Medicine_Ball_Full_Twist."
  },
  {
    "name": "Sled Push",
    "muscleGroup": "Legs",
    "mainMuscleGroup": "Legs",
    "subMuscleGroup": "Quads",
    "equipment": "other",
    "difficulty": "beginner",
    "level": "beginner",
    "movementPattern": "conditioning/power",
    "goalTags": [
      "strength",
      "strongman",
      "compound",
      "power",
      "conditioning"
    ],
    "instructions": [
      "Load your pushing sled with the desired weight.",
      "Take an athletic posture, leaning into the sled with your arms fully extended, grasping the handles. Push the sled as fast as possible, focusing on extending your hips and knees to strengthen your posterior chain."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sled_Push/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strongman compound targeting Quads. Source id: Sled_Push."
  },
  {
    "name": "Farmer's Walk",
    "muscleGroup": "Arms",
    "mainMuscleGroup": "Arms",
    "subMuscleGroup": "Forearms",
    "equipment": "other",
    "difficulty": "intermediate",
    "level": "intermediate",
    "movementPattern": "conditioning/power",
    "goalTags": [
      "strength",
      "strongman",
      "compound",
      "power",
      "conditioning"
    ],
    "instructions": [
      "There are various implements that can be used for the farmers walk. These can also be performed with heavy dumbbells or short bars if these implements aren't available. Begin by standing between the implements.",
      "After gripping the handles, lift them up by driving through your heels, keeping your back straight and your head up.",
      "Walk taking short, quick steps, and don't forget to breathe. Move for a given distance, typically 50-100 feet, as fast as possible."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Farmers_Walk/0.jpg",
    "gifUrl": null,
    "source": "Free Exercise DB",
    "license": "Unlicense",
    "notes": "strongman compound targeting Forearms. Source id: Farmers_Walk."
  }
];

async function seedCuratedExercises() {
  for (const exercise of curatedExercises) {
    const existingExercise = await Exercise.findOne({
      where: {
        name: exercise.name,
        source: exercise.source
      }
    });

    if (existingExercise) {
      await existingExercise.update(exercise);
    } else {
      await Exercise.create(exercise);
    }
  }
}

module.exports = {
  curatedExercises,
  seedCuratedExercises
};
