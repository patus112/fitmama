import { z } from 'zod';
import { illustrationPath } from './illustrations';
import { moreExercises } from './moreExercises';
import { ZONE_IDS, type ZoneId } from './zones';

export const exerciseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  targetArea: z.string().min(1),
  position: z.enum(['Lying down', 'All fours', 'Side lying', 'Standing', 'Seated']),
  equipment: z.string().min(1),
  onCouch: z.boolean(),
  hasCharacter: z.boolean(),
  summary: z.string().min(1),
  steps: z.array(z.string().min(1)).min(3).max(4),
  breathing: z.object({
    exhale: z.string().min(1),
    inhale: z.string().min(1),
  }),
  commonMistakes: z.array(z.string().min(1)).min(2).max(3),
  defaultSeconds: z.number().int().positive().max(180),
  tempoSeconds: z.number().min(2).max(4),
  minRepSeconds: z.number().min(2).max(4).optional(),
  maxRepSeconds: z.number().min(2).max(4).optional(),
  zones: z.array(z.enum(ZONE_IDS)).min(1).optional(),
  mode: z.enum(['rep', 'hold', 'breath']).optional(),
  stopIf: z.string().min(1).optional(),
  image: z.string().min(1).optional(),
  holdSeconds: z.number().positive().max(300).optional(),
  singleHold: z.boolean().optional(),
  cueUp: z.string().min(1).optional(),
  cueDown: z.string().min(1).optional(),
  honestNote: z.string().min(1).optional(),
});

type ExerciseInput = z.infer<typeof exerciseSchema>;

export type ExerciseMode = 'rep' | 'hold' | 'breath';

export type Exercise = ExerciseInput & {
  minRepSeconds: number;
  maxRepSeconds: number;
  zones: ZoneId[];
  mode: ExerciseMode;
  stopIf: string;
  image: string;
  holdSeconds: number;
  singleHold: boolean;
  cueUp: string;
  cueDown: string;
};

