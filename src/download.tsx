import { useState } from "react";
import { deviceState, downloadDeviceModel, type DeviceState } from "./firebase";

/**
 * Says plainly when Chrome's model isn't on this computer, and downloads it on a click.
 * `now` is what that means for the page; `toGetIt` is the sentence that leads to the download.
 */
export function DownloadPanel({ state, onState, now, toGetIt }: { state: DeviceState; onState: (s: DeviceState) => void; now: string; toGetIt: string }) {
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
  return (
    <aside className="download" data-state={state}>
      {state === "unsupported" && <p>{now} This browser has no built-in model. Chrome on a computer has one.</p>}
      {state === "unavailable" && <p>{now} This computer can't run Chrome's built-in model.</p>}
      {state === "downloadable" && (
        <p>
          {now} {toGetIt} <button onClick={download}>Download it</button>
        </p>
      )}
      {state === "downloading" && (
        <p>
          {now} Downloading Chrome's built-in model: {Math.round(share * 100)}%.
          <progress value={share} />
        </p>
      )}
    </aside>
  );
}
