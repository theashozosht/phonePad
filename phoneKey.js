const Gpio = require('onoff').Gpio;
const SerialPort = require('serialport');

const port = new SerialPort('/dev/ttyUSB0', {
  baudRate: 9600,
  autoOpen: true
});

let phoneNumber = '';
let isCalling = false;

const keyMap = {
  4: '0',
  17: '1',
  27: '2',
  22: '3',
  5: '4',
  6: '5',
  13: '6',
  19: '7',
  26: '8',
  18: '9',
  23: 'CALL',     // Phone icon or green button
  24: 'END'       // End icon or red button
};

function sendCommand(cmd) {
  console.log(`Sending command: ${cmd.trim()}`);
  port.write(cmd + '\r');
}

function dialNumber(number) {
  sendCommand(`ATD${number};`);
  isCalling = true;
}

function hangUp() {
  sendCommand('ATH');
  isCalling = false;
}

function resetNumber() {
  phoneNumber = '';
}

const buttons = Object.entries(keyMap).map(([pin, label]) => {
  const button = new Gpio(Number(pin), 'in', 'rising', { debounceTimeout: 10 });

  button.watch((err, value) => {
    if (err) {
      console.error(`GPIO error on pin ${pin}:`, err);
      return;
    }

    if (label === 'CALL') {
      if (phoneNumber.length > 0 && !isCalling) {
        dialNumber(phoneNumber);
        resetNumber();
      }
    } else if (label === 'END') {
      if (isCalling) {
        hangUp();
      } else {
        resetNumber();
        console.log('☎️ Cleared number.');
      }
    } else {
      phoneNumber += label;
      console.log(`Number so far: ${phoneNumber}`);
    }
  });

  return button;
});

// Optional: read GSM responses
port.on('data', data => {
  console.log(`📟 GSM: ${data.toString()}`);
});

process.on('SIGINT', () => {
  console.log('\n🧹 Cleaning up...');
  buttons.forEach(btn => btn.unexport());
  if (isCalling) hangUp();
  process.exit();
});
