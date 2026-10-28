# Creative reference images

The initial inspiration library was generated with the built-in imagegen tool on October 28, 2026. These are generic examples of achievable framing and mood, not the creator's own photographs. The interface labels them **AI-generated inspiration**. Imported-post references use actual saved library thumbnails and are labelled separately.

Project assets are in `public/creative-references/`. JPEG delivery copies are sized to a 960px maximum edge. The original PNGs remain in the generating Codex task's generated-images folder. Image IDs, descriptions and paths are defined in `supabase/functions/_shared/creative-brief.ts`.

The assistant selects a relevant bundled image or an existing library record ID. It does not generate new images at runtime or fabricate stock image URLs. When no supplied visual fits, it gives written framing directions without an unrelated image. A user can choose a different bundled reference or paste their own image/inspiration URL in the storyboard.

## Prompts

### matcha-pour.jpg

Use case: photorealistic-natural. Asset type: vertical visual reference photograph for a creator filming plan. Primary request: close-up of vivid green matcha being poured from a small ceramic bowl into a clear glass of iced milk on a pale kitchen counter, one hand holding the bowl at the top edge. Framing: portrait 3:4, tight detail, glass in lower center, pour clearly visible, ordinary achievable home setup. Soft window daylight, warm lived-in feeling, realistic textures, green plant softly out of focus. No text, no logos, no collage, no watermark. This is inspiration for a shot a solo creator can recreate with a phone.

### cat-moment.jpg

Use case: photorealistic-natural. Asset type: vertical visual reference photograph for a creator filming plan. Primary request: candid fluffy cream and grey house cat caught in a funny slightly surprised open-mouth expression, close-up at cat eye level beside a sunlit apartment window. Portrait 3:4, natural phone-photo feeling, soft warm background, believable everyday candid moment. No text, no logos, no collage, no watermark. This is generic inspiration, not a portrait of a specific pet.

### cozy-desk.jpg

Use case: photorealistic-natural. Asset type: vertical visual reference photograph for a creator filming plan. Primary request: cozy home gaming desk at dusk, monitor showing a generic soft woodland game landscape, cream keyboard, mouse and a mug, a small warm desk lamp and a trailing plant. Portrait 3:4, wide enough to show full desk from seated eye level, warm amber light with soft evening blue window light, realistic approachable lived-in apartment. No people, no readable text, no logos, no collage, no watermark.

### little-joys.jpg

Use case: photorealistic-natural. Asset type: vertical visual reference photograph for a lifestyle carousel planning card. Primary request: a quiet everyday home comfort still life: an open paperback and a handmade ceramic cup on a soft oatmeal throw on a window seat, sunlit autumn yellow leaves visible outside the window. Portrait 3:4 composition, overhead three-quarter angle, beautiful ordinary home moment a solo creator can photograph, natural soft daylight, tactile fabric and paper textures. No readable text, no logos, no collage, no watermark.
