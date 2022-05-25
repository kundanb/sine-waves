// --------------------------------
// math
var PI = Math.PI, sin = Math.sin, cos = Math.cos, tan = Math.tan, abs = Math.abs, min = Math.min, max = Math.max;
var DEG = PI / 180;
var PI2 = PI * 2;
var toRad = function (deg) { return deg * DEG; };
// --------------------------------
// controls
var Control = /** @class */ (function () {
    function Control(id) {
        var _this = this;
        this.setVal = function (val) {
            _this.val = val;
            _this._element.value = val.toString();
            localStorage.setItem(_this._id, _this.val.toString());
        };
        this.reset = function () {
            _this.setVal(_this.def);
        };
        this._id = id;
        this._element = document.getElementById(id);
        this._element.value = localStorage.getItem(id) || this._element.value;
        this.min = +this._element.min;
        this.max = +this._element.max;
        this.def = +this._element.dataset.def;
        this.val = +this._element.value;
        this._element.addEventListener('change', function () {
            _this.val = +_this._element.value;
            localStorage.setItem(id, _this.val.toString());
        });
        localStorage.setItem(id, this.val.toString());
    }
    return Control;
}());
var waves = new Control('waves');
var freq = new Control('freq');
var amp = new Control('amp');
var shift = new Control('shift');
var jump = new Control('jump');
var noise = new Control('noise');
var harmonics = new Control('harmonics');
var speed = new Control('speed');
var hueStep = new Control('hueStep');
var smooth = new Control('smooth');
var resetButton = document.getElementById('reset');
resetButton.addEventListener('click', function () {
    waves.reset();
    freq.reset();
    amp.reset();
    shift.reset();
    jump.reset();
    noise.reset();
    harmonics.reset();
    speed.reset();
    hueStep.reset();
    smooth.reset();
});
// --------------------------------
// audio
var audio = new Audio();
audio.src = 'audio.mp3';
audio.load();
document.addEventListener('keydown', function (e) {
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
var audioCtx = new AudioContext();
audio.addEventListener('play', function () {
    audioCtx.resume();
});
var source = audioCtx.createMediaElementSource(audio);
var analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;
source.connect(analyser);
analyser.connect(audioCtx.destination);
var BUFFER_SIZE = analyser.frequencyBinCount;
var audioData = new Uint8Array(BUFFER_SIZE);
// --------------------------------
// canvas
var canvas = document.querySelector('canvas');
var context = canvas.getContext('2d');
var cw, ch, cx, cy;
var resizeCanvas = function () {
    cw = canvas.width = window.innerWidth;
    ch = canvas.height = window.innerHeight;
    cx = cw / 2;
    cy = ch / 2;
};
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('dblclick', function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.addEventListener('change', function () {
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
var animate = function (frame) {
    if (frame === void 0) { frame = 0; }
    var frameAngle = frame * DEG * speed.val;
    var timeData = new Uint8Array(BUFFER_SIZE);
    analyser.getByteTimeDomainData(timeData);
    var freqData = new Uint8Array(BUFFER_SIZE);
    analyser.getByteFrequencyData(freqData);
    var beat = (((timeData.reduce(function (a, b) { return a + abs(b - 128); }, 0) / timeData.length / 128) * 10 * jump.val) / 10) * 0.7 + 0.3;
    var blow = (((freqData.reduce(function (a, b) { return a + b; }, 0) / freqData.length / 255) * 10 * jump.val) / 10) * 0.7 + 0.3;
    context.save();
    context.fillStyle = "rgba(0, 0, 0, ".concat(1 - smooth.val / 10, ")");
    context.fillRect(0, 0, cw, ch);
    context.restore();
    var xDeg = PI2 / (cw / freq.val);
    for (var w = 0; w < waves.val * blow; w++) {
        context.save();
        var gradient = context.createLinearGradient(0, 0, cw, 0);
        var startHue = (frame * speed.val) / 4 + hueStep.val * w * (blow * 0.1 + 0.9);
        var endHue = startHue + hueStep.val * (blow * 0.1 + 0.8);
        gradient.addColorStop(0, "hsl(".concat(startHue, ", ").concat(100 * (blow * 0.3 + beat * 0.7), "%, 50%)"));
        gradient.addColorStop(1, "hsl(".concat(endHue, ", ").concat(100 * (blow * 0.3 + beat * 0.7), "%, 50%)"));
        context.strokeStyle = gradient;
        context.beginPath();
        for (var x = 0; x < cw; x++) {
            var y = cy;
            y += amp.val * sin((x + shift.val * w * (blow * 0.5 + beat * 0.5)) * xDeg + frameAngle);
            y += noise.val * (w + 1) * beat * sin(x * DEG + frameAngle);
            y += harmonics.val * blow * sin(harmonics.val * x * DEG + frameAngle);
            context.lineTo(x, y);
        }
        context.stroke();
        context.restore();
    }
    requestAnimationFrame(function () { return animate(frame + 1); });
};
requestAnimationFrame(animate);
