// ==========================================
// 1. DOM CORE ENGINE INITIALIZATION
// ==========================================
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const canvasOrig = document.getElementById('canvas-original');
const canvasProc = document.getElementById('canvas-processed');
const ctxOrig = canvasOrig.getContext('2d');
const ctxProc = canvasProc.getContext('2d');

const brightnessSlider = document.getElementById('brightness');
const contrastSlider = document.getElementById('contrast');
const gammaSlider = document.getElementById('gamma');

const brightnessVal = document.getElementById('brightness-val');
const contrastVal = document.getElementById('contrast-val');
const gammaVal = document.getElementById('gamma-val');

const grayBtn = document.getElementById('gray-btn');
const invertBtn = document.getElementById('invert-btn');
const blurBtn = document.getElementById('blur-btn');
const sharpenBtn = document.getElementById('sharpen-btn');

const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

// Global buffer reference storage arrays
let originalImgData = null; 

// Vector state tracking logic flags
let isGrayscale = false;
let isInverted = false;
let isBlurred = false;
let isSharpened = false;

// ==========================================
// 2. IO PIPELINE / IMAGING EVENT DRIVERS
// ==========================================
function handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert("Invalid file format. Please insert a standard image matrix.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // Locking internal geometry constraints for standard scaling parsing
            canvasOrig.width = canvasProc.width = 500;
            canvasOrig.height = canvasProc.height = 350;

            ctxOrig.drawImage(img, 0, 0, 500, 350);
            ctxProc.drawImage(img, 0, 0, 500, 350);

            originalImgData = ctxOrig.getImageData(0, 0, 500, 350);
            resetWorkspaceState();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
}

function resetWorkspaceState() {
    brightnessSlider.value = 0;
    contrastSlider.value = 0;
    gammaSlider.value = 10;
    
    brightnessVal.innerText = "0";
    contrastVal.innerText = "0";
    gammaVal.innerText = "1.0";
    
    isGrayscale = false;
    isInverted = false;
    isBlurred = false;
    isSharpened = false;
    
    grayBtn.classList.remove('active');
    invertBtn.classList.remove('active');
    blurBtn.classList.remove('active');
    sharpenBtn.classList.remove('active');
}

fileInput.addEventListener('change', (e) => handleImageUpload(e.target.files[0]));

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = "rgba(219, 39, 119, 0.08)";
});
dropZone.addEventListener('dragleave', () => {
    dropZone.style.backgroundColor = "rgba(219, 39, 119, 0.02)";
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = "rgba(219, 39, 119, 0.02)";
    handleImageUpload(e.dataTransfer.files[0]);
});

