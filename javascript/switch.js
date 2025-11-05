let pinStates = [0, 0]; // [enable(LSB), mode(MSB)] => [Enable/Disable, Driver/Autonomous]

window.connectSerial = async function () {
  try {
    if (!('serial' in navigator)) {
      alert('Web Serial not supported in this browser. Use Chrome/Edge over HTTPS or localhost.');
      return;
    }
    // Reuse global pairing from script.js
    const getPort = window.getSerialPort;
    const pair = window.tryWebSerialPair;
    if (typeof getPort !== 'function' || typeof pair !== 'function') {
      alert('Serial helpers not available. Make sure main script loaded.');
      return;
    }
    let port = getPort();
    if (!port || !port.writable) {
      await pair();
      port = getPort();
    }
    if (port && port.writable) {
      alert('Serial connected!');
      // Send current state on connect
      await sendCurrentState();
    } else {
      alert('Failed to connect to serial device.');
    }
  } catch (e) {
    alert('Failed to connect: ' + e);
  }
};

window.togglePin = function (pin) {
  const getPort = window.getSerialPort;
  if (!getPort || !getPort() || !getPort().writable) {
    alert('Connect to serial first!');
    return;
  }
  pinStates[pin] ^= 1;
  sendCurrentState();
};

async function sendCurrentState() {
  const send = window.sendSwitchState;
  if (typeof send !== 'function') return;
  const enable = pinStates[0] & 1;
  const mode = pinStates[1] & 1;
  await send(enable, mode);
}
