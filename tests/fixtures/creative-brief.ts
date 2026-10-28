import type { CreativeBrief } from '../../supabase/functions/_shared/creative-brief.ts';

export const matchaBrief: CreativeBrief = {
  title: 'Tuesday: a tiny matcha ritual',
  format: 'Reel',
  goal: 'Relatability and conversation with other homebodies',
  concept:
    'Turn the three small steps of your morning matcha into a calm, satisfying 9-second ritual. Use the same glass and window for all three clips so it feels like one moment.',
  cadence: 'Weekly',
  length: '9 seconds',
  hook: 'a little drink before the day asks anything of me',
  reference: 'matcha-pour',
  steps: [
    {
      title: 'Whisk beside the window',
      timing: '0–2s',
      direction:
        'Place your phone above the bowl at a 45-degree angle, with window light coming from the left. Whisk in a quick W motion for one clean take; keep the whisk sound. Start with your hand already moving.',
      overlay: 'a little drink before the day asks anything of me',
      reference: ''
    },
    {
      title: 'Catch the green swirl',
      timing: '2–6s',
      direction:
        'Lower your phone to glass height and lock it in place. Pour matcha slowly into iced milk, keeping the full glass and pouring bowl in frame. Cut into this shot as the stream reaches the milk; hold long enough to see the layers swirl.',
      overlay: '',
      reference: 'matcha-pour'
    },
    {
      title: 'Take the first sip',
      timing: '6–9s',
      direction:
        'Keep the phone at the same height. Slide the finished glass toward you, lift it for a sip, then set it down in the original position. End on a still glass so the cut back to the whisk feels calm.',
      overlay: 'okay, now we can start',
      reference: ''
    }
  ],
  editing:
    'Use three straight cuts at 2s and 6s, without a transition effect. Put the hook in the upper third for the first 2 seconds, clear of your hand. Keep whisk and ice sounds over a quiet instrumental bed; lower the music until both sounds are easy to hear. Export vertically in 9:16.',
  caption:
    'my very small prerequisite for being a functioning person 🍵\n\nwhat’s your before-the-day-starts ritual?',
  rationale:
    'This gives your matcha series a repeatable ritual and an easy question for viewers. Relatability is the intended angle; performance is an experiment, not a prediction.'
};

export const comfortsBrief: CreativeBrief = {
  title: 'Little things that make staying home better',
  format: 'Carousel',
  goal: 'Saves and conversation around everyday comforts',
  concept:
    'Photograph five ordinary comforts and explain the small reason each earns a place in your day. Swap any object for something you actually use.',
  cadence: 'Every two weeks',
  length: '5 slides',
  hook: 'little things that make staying home so much better',
  reference: 'little-joys',
  steps: [
    {
      title: 'A corner worth staying in',
      timing: 'Slide 1',
      direction:
        'Photograph your reading corner from the doorway in morning light. Leave the plain wall above the chair empty for the cover line.',
      overlay: 'little things that make staying home so much better',
      reference: 'little-joys'
    },
    {
      title: 'The first warm cup',
      timing: 'Slide 2',
      direction:
        'Shoot your drink from above on a clear table, hands around the cup. Add one honest sentence about when you make it.',
      overlay: 'the cup I make before checking my phone',
      reference: ''
    },
    {
      title: 'A soft place to land',
      timing: 'Slide 3',
      direction:
        'Take a close-up of your blanket folded over the sofa arm with side light showing its texture. Include the book or controller you actually reach for.',
      overlay: 'a blanket and absolutely no plans',
      reference: ''
    },
    {
      title: 'Your after-work reset',
      timing: 'Slide 4',
      direction:
        'Photograph your desk just after switching on the lamp. Keep the warm lamp in frame and turn off the ceiling light.',
      overlay: 'changing the lighting changes the evening',
      reference: 'cozy-desk'
    },
    {
      title: 'Invite their little comfort',
      timing: 'Slide 5',
      direction:
        'Finish with a wider photo of the room at dusk. Leave space over the wall for a short question, so the final slide feels like an invitation.',
      overlay: 'what makes home feel like home to you?',
      reference: ''
    }
  ],
  editing:
    'Crop every photo to 4:5. Use the same small, high-contrast text placement on slides 2–4 and a larger cover line. Keep colors close to the original photos rather than adding a heavy filter.',
  caption:
    'a few small things making ordinary days feel softer lately. nothing fancy, just things I keep coming back to.\n\nwhat would be in your version?',
  rationale:
    'A specific personal detail gives each photo a purpose and gives viewers something concrete to respond to. The closing question invites their own version.'
};
