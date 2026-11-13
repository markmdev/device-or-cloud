import { useState } from "react";
import { deviceState, downloadDeviceModel, type DeviceState } from "./firebase";

/** Says plainly when Chrome's model isn't on this computer, and downloads it on a click. */
export function DownloadPanel({ state, onState, meanwhile }: { state: DeviceState; onState: (s: DeviceState) => void; meanwhile: string }) {
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
      {state === "unsupported" && <p>This browser has no built-in model, so {meanwhile}. Chrome on a computer has one.</p>}
      {state === "unavailable" && <p>This computer can't run Chrome's built-in model, so {meanwhile}.</p>}
      {state === "downloadable" && (
        <p>
          Chrome's built-in model isn't on this computer yet, so {meanwhile}. It's a download of about 4 GB, which took 12 minutes on our laptop.{" "}
          <button onClick={download}>Download it</button>
        </p>
      )}
      {state === "downloading" && (
        <p>
          Downloading Chrome's built-in model: {Math.round(share * 100)}%. Until it's done, {meanwhile}.
          <progress value={share} />
        </p>
      )}
    </aside>
  );
}
