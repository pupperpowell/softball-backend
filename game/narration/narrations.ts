export const pitchNarrations = {
  excellent: {
    strike: [
      "fires a pinpoint fastball right down the middle.",
      "throws the ball so hard it seems to be smoking.",
      "unleashes a lightning-fast pitch that rockets towards the zone.",
      "kicks their leg up impossibly high. When it comes down, the ball is a blur.",
      "winds up their entire body and fires the ball like a bullet. There is no time to react.",
      "winds up their entire body and fires the ball like a bullet. It could be slightly away.",
      "narrows their eyes. They throw a legendary knuckleball that dances on its way to the plate. Somehow, it's a strike.",
    ],
    ball: [
      "throws an expert pitch that barely grazes the outside corner. It's impossibly close.",
      "whips the ball directly towards the strike zone, but it curves down and away with stunning movement.",
      "winds up their entire body and fires the ball like a bullet. It could be slightly in.",
      "winds up their entire body and fires the ball like a bullet. There is no time to react.",
      "stares deep into the soul of the batter and sends a devious splitter right down the middle. It curves so low the catcher's glove hits the dirt.",
      "narrows their eyes and throws a legendary knuckleball. It dances on its way to the plate. There's no telling where the pitch will end.",
    ],
  },
  great: {
    strike: [
      "delivers a nasty curveball that drops into the zone for a strike.",
      "sends a four-seam fastball directly towards the catcher's open glove.",
      "fires a four-seamer towards the zone. It hangs in the air at the last second.",
      "confidently whips the ball towards the plate.",
      "sends a heater that zips towards the zone with startling speed.",
      "starts with a well-practiced windup that lets off a deceptive slider.",
    ],
    ball: [
      "slings a deceptive slider that breaks just outside.",
      "snaps a beautiful sinker that heads towards the zone, then drops low at the last second.",
    ],
  },
  good: {
    strike: [
      "throws a solid pitch that fits snugly into the inner corner.",
      "throws a well-practiced pitch towards the zone.",
      "throws a splitter that starts high but heads towards the zone.",
      "throws a decent offspeed pitch to mess up the batter's timing.",
      "throws a confident pitch with good horizontal movement.",
    ],
    ball: [
      "delivers a decent pitch that misses the zone.",
      "tosses a pitch with good speed that misses outside.",
      "throws a good pitch that's a bit inside.",
    ],
  },
  poor: {
    strike: [
      "throws a hanging pitch that the batter eyes hungrily.",
      "throws a well-aimed but very slow pitch towards the zone.",
      "forgot, then remembered, where the strike zone is.",
      "manages to throw the ball towards the strike zone.",
    ],
    ball: [
      "lobs a pitch that sails way outside.",
      "definitely forgot where the strike zone is",
      "tries and fails to throw the ball in the correct direction",
      "manages to throw the ball.",
    ],
  },
  bad: {
    strike: [
      "throws a terrible pitch that somehow ends up heading towards the catcher.",
      "trips and falls mid-pitch, but it manages to fly towards the zone.",
      "throws a pitch that looks very easy to hit.",
      "seems to be trying to give the batter a pitch to hit.",
      "throws a suspiciously weak pitch towards the zone.",
    ],
    ball: [
      "throws a wild pitch that bounces before reaching the plate.",
      "throws a pitch with good intentions. Unfortunately, it's an obvious ball.",
      "goes into a decent windup but accidentally snags the release, missing the zone.",
    ],
  },
  silly: {
    strike: [
      "gently tosses a pitch that seems to fall in slow motion towards the strike zone.",
      "somehow manages to send the ball in the direction of home plate.",
      "throws a surprisingly well-aimed ball following a strange, unnatural windup.",
      "accidentally throws the ball towards the strike zone.",
    ],
    ball: [
      "gently lobs a ball towards home plate. It misses the zone by almost thirteen feet.",
      "tosses the ball for what looks like the first time.",
      "musters all their strength and tosses a weak pitch at the ground.",
      "throws a pitch and wonders how they ended up here.",
      "floats the ball in the general direction of everything.",
      "throws the ball behind the batter—but not in a cool or funny way.",
      "throws a really bad pitch that's not even close to the strike zone.",
      "seems to have forgotten how to throw a ball.",
      "grimaces and contorts their arm in a strange way, throwing a pitch that misses the zone.",
    ],
  },
};

export const foulNarrations = [
  "sends the ball foul.",
  "fouls the ball into the stands behind home plate.",
  "pops the ball up into foul territory. It lands in the stands.",
  "clips the edge of the ball.",
  "manages to hit part of the ball, redirecting it slightly.",
  "sends the ball high! But it curves away past the foul pole.",
  "connects with a fly ball to third base. A sudden wind pushes it foul.",
  "sends the ball hurtling into the sky. The catcher is on their feet. The ball lands in the stands.",
];

export const hitNarrations = {
  // Formulaic fragments for composing hit descriptions
  // The engine chooses a type (lineDrive | flyBall | groundBall), a quality bucket,
  // then selects an action phrase and optionally a modifier before the location.
  lineDrive: {
    excellent: [
      "smokes a line drive",
      "hits a laser",
      "smashes the ball",
    ],
    great: ["drills a line drive", "laces a liner", "rips a liner"],
    good: ["lines a solid drive", "smacks a liner"],
    poor: ["flairs a soft liner", "loops a little liner"],
    bad: ["knuckles a weak liner", "bloops a soft liner"],
    silly: ["knocks the ball into play", "taps the ball weakly"],
  },
  flyBall: {
    excellent: [
      "launches a towering fly ball",
      "crushes a majestic fly",
      "blasts a high-arching fly",
    ],
    great: ["lifts a deep fly ball", "drives a high fly"],
    good: ["lifts a fly ball", "floats a routine fly"],
    poor: ["sends the ball high", "pops it up"],
    bad: ["pops a weak fly", "lofts a weakly-hit fly"],
    silly: ["hits a lazy pop-up", "nearly whiffs into a slow pop-up"],
  },
  groundBall: {
    excellent: ["smashes a scorching grounder", "rips a vicious grounder"],
    great: ["hammers a sharp grounder", "smacks a hopper"],
    good: ["chops a grounder", "rolls a firm grounder"],
    poor: ["dribbles a slow roller", "taps a weak grounder"],
    bad: ["trickles the ball into play", "just barely hits the ball into play"],
    silly: ["somehow hits the ball"],
  },
  modifiers: {
    hard: [
      "with a sharp crack",
      "confidently",
      "on a line",
      "with authority",
      "with thunder",
      "impossibly fast",
      "",
    ],
    soft: [
      "off the end of the bat",
      "off the handle",
      "off-balance",
      "off a defensive swing",
      "by accident",
      "off an... interesting swing",
      "off an uncoordinated swing",
      "",
    ],
  },
  prepositions: {
    outfield: ["to", "into"],
    infield: ["to", "toward"],
  },
};
