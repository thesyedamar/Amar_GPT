import React from 'react';
import { BotAvatarIcon } from './icons';

export const AIAvatar: React.FC = () => {
    return (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <BotAvatarIcon />
        </div>
    );
};

export default AIAvatar;