const rawExercises = [
  {
    id: 'heel-slides',
    name: 'Heel slides',
    targetArea: 'Abs',
    position: 'Lying down',
    equipment: 'None',
    onCouch: true,
    hasCharacter: false,
    summary: 'Slow slides. One heel at a time.',
    steps: [
      'Lie on your back, knees bent, feet flat.',
      'Slide one heel away until the leg is almost straight, then slide it back.',
      'Switch legs. Keep the lower back heavy on the couch.',
    ],
    breathing: {
      exhale: 'as the heel slides away',
      inhale: 'as the heel comes back',
    },
    commonMistakes: ['Holding your breath', 'Arching the lower back off the couch'],
    defaultSeconds: 30,
    tempoSeconds: 4,
  },
  {
    id: 'dead-bug',
    name: 'Dead bug',
    targetArea: 'Abs',
    position: 'Lying down',
    equipment: 'None',
    onCouch: true,
    hasCharacter: false,
    summary: 'Slow opposite arm and leg. Keep the range small.',
    steps: [
      'Lie on your back, arms toward the ceiling, knees above your hips.',
      'Slowly lower one heel and the opposite arm a short way.',
      'Come back, then switch sides. Stay slow the whole time.',
    ],
    breathing: {
      exhale: 'as the arm and heel reach away',
      inhale: 'as they return',
    },
    commonMistakes: ['Letting the lower back arch', 'Rushing — this one stays slow'],
    defaultSeconds: 40,
    tempoSeconds: 4,
  },
  {
    id: 'belly-draw-in',
    name: 'Belly draw-in',
    targetArea: 'Deep core',
    position: 'All fours',
    equipment: 'None',
    onCouch: false,
    hasCharacter: false,
    summary: 'A quiet draw-in. Almost no movement.',
    steps: [
      'On all fours, hands under shoulders, knees under hips.',
      'Breathe out and gently draw the belly toward the spine.',
      'Relax as you breathe in. Keep the back still.',
    ],
    breathing: {
      exhale: 'as you draw the belly in',
      inhale: 'as you let it soften',
    },
    commonMistakes: ['Holding the breath', 'Tucking the pelvis hard or sagging the back'],
    defaultSeconds: 30,
    tempoSeconds: 4,
  },
  {
    id: 'short-plank',
    name: 'Short plank',
    targetArea: 'Deep core',
    position: 'All fours',
    equipment: 'None',
    onCouch: false,
    hasCharacter: false,
    summary: 'A short hold on your knees. Stop by 30 seconds.',
    steps: [
      'From all fours, lower to your forearms and walk the knees back a little.',
      'Keep one long line from head to knees. Breathe quietly.',
      'Stop at 30 seconds, or sooner if you start to shake.',
    ],
    breathing: {
      exhale: 'slowly through the mouth',
      inhale: 'quietly through the nose',
    },
    commonMistakes: ['Holding the breath', 'Letting the hips sag or pike up'],
    defaultSeconds: 30,
    tempoSeconds: 3,
  },
  {
    id: 'glute-bridge',
    name: 'Glute bridge',
    targetArea: 'Glutes',
    position: 'Lying down',
    equipment: 'None',
    onCouch: true,
    hasCharacter: true,
    summary: 'Slow and steady. Lift, pause, lower.',
    steps: [
      'Lie on your back, knees bent, feet flat.',
      'Press through heels, lift hips slowly.',
      'Pause at the top, then lower gently.',
    ],
    breathing: {
      exhale: 'as hips lift',
      inhale: 'as hips lower',
    },
    commonMistakes: ['Arching the lower back at the top', 'Rushing — keep it slow and calm'],
    defaultSeconds: 30,
    tempoSeconds: 3,
    minRepSeconds: 2,
    maxRepSeconds: 4,
  },
  {
    id: 'side-leg-raise',
    name: 'Side-lying leg raise',
    targetArea: 'Glutes',
    position: 'Side lying',
    equipment: 'None',
    onCouch: true,
    hasCharacter: false,
    summary: 'A small lift. Hips stay stacked.',
    steps: [
      'Lie on your side, head supported, bottom knee bent if you like.',
      'Lift the top leg a short way, then lower it slowly.',
      'Keep the hips stacked. Switch sides halfway.',
    ],
    breathing: {
      exhale: 'as the leg lifts',
      inhale: 'as the leg lowers',
    },
    commonMistakes: ['Rolling the hips backward', 'Swinging the leg up fast'],
    defaultSeconds: 30,
    tempoSeconds: 3,
  },
  {
    id: 'clamshells',
    name: 'Clamshells',
    targetArea: 'Glutes',
    position: 'Side lying',
    equipment: 'None',
    onCouch: true,
    hasCharacter: false,
    summary: 'A small knee opening. Heels stay together.',
    steps: [
      'Lie on your side, knees bent, heels touching.',
      'Keep the feet together and open the top knee a little.',
      'Close slowly. Switch sides halfway.',
    ],
    breathing: {
      exhale: 'as the knee opens',
      inhale: 'as the knee closes',
    },
    commonMistakes: ['Rolling the top hip backward', 'Opening the knee too far'],
    defaultSeconds: 30,
    tempoSeconds: 3,
  },
  {
    id: 'squat-dumbbell',
    name: 'Squat with a light dumbbell',
    targetArea: 'Legs',
    position: 'Standing',
    equipment: '4 kg dumbbell (optional)',
    onCouch: false,
    hasCharacter: false,
    summary: 'Optional. A small squat, not a deep bend.',
    steps: [
      'Stand with feet flat. Hold a 4 kg dumbbell at your chest, or use no weight.',
      'Sit the hips back a short way. Knees track over the toes.',
      'Stand up slowly. Stay well above a deep bend.',
    ],
    breathing: {
      exhale: 'as you stand',
      inhale: 'as you sit the hips back',
    },
    commonMistakes: ['Dropping into a deep bend', 'Letting the knees cave in'],
    defaultSeconds: 30,
    tempoSeconds: 4,
  },
  {
    id: 'bird-dog',
    name: 'Bird-dog leg lift',
    targetArea: 'Deep core',
    position: 'All fours',
    equipment: 'None',
    onCouch: false,
    hasCharacter: false,
    summary: 'One leg reaches back. Hips stay level.',
    steps: [
      'On all fours, hands under shoulders, knees under hips.',
      'Slide one leg back and lift it only a little. Hips stay level.',
      'Bring it down slowly, then switch legs.',
    ],
    breathing: {
      exhale: 'as the leg reaches',
      inhale: 'as the leg returns',
    },
    commonMistakes: ['Arching the lower back', 'Kicking high or moving fast'],
    defaultSeconds: 40,
    tempoSeconds: 4,
  },
  {
    id: 'knees-to-chest',
    name: 'Knees to chest',
    targetArea: 'Back',
    position: 'Lying down',
    equipment: 'None',
    onCouch: true,
    hasCharacter: false,
    summary: 'A gentle back release. Head stays down.',
    steps: [
      'Lie on your back and bring one knee in toward the chest. Hold it lightly.',
      'Keep your head on the cushion. Switch knees when you are ready.',
      'Stay in a small, comfortable range. No pulling hard.',
    ],
    breathing: {
      exhale: 'as the knee comes in',
      inhale: 'as you soften the hold',
    },
    commonMistakes: ['Lifting or yanking the head', 'Pulling the knee in hard'],
    defaultSeconds: 30,
    tempoSeconds: 4,
  },
  {
    id: 'pelvic-floor',
    name: 'Pelvic floor squeeze',
    targetArea: 'Pelvic floor',
    position: 'Lying down',
    equipment: 'Rolled towel',
    onCouch: true,
    hasCharacter: false,
    summary: 'A soft squeeze and a full relax. A roller under the sacrum is optional.',
    steps: [
      'Lie down with a rolled towel between the knees. A roller under the sacrum is optional.',
      'Breathe out and gently squeeze the towel as you lift the pelvic floor.',
      'Fully relax on the breath in. The rest matters as much as the squeeze.',
    ],
    breathing: {
      exhale: 'as you squeeze and lift',
      inhale: 'as you fully let go',
    },
    commonMistakes: ['Holding the breath', 'Clenching the glutes or the jaw'],
    defaultSeconds: 40,
    tempoSeconds: 4,
  },
  {
    id: 'alternating-leg-raises',
    name: 'Alternating leg raises',
    targetArea: 'Abs',
    position: 'Lying down',
    equipment: 'None',
    onCouch: true,
    hasCharacter: false,
    summary: 'One leg at a time. A short lift only.',
    steps: [
      'Lie on your back with one knee bent and the other leg long.',
      'Lift the long leg a short way, then lower it slowly.',
      'Switch legs. Keep the lower back heavy.',
    ],
    breathing: {
      exhale: 'as the leg lifts',
      inhale: 'as the leg lowers',
    },
    commonMistakes: ['Lifting both legs together', 'Letting the lower back arch'],
    defaultSeconds: 30,
    tempoSeconds: 3,
  },
  {
    id: 'knees-apart',
    name: 'Knees together and apart',
    targetArea: 'Glutes',
    position: 'Lying down',
    equipment: 'None',
    onCouch: true,
    hasCharacter: false,
    summary: 'Feet stay flat. Knees open and close a little.',
    steps: [
      'Lie on your back, knees bent, feet flat and a little apart.',
      'Let the knees open a short way, then bring them together.',
      'Keep the feet still and the movement small.',
    ],
    breathing: {
      exhale: 'as the knees come together',
      inhale: 'as the knees open',
    },
    commonMistakes: ['Letting the feet slide around', 'Dropping the knees open fast'],
    defaultSeconds: 30,
    tempoSeconds: 3,
  },
  {
    id: 'leg-circles',
    name: 'Leg circles',
    targetArea: 'Abs',
    position: 'Lying down',
    equipment: 'None',
    onCouch: true,
    hasCharacter: false,
    summary: 'Tiny circles. One leg, low and slow.',
    steps: [
      'Lie on your back, one knee bent, the other leg raised just a little.',
      'Draw small, slow circles with the raised leg.',
      'Change direction, then switch legs. Keep the circles tiny.',
    ],
    breathing: {
      exhale: 'along the top of the circle',
      inhale: 'along the bottom of the circle',
    },
    commonMistakes: ['Making big, fast circles', 'Letting the lower back arch'],
    defaultSeconds: 30,
    tempoSeconds: 4,
  },
];

