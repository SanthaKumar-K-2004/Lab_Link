import React from 'react';
import LineWaves, { LineWavesProps } from './LineWaves';

export interface WaveBackgroundProps extends Partial<LineWavesProps> {
  children?: React.ReactNode;
}

export const WaveBackground: React.FC<WaveBackgroundProps> = ({
  color1 = '#4cb7ef',
  color2 = '#38bdf8',
  color3 = '#ffffff',
  speed = 0.3,
  lineCount = 72,
  lineWidth = 1.3,
  highlight = 1,
  warpIntensity = 1,
  rotation = -33,
  enableMouseInteraction = true,
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <LineWaves
        color1={color1}
        color2={color2}
        color3={color3}
        speed={speed}
        lineCount={lineCount}
        lineWidth={lineWidth}
        highlight={highlight}
        warpIntensity={warpIntensity}
        rotation={rotation}
        enableMouseInteraction={enableMouseInteraction}
        {...props}
      />
      {children}
    </div>
  );
};

export { LineWaves };
export default WaveBackground;

