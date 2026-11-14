# How Device or Cloud looks

The look is one idea: **two sides, for good.** The device is on the left in lime, the cloud is on the right in blue, and an ink line runs between them. Everything a reader sees sits on the side it belongs to, or across the line when it belongs to both or to neither.

It is light, loud and flat on purpose: no dark developer-tool page, no gradients, no shadows that blur.

## Colours

| Name | Value | Where |
|---|---|---|
| Ink | `#10130f` | Text, the line, every border (2px), solid buttons |
| Device | `#d6f36b` | The device side, "Ran on this computer", what the device gives users |
| Cloud | `#c4dcff` | The cloud side, "Ran in the cloud" |
| Wrong | `#cf2d12` | A wrong answer, and a model that is outside the bar. Nothing else is red |
| Amber | `#ffd666` | A verdict that is on neither side yet |
| Wash | `#f4f5f1` | Inputs, the footer, quiet surfaces |
| Soft, faint | `#4d5650`, `#7c857e` | Secondary text, field names |

A feature that stays in the cloud is not an error, so the cloud side is never red. Red marks only the answers and the meters that are wrong.

In the shop, a strip in full colour with a filled dot means the answer ran there. A pale strip with a hollow dot means the feature is set to run there and hasn't yet.

## Type

- **Bricolage Grotesque** (700, 800): headings, the two big counts, the answer a proof shows large.
- **Geist** (400 to 600): everything else a person reads.
- **Geist Mono**: what a model was sent and what it answered, and field names.

All three are open licence, loaded from Google Fonts in `index.html` and `shop/index.html`.

## The check, top to bottom

1. **The top line:** the name with its two-colour dot, the shop, where and when the check was recorded, the run button.
2. **A notice** when Chrome's model isn't on this computer, or a run has to wait: a pale amber strip, full width.
3. **The question** large on the left, how the check works small on the right.
4. **The board**, edge to edge. The bar's slider sits on the line at the board's top edge, because it decides which side each feature is on.
   - Each side opens with its count, as large as the page goes.
   - Each feature is a white card with two meters, Chrome's model and the cloud. The tick on a meter is the bar. A meter that falls short of it is red. Moving the slider moves every tick at once, and a feature that changes sides is seen crossing the line.
   - Features that are on neither side (fix the prompt first, not enough inputs, still running) sit in one white panel across the line, each with its verdict in amber.
   - **The proof** is a white panel across the line: Chrome's answer under the device side, the cloud's under the cloud side, the input between them. The field that tells the two answers apart is shown large, both at the same size; the full answers are below it in mono. The plainest failure opens first: only Chrome's model wrong, on every run, with the same answer each time. The page opens on the address feature, whose dropped house number reads in a second.
   - **One more line in the prompt** follows the proof for a feature kept in the cloud: a white panel across the line. A line that moves the feature to the device is a lime card with a solid "Moves to the device"; one that doesn't is a quiet wash card. The reader's own line is the dashed card under them.
5. **The bottom line:** what moving gives the users first, in lime. The money is smaller and to the right.
6. **The footer:** how answers are judged and what leaves the computer, small, on wash.

## Check your own prompts

The same top line, question and board as the shop's check, with the paste form between the question and the board, on wash. Each feature is a white card. Its inputs are one compact row each, on wash, with the column names said once above the rows: the input, the right answer, and for an input the cloud model wrote, a tick box before it and its kind after it. An unticked row loses its fill, since it isn't in the check. What's still missing before a check can run is said in ink, not red: nothing is wrong yet.

## Motion

- Buttons and cards press in slightly (`scale(0.97)` to `0.99`, 140 ms).
- A feature crossing the line moves with a view transition, 340 ms, ease-in-out. Meters and ticks ease out in 200 to 300 ms.
- Nothing else moves. With reduced motion asked for, nothing moves at all.

## Words

- "the device" and "the cloud" for the sides; "Chrome's model" and "the cloud model" for who answered; "Ran on this computer" and "Ran in the cloud" for where.
- Counts are said whole: "69 of 75 runs", never a percentage.
- No other company's name or logo anywhere on either page.

## Sizes

Laptop first: Chrome's model only runs on a computer. Under 900px the sides stack, the device first, and the panels that cross the line become plain panels. Nothing scrolls sideways at 390px.
