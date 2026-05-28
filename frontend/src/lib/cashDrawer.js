// ESC/POS command: ESC p pin duration1 duration2
// Kicks drawer on pin 2 (most common setup)
const ESC_OPEN_DRAWER = new Uint8Array([0x1b, 0x70, 0x00, 0x40, 0xf0]);

let _port = null;

async function _ensurePort() {
  if (_port) return true;
  // Reuse a previously-permitted port without showing the picker
  const ports = await navigator.serial.getPorts().catch(() => []);
  if (!ports.length) return false;
  _port = ports[0];
  if (!_port.readable) {
    try { await _port.open({ baudRate: 9600 }); }
    catch { _port = null; return false; }
  }
  return true;
}

/** Prompt user to pick a serial port (run once on first setup). */
export async function connectCashDrawer() {
  if (!("serial" in navigator)) return false;
  try {
    _port = await navigator.serial.requestPort();
    await _port.open({ baudRate: 9600 });
    return true;
  } catch {
    _port = null;
    return false;
  }
}

/**
 * Open the cash drawer.
 * Returns { ok: true } on success or { ok: false, reason } on failure.
 *   reason: 'unsupported' | 'not_connected' | 'error'
 */
export async function openCashDrawer() {
  if (!("serial" in navigator)) return { ok: false, reason: "unsupported" };
  const ready = await _ensurePort();
  if (!ready) return { ok: false, reason: "not_connected" };
  try {
    const writer = _port.writable.getWriter();
    await writer.write(ESC_OPEN_DRAWER);
    writer.releaseLock();
    return { ok: true };
  } catch {
    _port = null;
    return { ok: false, reason: "error" };
  }
}

export const cashDrawerSupported = () => "serial" in navigator;
