import { address } from "./address";
import { invoice } from "./invoice";
import { mood } from "./mood";
import { receipt } from "./receipt";
import { returns } from "./returns";
import { summary } from "./summary";
import { ticket } from "./ticket";
import { title } from "./title";

export const FEATURES = [ticket, mood, receipt, title, summary, invoice, address, returns];
export type { Case, Check, Feature } from "./types";
