import React from 'react';
import { PlatePreviewSettings } from '../types';

interface LicensePlatePreviewProps {
    arabicTop: string;
    arabicBottom: string;
    englishTop: string;
    englishBottom: string;
    settings: PlatePreviewSettings;
}

const LicensePlatePreview: React.FC<LicensePlatePreviewProps> = ({ 
    arabicTop, 
    arabicBottom, 
    englishTop, 
    englishBottom, 
    settings 
}) => {
    
    const containerStyle: React.CSSProperties = {
        backgroundColor: settings.backgroundColor,
        borderColor: settings.borderColor,
        borderWidth: '2px',
    };

    const textStyle: React.CSSProperties = {
        color: settings.fontColor,
        fontFamily: settings.fontFamily,
    };

    const arabicTextStyle: React.CSSProperties = {
        ...textStyle,
        direction: 'rtl',
    };

    const separatorStyle: React.CSSProperties = {
        width: settings.separatorWidth,
        height: settings.separatorHeight,
        margin: '0 0.25rem',
    };

    const textLength = Math.max(
        arabicTop.replace(/\s/g, '').length, 
        englishBottom.replace(/\s/g, '').length,
        arabicBottom.replace(/\s/g, '').length, 
        englishTop.replace(/\s/g, '').length
    );

    let fontSizeClass = 'text-2xl';
    if (textLength > 3) {
        fontSizeClass = 'text-xl';
    }

    return (
        <div 
            className="w-full max-w-sm mx-auto rounded-lg flex items-center justify-between p-2 shadow-md"
            style={containerStyle}
        >
            {/* KSA Flag part */}
            <div className="flex flex-col items-center justify-center px-2 flex-shrink-0">
                <span className="text-xs font-bold" style={{color: settings.fontColor}}>KSA</span>
                <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Flag_of_Saudi_Arabia.svg/23px-Flag_of_Saudi_Arabia.svg.png" 
                    alt="KSA Flag" 
                    className="h-3"
                />
            </div>
            
            {/* Main Content */}
            <div className="flex items-stretch justify-evenly flex-grow min-w-0">
                {/* Letters Block (Right in RTL) */}
                <div className="flex flex-col items-center justify-around px-1">
                    <span className={`font-bold tracking-wider whitespace-nowrap ${fontSizeClass}`} style={arabicTextStyle}>
                        {arabicBottom.split('').join(' ')}
                    </span>
                    <span className={`font-bold tracking-wider whitespace-nowrap ${fontSizeClass}`} style={textStyle}>
                        {englishTop.split('').reverse().join(' ')}
                    </span>
                </div>

                {/* Separator */}
                {settings.separatorImageUrl ? (
                    <img 
                        src={settings.separatorImageUrl} 
                        alt="Separator" 
                        className="object-contain self-center" 
                        style={separatorStyle} 
                    />
                ) : (
                    <div 
                        className="self-center"
                        style={{ ...separatorStyle, width: '1px', backgroundColor: settings.borderColor }} 
                    ></div>
                )}

                {/* Numbers Block (Left in RTL) */}
                <div className="flex flex-col items-center justify-around px-1">
                    <span className={`font-bold tracking-wider whitespace-nowrap ${fontSizeClass}`} style={arabicTextStyle}>
                        {arabicTop.split('').join(' ')}
                    </span>
                    <span className={`font-bold tracking-wider whitespace-nowrap ${fontSizeClass}`} style={textStyle}>
                        {englishBottom.split('').join(' ')}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default LicensePlatePreview;