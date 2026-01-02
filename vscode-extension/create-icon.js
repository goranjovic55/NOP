const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a 128x128 PNG icon with enhanced visuals
const canvas = createCanvas(128, 128);
const ctx = canvas.getContext('2d');

// Background gradient
const bgGradient = ctx.createLinearGradient(0, 0, 128, 128);
bgGradient.addColorStop(0, '#1a1a2e');
bgGradient.addColorStop(1, '#0f0f1e');
ctx.fillStyle = bgGradient;
ctx.fillRect(0, 0, 128, 128);

// Rounded corners
ctx.globalCompositeOperation = 'destination-in';
ctx.fillStyle = '#000';
ctx.beginPath();
ctx.moveTo(20, 0);
ctx.lineTo(108, 0);
ctx.quadraticCurveTo(128, 0, 128, 20);
ctx.lineTo(128, 108);
ctx.quadraticCurveTo(128, 128, 108, 128);
ctx.lineTo(20, 128);
ctx.quadraticCurveTo(0, 128, 0, 108);
ctx.lineTo(0, 20);
ctx.quadraticCurveTo(0, 0, 20, 0);
ctx.closePath();
ctx.fill();
ctx.globalCompositeOperation = 'source-over';

// Outer hexagon frame
ctx.strokeStyle = '#00d4ff';
ctx.lineWidth = 3;
ctx.globalAlpha = 0.6;
ctx.beginPath();
ctx.moveTo(64, 16);
ctx.lineTo(96, 36);
ctx.lineTo(96, 76);
ctx.lineTo(64, 96);
ctx.lineTo(32, 76);
ctx.lineTo(32, 36);
ctx.closePath();
ctx.stroke();
ctx.globalAlpha = 1;

// Create gradient for main elements
const gradient = ctx.createLinearGradient(50, 45, 78, 75);
gradient.addColorStop(0, '#00d4ff');
gradient.addColorStop(1, '#00ffaa');

// Main "A" shape with glow
ctx.shadowColor = '#00d4ff';
ctx.shadowBlur = 10;
ctx.strokeStyle = '#00d4ff';
ctx.lineWidth = 4;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.beginPath();
ctx.moveTo(50, 75);
ctx.lineTo(64, 45);
ctx.lineTo(78, 75);
ctx.moveTo(55, 65);
ctx.lineTo(73, 65);
ctx.stroke();
ctx.shadowBlur = 0;

// Knowledge network nodes with glow
const drawGlowingCircle = (x, y, r) => {
  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 8;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
};

drawGlowingCircle(64, 45, 4);
drawGlowingCircle(50, 75, 3);
drawGlowingCircle(78, 75, 3);
drawGlowingCircle(40, 56, 2.5);
drawGlowingCircle(88, 56, 2.5);

// Connection lines
ctx.strokeStyle = '#00d4ff';
ctx.lineWidth = 1.5;
ctx.globalAlpha = 0.5;
ctx.beginPath();
ctx.moveTo(64, 45); ctx.lineTo(40, 56);
ctx.moveTo(64, 45); ctx.lineTo(88, 56);
ctx.moveTo(50, 75); ctx.lineTo(40, 56);
ctx.moveTo(78, 75); ctx.lineTo(88, 56);
ctx.stroke();
ctx.globalAlpha = 1;

// AKIS text with glow
ctx.shadowColor = '#00d4ff';
ctx.shadowBlur = 10;
ctx.fillStyle = gradient;
ctx.font = 'bold 16px "Courier New", monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('AKIS', 64, 108);
ctx.shadowBlur = 0;

// Corner accents
ctx.strokeStyle = '#00d4ff';
ctx.lineWidth = 2;
ctx.globalAlpha = 0.3;
// Top left
ctx.beginPath();
ctx.moveTo(20, 28); ctx.lineTo(20, 20); ctx.lineTo(28, 20);
ctx.stroke();
// Top right
ctx.beginPath();
ctx.moveTo(108, 28); ctx.lineTo(108, 20); ctx.lineTo(100, 20);
ctx.stroke();
// Bottom left
ctx.beginPath();
ctx.moveTo(20, 100); ctx.lineTo(20, 108); ctx.lineTo(28, 108);
ctx.stroke();
// Bottom right
ctx.beginPath();
ctx.moveTo(108, 100); ctx.lineTo(108, 108); ctx.lineTo(100, 108);
ctx.stroke();

// Save
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('resources/akis-icon-128.png', buffer);
console.log('✓ Enhanced AKIS icon created successfully');
