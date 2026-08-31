import fs from 'fs';
import sharp from 'sharp';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Diagonal Slice Clips -->
    <clipPath id="vmcTopSlice">
      <polygon points="105,405 405,105 512,0 512,512 105,512" />
    </clipPath>
    <clipPath id="vmcBottomSlice">
      <polygon points="0,0 512,0 395,115 95,415 0,512" />
    </clipPath>
    
    <linearGradient id="whiteGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F8FAFC" />
    </linearGradient>
    
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#000000" />
      <stop offset="100%" stop-color="#09090B" />
    </linearGradient>

    <linearGradient id="sliceSheen" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="100%" stop-color="#60A5FA" stop-opacity="0.9" />
    </linearGradient>
  </defs>

  <!-- Dark Monogram Background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  
  <!-- Subtle Inner Border -->
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="4" />

  <!-- Monogram VMC with Signature Diagonal Slice -->
  <g>
    <!-- Top-Right Section of VMC -->
    <g clip-path="url(#vmcTopSlice)">
      <text 
        x="256" 
        y="315" 
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Montserrat', 'Segoe UI', 'Arial Black', sans-serif" 
        font-size="175" 
        font-weight="900" 
        letter-spacing="-2px" 
        fill="url(#whiteGlow)" 
        text-anchor="middle"
      >VMC</text>
    </g>

    <!-- Bottom-Left Section of VMC -->
    <g clip-path="url(#vmcBottomSlice)">
      <text 
        x="256" 
        y="315" 
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Montserrat', 'Segoe UI', 'Arial Black', sans-serif" 
        font-size="175" 
        font-weight="900" 
        letter-spacing="-2px" 
        fill="url(#whiteGlow)" 
        text-anchor="middle"
      >VMC</text>
    </g>

    <!-- The Signature Slice Line (Cut) -->
    <line 
      x1="95" 
      y1="415" 
      x2="405" 
      y2="105" 
      stroke="#000000" 
      stroke-width="14" 
      stroke-linecap="round" 
    />
    
    <!-- Light Streak inside the Cut -->
    <line 
      x1="115" 
      y1="395" 
      x2="385" 
      y2="125" 
      stroke="url(#sliceSheen)" 
      stroke-width="3.5" 
      stroke-linecap="round" 
    />
  </g>
</svg>
`;

async function generate() {
  fs.writeFileSync('public/icon.svg', svgContent);
  console.log('Saved public/icon.svg');

  const svgBuffer = Buffer.from(svgContent);

  await sharp(svgBuffer).resize(512, 512).png().toFile('public/icon-512.png');
  console.log('Generated public/icon-512.png');

  await sharp(svgBuffer).resize(192, 192).png().toFile('public/icon-192.png');
  console.log('Generated public/icon-192.png');

  await sharp(svgBuffer).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  console.log('Generated public/apple-touch-icon.png');

  await sharp(svgBuffer).resize(64, 64).png().toFile('public/favicon.png');
  console.log('Generated public/favicon.png');
}

generate().catch(console.error);
