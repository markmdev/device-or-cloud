import { useState } from "react";
import { deviceState, downloadDeviceModel, type DeviceState } from "./firebase";

/**
 * Says plainly when Chrome's model isn't on this computer, and downloads it on a click.
 * `now` is what that means for the page; `toGetIt` is the sentence that leads to the download.
 */
export const whyNot = (state?: DeviceState) =>
  state === "unsupported"
    ? "It needs Chrome's built-in model, which this browser doesn't have"
    : state === "unavailable"
      ? "This computer can't run Chrome's built-in model"
      : state === "downloading"
        ? "Chrome's built-in model is still downloading"
        : state === "downloadable"
          ? "It needs Chrome's built-in model first: download it under the board"
          : undefined;

export function DownloadPanel({ state, onState, now, toGetIt, example }: { state: DeviceState; onState: (s: DeviceState) => void; now: string; toGetIt: string; example?: () => void }) {
  const [share, setShare] = useState(0);
  if (state === "available") return null;
  async function download() {
    onState("downloading");
    try {
      await downloadDeviceModel(setShare);
    } finally {
      onState(await deviceState());
    }
  }
  const instead = example && (
    <button data-lead onClick={example}>
      See a recorded example
    </button>
  );
  return (
    <aside className="download" id="download" data-state={state}>
      {state === "unsupported" && <p>{now} This browser has no built-in model. Chrome on a computer has one. {instead}</p>}
      {state === "unavailable" && <p>{now} This computer can't run Chrome's built-in model. {instead}</p>}
      {state === "downloadable" && (
        <p>
          {now} {toGetIt} {instead}
          <button onClick={download}>Download it</button>
        </p>
      )}
      {state === "downloading" && (
        <p>
          {now} Downloading Chrome's built-in model: {Math.round(share * 100)}%.
          <progress value={share} />
          {instead}
        </p>
      )}
    </aside>
  );
}
