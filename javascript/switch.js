let port;
let writer;
let pinStates = [0, 0]; // [Pin1, Pin2]

window.connectSerial = async function () {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    writer = port.writable.getWriter();
    alert('Serial connected!');
    sendByte();
  } catch (e) {
    alert('Failed to connect: ' + e);
  }
};

window.togglePin = function (pin) {
  if (!writer) {
    alert('Connect to serial first!');
    return;
  }
  pinStates[pin] ^= 1;
  sendByte();
};

async function sendByte() {
  const byte = (pinStates[1] << 1) | pinStates[0];
  await writer.write(new Uint8Array([byte]));
}