const ZONE_BY_ID: Record<string, ZoneId[]> = {
  'heel-slides': ['belly'],
  'dead-bug': ['belly'],
  'belly-draw-in': ['belly'],
  'short-plank': ['belly'],
  'glute-bridge': ['hips', 'pelvic-floor', 'lower-back'],
  'side-leg-raise': ['hips', 'thighs'],
  clamshells: ['hips', 'pelvic-floor'],
  'squat-dumbbell': ['thighs', 'hips'],
  'bird-dog': ['belly', 'lower-back'],
  'knees-to-chest': ['lower-back'],
  'pelvic-floor': ['pelvic-floor'],
  'alternating-leg-raises': ['belly'],
  'knees-apart': ['hips', 'pelvic-floor'],
  'leg-circles': ['belly', 'hips'],
};

const DEFAULT_STOP = 'Stop if anything hurts. Stay slow, and never move into pain.';

function withRepWindow(exercise: ExerciseInput): Exercise {
  const minRepSeconds = exercise.minRepSeconds ?? (exercise.tempoSeconds >= 3.5 ? 3 : 2);
  const maxRepSeconds = exercise.maxRepSeconds ?? 4;
  const mode = exercise.mode ?? (exercise.id === 'short-plank' ? 'hold' : 'rep');
  const zones = exercise.zones ?? ZONE_BY_ID[exercise.id] ?? ['relax'];
  const image = exercise.image ?? illustrationPath(exercise.id) ?? `placeholders/${exercise.id}.svg`;
  return {
    ...exercise,
    minRepSeconds,
    maxRepSeconds,
    zones,
    mode,
    stopIf: exercise.stopIf ?? DEFAULT_STOP,
    image,
    holdSeconds: exercise.holdSeconds ?? (exercise.id === 'short-plank' ? 30 : 8),
    singleHold: exercise.singleHold ?? exercise.id === 'short-plank',
    cueUp: exercise.cueUp ?? (exercise.id === 'glute-bridge' ? 'Hips up' : 'Lift'),
    cueDown: exercise.cueDown ?? (exercise.id === 'glute-bridge' ? 'Hips down' : 'Lower'),
  };
}

export const exercises: Exercise[] = z.array(exerciseSchema).parse([...rawExercises, ...moreExercises]).map(withRepWindow);

export function exercisesNeedingArt(): Exercise[] {
  return exercises.filter((exercise) => exercise.image.startsWith('placeholders/'));
}

export const GLUTE_BRIDGE_ID = 'glute-bridge';

export function exerciseById(id: string): Exercise | undefined {
  return exercises.find((exercise) => exercise.id === id);
}

export function equipmentLabel(equipment: string): string {
  return equipment === 'None' ? 'No equipment' : equipment;
}
