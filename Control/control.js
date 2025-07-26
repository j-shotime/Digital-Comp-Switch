let port;
let writer;
let pinStates = [0, 0]; // Pin1 = index 0, Pin2 = index 1

async function connectSerial() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    writer = port.writable.getWriter();
    alert('Serial connected!');
    sendByte(); // Send initial state
  } catch (e) {
    alert('Failed to connect: ' + e);
  }
}

function togglePin(pin) {
  if (typeof writer === 'undefined') {
    alert('Connect to serial first!');
    return;
  }

  pinStates[pin] ^= 1;
  sendByte();
}

async function sendByte() {
  const byte = (pinStates[1] << 1) | pinStates[0];
  const data = new Uint8Array([byte]);
  await writer.write(data);
}
