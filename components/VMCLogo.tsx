import React from 'react';

interface VMCLogoProps {
    className?: string;
    size?: number | string;
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
    showBorder?: boolean;
}

export const VMCLogo: React.FC<VMCLogoProps> = ({
    className = '',
    size = 48,
    rounded = 'xl',
    showBorder = true,
}) => {
    const roundedClass = {
        'none': 'rounded-none',
        'sm': 'rounded-sm',
        'md': 'rounded-md',
        'lg': 'rounded-lg',
        'xl': 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl',
        'full': 'rounded-full'
    }[rounded];

    const sizeStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : { width: size, height: size };

    return (
        <div 
            className={`relative flex items-center justify-center overflow-hidden shrink-0 select-none ${roundedClass} ${className}`}
            style={{
                ...sizeStyle,
                backgroundColor: '#000000',
                boxShadow: showBorder ? '0 4px 14px 0 rgba(0, 0, 0, 0.35)' : 'none',
                border: showBorder ? '1.5px solid rgba(255, 255, 255, 0.15)' : 'none'
            }}
        >
            <svg 
                viewBox="0 0 512 512" 
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Diagonal Slash Slice Geometry */}
                    <clipPath id="vmcTopSlice">
                        <polygon points="105,405 405,105 512,0 512,512 105,512" />
                    </clipPath>
                    <clipPath id="vmcBottomSlice">
                        <polygon points="0,0 512,0 395,115 95,415 0,512" />
                    </clipPath>
                    
                    <linearGradient id="vmcWhiteGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="100%" stopColor="#F8FAFC" />
                    </linearGradient>

                    <linearGradient id="vmcCutSheen" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                        <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.9" />
                    </linearGradient>
                </defs>

                {/* Dark Base */}
                <rect width="512" height="512" fill="#000000" />
                
                {/* Subtle Inner Accent Ring */}
                <rect x="12" y="12" width="488" height="488" rx="80" fill="none" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="4" />

                {/* Monogram Sliced Letters VMC */}
                <g>
                    {/* Upper-Right Sliced Section */}
                    <g clipPath="url(#vmcTopSlice)">
                        <text 
                            x="256" 
                            y="315" 
                            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Montserrat', 'Segoe UI', 'Arial Black', sans-serif" 
                            fontSize="175" 
                            fontWeight="900" 
                            letterSpacing="-2px" 
                            fill="url(#vmcWhiteGlow)" 
                            textAnchor="middle"
                        >VMC</text>
                    </g>

                    {/* Lower-Left Sliced Section */}
                    <g clipPath="url(#vmcBottomSlice)">
                        <text 
                            x="256" 
                            y="315" 
                            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Montserrat', 'Segoe UI', 'Arial Black', sans-serif" 
                            fontSize="175" 
                            fontWeight="900" 
                            letterSpacing="-2px" 
                            fill="url(#vmcWhiteGlow)" 
                            textAnchor="middle"
                        >VMC</text>
                    </g>

                    {/* The Distinct Diagonal Slice Gap */}
                    <line 
                        x1="95" 
                        y1="415" 
                        x2="405" 
                        y2="105" 
                        stroke="#000000" 
                        strokeWidth="14" 
                        strokeLinecap="round" 
                    />
                    
                    {/* Sleek Dynamic Blade / Light Accent */}
                    <line 
                        x1="115" 
                        y1="395" 
                        x2="385" 
                        y2="125" 
                        stroke="url(#vmcCutSheen)" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                    />
                </g>
            </svg>
        </div>
    );
};

export default VMCLogo;
