/** Lines we wrote ourselves after reading the record's failures, shown beside the cloud model's and labelled as ours. */
export const OUR_LINES: Record<string, string> = {
  ticket_route:
    "Go by what the customer wants done, not by the words they use: money that hasn't come back after a return, or a charge they dispute, is billing, and changing details saved on their account is account, even when the message mentions a delivery or a return.",
  review_mood:
    "Go by the buyer's final word on the product itself: positive if they end up pleased with it, negative if it broke, disappointed them or is going back, and mixed only if they say they can't decide.",
  receipt_fields:
    "Dates on these receipts are written day first, so 03/04/2026 is 3 April 2026, and the total is the amount charged for the goods and any service, never the cash handed over or the change given.",
  email_address: "The street line must keep the house number or house name, and any flat or unit, as the customer gives them.",
};

/** The features a line is also tried for on Apple's model: the three it comes closest on. */
export const APPLE_LINES = ["ticket_route", "review_mood", "receipt_fields"];