// ==========================================
// 3. MATH ENGINE: MATRIX ARRAYS TRANSFORMATIONS
// ==========================================
function applyFilters() {
    if (!originalImgData) return;

    let newImgData = ctxOrig.createImageData(originalImgData);
    let srcData = originalImgData.data;   
    let destData = newImgData.data;       

    let bVal = parseInt(brightnessSlider.value);
    let cVal = parseInt(contrastSlider.value);
    let gammaUserVal = parseInt(gammaSlider.value) / 10; 

    // Dynamic Conformance Contrast Coefficient Matrix Calculation
    let factor = (259 * (cVal + 255)) / (255 * (259 - cVal));

    // Spatial Iteration Logic (RGBA sequence stride pattern = 4 bytes per node)
    for (let i = 0; i < srcData.length; i += 4) {
        let r = srcData[i];     
        let g = srcData[i+1];   
        let b = srcData[i+2];   
        let a = srcData[i+3];   

        // 1. ALGORITHM: LINEAR OFFSET MODULATION (BRIGHTNESS)
        r += bVal; g += bVal; b += bVal;

        // 2. ALGORITHM: CONTRAST STRETCHING COEFFICIENTS
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;

        // 3. ALGORITHM: NON-LINEAR EXPONENT GAMMA CORRECTION
        if (gammaUserVal !== 1.0) {
            r = 255 * Math.pow((r / 255), (1 / gammaUserVal));
            g = 255 * Math.pow((g / 255), (1 / gammaUserVal));
            b = 255 * Math.pow((b / 255), (1 / gammaUserVal));
        }

        // 4. ALGORITHM: LUMINANCE MATRIX GRAYSCALE EXTRACTION
        if (isGrayscale) {
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = gray;
        }

        // 5. ALGORITHM: COMPLEMENTARY PIXEL VALUE INVERSION (NEGATIVE STRUCTURE)
        if (isInverted) {
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
        }

        // Dynamic Vector Range Boundaries Clamping Logic [0, 255]
        destData[i]   = Math.min(255, Math.max(0, r));
        destData[i+1] = Math.min(255, Math.max(0, g));
        destData[i+2] = Math.min(255, Math.max(0, b));
        destData[i+3] = a; 
    }

    // Direct memory execution flush onto processed rendering view
    ctxProc.putImageData(newImgData, 0, 0);

    // 6. ALGORITHM SIMULATION: LOW-PASS SPATIAL FILTER BLUR 
    if (isBlurred) {
        ctxProc.filter = 'blur(4px)';
        ctxProc.drawImage(canvasProc, 0, 0);
        ctxProc.filter = 'none'; 
    }

    // 7. ALGORITHM: SPATIAL 2D CONVOLUTION LAPLACIAN MATRIX SHARPENING 
    if (isSharpened) {
        let width = canvasProc.width;
        let height = canvasProc.height;
        
        // 3x3 Convolution High-Pass Kernel Coefficients Matrix Array
        let weights = [  0, -1,  0,
                        -1,  5, -1,
                         0, -1,  0 ]; 
        
        let side = 3;
        let halfSide = 1;
        
        let currentPixels = ctxProc.getImageData(0, 0, width, height);
        let src = currentPixels.data;
        let output = ctxProc.createImageData(width, height);
        let dst = output.data;

        // Nested Spatial 2D Grid Neighborhood Calculations Loop
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let dstOff = (y * width + x) * 4;
                let rMat = 0, gMat = 0, bMat = 0;
                
                for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                        let scy = y + cy - halfSide;
                        let scx = x + cx - halfSide;
                        
                        if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
                            let srcOff = (scy * width + scx) * 4;
                            let wt = weights[cy * side + cx];
                            rMat += src[srcOff] * wt;
                            gMat += src[srcOff + 1] * wt;
                            bMat += src[srcOff + 2] * wt;
                        }
                    }
                }
                dst[dstOff]     = Math.min(255, Math.max(0, rMat));
                dst[dstOff + 1] = Math.min(255, Math.max(0, gMat));
                dst[dstOff + 2] = Math.min(255, Math.max(0, bMat));
                dst[dstOff + 3] = src[dstOff + 3]; 
            }
        }
        ctxProc.putImageData(output, 0, 0);
    }
}

// ==========================================
// 4. PIPELINE REGISTRATION EVENT LISTENERS
// ==========================================
brightnessSlider.addEventListener('input', (e) => {
    brightnessVal.innerText = e.target.value;
    applyFilters();
});

contrastSlider.addEventListener('input', (e) => {
    contrastVal.innerText = e.target.value;
    applyFilters();
});

gammaSlider.addEventListener('input', (e) => {
    let actualGamma = (e.target.value / 10).toFixed(1);
    gammaVal.innerText = actualGamma;
    applyFilters();
});

grayBtn.addEventListener('click', () => {
    if (!originalImgData) return;
    isGrayscale = !isGrayscale;
    grayBtn.classList.toggle('active');
    applyFilters();
});

invertBtn.addEventListener('click', () => {
    if (!originalImgData) return;
    isInverted = !isInverted;
    invertBtn.classList.toggle('active');
    applyFilters();
});

blurBtn.addEventListener('click', () => {
    if (!originalImgData) return;
    isBlurred = !isBlurred;
    blurBtn.classList.toggle('active');
    applyFilters();
});

sharpenBtn.addEventListener('click', () => {
    if (!originalImgData) return;
    isSharpened = !isSharpened;
    sharpenBtn.classList.toggle('active');
    applyFilters();
});

// ==========================================
// 5. STORAGE EXPORT & MEMORY CLEANUP LOGIC
// ==========================================
downloadBtn.addEventListener('click', () => {
    if (!originalImgData) {
        alert("Operation blocked. The processed pixel array container buffer is empty.");
        return;
    }
    const imageURL = canvasProc.toDataURL("image/png");
    const virtualLink = document.createElement('a');
    virtualLink.download = 'processed_matrix_output.png';
    virtualLink.href = imageURL;
    virtualLink.click();
});

resetBtn.addEventListener('click', () => {
    if (!originalImgData) return;
    resetWorkspaceState();
    ctxProc.putImageData(originalImgData, 0, 0);
});