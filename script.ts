// --------------------------------
// math

const { PI, sin, cos, tan, abs, min, max } = Math;

const DEG = PI / 180;
const PI2 = PI * 2;

const toRad = (deg: number) => deg * DEG;

// --------------------------------
// controls

class Control {
  private _element: HTMLInputElement;

  readonly min: number;
  readonly max: number;
  val: number;

  constructor(id: string) {
    this._element = <HTMLInputElement>document.getElementById(id);
    this._element.value = localStorage.getItem(id) || this._element.value;

    this.min = +this._element.min;
    this.max = +this._element.max;
    this.val = +this._element.value;

    this._element.addEventListener('change', () => {
      this.val = +this._element.value;
      localStorage.setItem(id, this.val.toString());
    });

    localStorage.setItem(id, this.val.toString());
  }
}

const waves = new Control('waves');
const freq = new Control('freq');
const amp = new Control('amp');
const shift = new Control('shift');
const jump = new Control('jump');
const noise = new Control('noise');
const harmonics = new Control('harmonics');
const speed = new Control('speed');
const hueStep = new Control('hueStep');

// --------------------------------
// audio

const audio = new Audio();
audio.src = 'audio.mp3';
audio.load();

document.addEventListener('keydown', e => {
  switch (e.key) {
    case ' ':
      audio.paused ? audio.play() : audio.pause();
      break;

    case 'ArrowLeft':
      audio.currentTime -= 10;
      break;

    case 'ArrowRight':
      audio.currentTime += 10;
      break;

    case 'ArrowUp':
      audio.volume = Math.min(1, audio.volume + 0.1);
      break;

    case 'ArrowDown':
      audio.volume = Math.max(0, audio.volume - 0.1);
      break;
  }
});

const audioCtx = new AudioContext();

audio.addEventListener('play', () => {
  audioCtx.resume();
});

const source = audioCtx.createMediaElementSource(audio);
const analyser = audioCtx.createAnalyser();

analyser.fftSize = 256;

source.connect(analyser);
analyser.connect(audioCtx.destination);

const BUFFER_SIZE = analyser.frequencyBinCount;
const audioData = new Uint8Array(BUFFER_SIZE);

// --------------------------------
// canvas

const canvas = <HTMLCanvasElement>document.querySelector('canvas');
const context = canvas.getContext('2d');

let cw: number, ch: number, cx: number, cy: number;

const resizeCanvas = () => {
  cw = canvas.width = window.innerWidth;
  ch = canvas.height = window.innerHeight;
  cx = cw / 2;
  cy = ch / 2;
};

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

canvas.addEventListener('dblclick', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';

  input.addEventListener('change', () => {
    if (input.files.length) {
      audio.src = URL.createObjectURL(input.files[0]);
      audio.load();
      audio.play();
    }
  });

  input.click();
});

// --------------------------------
// animation

const animate = (frame = 0) => {
  let frameAngle = frame * DEG * speed.val;

  let timeData = new Uint8Array(BUFFER_SIZE);
  analyser.getByteTimeDomainData(timeData);

  let freqData = new Uint8Array(BUFFER_SIZE);
  analyser.getByteFrequencyData(freqData);

  let beat = (((timeData.reduce((a, b) => a + abs(b - 128), 0) / timeData.length / 128) * 10 * jump.val) / 10) * 0.7 + 0.3;
  let blow = (((freqData.reduce((a, b) => a + b, 0) / freqData.length / 255) * 10 * jump.val) / 10) * 0.7 + 0.3;

  context.save();
  context.fillStyle = '#0008';
  context.fillRect(0, 0, cw, ch);
  context.restore();

  let xDeg = PI2 / (cw / freq.val);

  for (let w = 0; w < waves.val * blow; w++) {
    context.save();

    let gradient = context.createLinearGradient(0, 0, cw, 0);
    let startHue = (frame * speed.val) / 4 + hueStep.val * w * (blow * 0.1 + 0.9);
    let endHue = startHue + hueStep.val * (blow * 0.1 + 0.8);

    gradient.addColorStop(0, `hsl(${startHue}, ${100 * (blow * 0.3 + beat * 0.7)}%, 50%)`);
    gradient.addColorStop(1, `hsl(${endHue}, ${100 * (blow * 0.3 + beat * 0.7)}%, 50%)`);

    context.strokeStyle = gradient;
    context.beginPath();

    for (let x = 0; x < cw; x++) {
      let y = cy;

      y += amp.val * sin((x + shift.val * w * (blow * 0.5 + beat * 0.5)) * xDeg + frameAngle);
      y += noise.val * (w + 1) * beat * sin(x * DEG + frameAngle);
      y += harmonics.val * sin(harmonics.val * x * DEG + frameAngle);

      context.lineTo(x, y);
    }

    context.stroke();
    context.restore();
  }

  requestAnimationFrame(() => animate(frame + 1));
};

requestAnimationFrame(animate);
