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
| Amber | `#ffd666` | A verdict that isn't settled: a feature on neither side yet, or a count with not enough inputs to tell |
| Wash | `#f4f5f1` | Inputs, the footer, quiet surfaces |
| Soft, faint | `#4d5650`, `#7c857e` | Secondary text, field names |

A feature that stays in the cloud is not an error, so the cloud side is never red. Red marks only the answers and the meters that are wrong.

In the shop, a strip in full colour with a filled dot means the answer ran there. A pale strip with a hollow dot means the feature is set to run there and hasn't yet.

## Type

- **Bricolage Grotesque** (700, 800): headings, the two big counts, the answer a proof shows large. The mark after that answer stays on the line of its last word.
- **Geist** (400 to 600): everything else a person reads.
- **Geist Mono**: what a model was sent and what it answered, and field names.

All three are open licence, loaded from Google Fonts in `index.html` and `shop/index.html`.

## The check, top to bottom

The first screen is the product: what it does in one sentence, the two counts, and one answer Chrome's model got wrong. On a laptop at 1440 by 900 all three are in view without scrolling.

1. **The top line:** the name with its two-colour dot, the shop, where and when the check was recorded, the run button.
2. **A notice** only when a run has to wait: a pale amber strip, full width.
3. **What it does**, one sentence, on the left, and how the check works small on the right.
4. **The board**, edge to edge. The bar's slider sits on the line at the board's top edge, because it decides which side each feature is on.
   - Where the record has Apple's model too, a switch sits on the same top edge, over the device side: "Chrome on the web" or "The iPhone app". It is one white control with the chosen half in ink, because it decides whose device the left side is. The sentence under the name follows it. Under 1260px it drops under the bar, centred.
   - Each side opens with its count, as large as the page goes. Where more inputs could still move some of its features, the count carries that beside it, small: "Not enough inputs to tell", for how many, and why. The big number never stands without it.
   - Each feature is a white card: its name on the left, two meters on the right, the shown platform's own model and the cloud. The other platform's model is one quiet line under the name, its count in red when it is outside the bar, so a card never grows a third meter. The tick on a meter is the bar. A meter that falls short of it is red. The range a count allows is a band around the end of its meter, as tall as the tick: grey when it is clear of the bar, amber on the platform's own model when it crosses the bar. On a laptop the band says it and the card stays two lines; the range in numbers, "Not enough inputs to tell" and the runs behind a count are written out on the card only where it has room, on a phone and in the panel of features on neither side. A card on the device side adds one line across its foot: what moving costs. Moving the slider moves every tick at once, and a feature that changes sides is seen crossing the line.
   - An empty side says so in the heading type, and the device side adds which feature crosses first and at what bar, so the reader knows where to drag.
   - A bead on the line, in amber, counts the features on neither side and jumps to them.
   - **The proof** comes straight after the two sides, so the feature a reader picked and its proof are together: a white panel across the line, Chrome's answer under the device side, the cloud's under the cloud side, the input between them. The field that tells the two answers apart is shown large, both at the same size; the full answers are below it in mono. The plainest failure opens first: only Chrome's model wrong, on every run, with the same answer each time. The page opens on the address feature, whose dropped house number reads in a second. Picking a feature anywhere brings its proof into view. The count in a sentence, with its range, is the proof's foot, on wash; when there are not enough inputs to tell, that is its last line, in ink, with the amber mark.
   - **One more line in the prompt** follows the proof for a feature kept in the cloud, and for one on the device that still gets inputs wrong: a white panel across the line. A setting in place of a line is the same card with a small switch drawn before its label and no quote marks. A third card with no "try your own" under it takes the full width. A line that moves the feature to the device is a lime card with a solid "Moves to the device"; one that doesn't is a quiet wash card with its reason under a rule.
   - **On neither side yet** comes last in the board: one white panel across the line, each feature with its verdict in amber.
5. **The download notice**, when Chrome's model isn't on this computer, under the board: everything above it was recorded.
6. **The bottom line:** what moving gives the users, in lime.
7. **The footer:** how answers are judged and what leaves the computer, small, on wash.

## Check your own prompts

The same top line, question and board as the shop's check, with the paste form between the question and the board, on wash. Each feature is a white card. Its inputs are one compact row each, on wash, with the column names said once above the rows: the input, the right answer, and for an input the cloud model wrote, a tick box before it and its kind after it. An unticked row loses its fill, since it isn't in the check. What's still missing before a check can run is said in ink, not red: nothing is wrong yet.

## Apply it

Under the bottom line. One line for each feature first: its dot in its side's colour, its parameter, and the mode it gets, with "Not enough inputs to tell" under the mode where it holds. The template, the app code and the deploy command are behind one button under the list, as three white cards with ink borders: the template (tall, on the left), the code and the command. Code sits on wash, never on a dark block.

## The results page

A record to read down, not a dashboard. The summary table is on wash, with each verdict's dot in its side's colour. Each feature's name stays at the top of the window while its inputs scroll. An input is one row: what was asked and the right answer on the left, then Chrome's three runs (lime dot) and the cloud's answer (blue dot). A right answer is a quiet wash box; a wrong one is white with a red outline, so the misses are what the eye lands on.

## The sample shop

Larkfield reads as a shop, and each of its eight features sits where a shop would have it. The check's layer over it is one thing only: the strip at the foot of each feature's card.

1. **The top:** the shop's name and its three places. Under it, on wash, what this shop is and what leaves the computer.
2. **A product page:** the product on the left, drawn in ink on wash (no photographs), its reviews and "Leave a review" on the right.
3. **Your orders:** two orders side by side, each under its own line with the order's number, what it is and where it stands. The order on its way holds the delivery address and the courier's note. The delivered one holds the returns question and the help form.
4. **Rewards, trade and selling:** three cards in a row.

A shopper's own words are set in Geist. A receipt and a trade order keep Geist Mono, since their columns matter. Under 900px everything is one column, in the same order.

## Motion

- Buttons and cards press in slightly (`scale(0.97)` to `0.99`, 140 ms).
- A feature crossing the line moves with a view transition, 340 ms, ease-in-out. Meters and ticks ease out in 200 to 300 ms.
- Nothing else moves. With reduced motion asked for, nothing moves at all.

## Words

- "the device" and "the cloud" for the sides; "Chrome's model" and "the cloud model" for who answered; "Ran on this computer" and "Ran in the cloud" for where.
- Counts are said whole: "47 of 50", never a percentage. A count is inputs right on every run; the runs follow it, small, only where a model's answers vary.
- "Not enough inputs to tell" is one mark everywhere: a small amber block with an ink edge, then the words in ink. It is never a filled pill, which is the verdict "Neither model is good enough".
- No other company's name or logo anywhere on either page.

## Sizes

Laptop first: Chrome's model only runs on a computer. Under 900px the two counts stay side by side at the top of the board, so a phone's first screen has the sentence, the bar and both counts. The device's features follow on lime, then the cloud's on blue, and the panels that cross the line become plain panels. How the check works moves under the board. Nothing scrolls sideways at 390px.

The share picture (`public/board.png`, 1200 by 630) is the real page with the feature lists hidden: the bar, the two counts and the address proof.
