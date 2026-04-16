import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const StatusBanner = ({ type, message, isVisible }) => {
    
    const config = {
        success: {
            icon: <CheckCircle2 className="w-5 h-5 text-success" />,
            border: 'border-green-200',
            bg: 'bg-green-50',
            text: 'text-green-800'
        },
        error: {
            icon: <AlertCircle className="w-5 h-5 text-error" />,
            border: 'border-red-200',
            bg: 'bg-red-50',
            text: 'text-red-800'
        },
        info: {
            icon: <Info className="w-5 h-5 text-primary" />,
            border: 'border-blue-200',
            bg: 'bg-blue-50',
            text: 'text-blue-800'
        }
    };

    const currentConfig = config[type] || config.info;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`flex items-center space-x-3 p-4 rounded-[var(--radius-lg)] border ${currentConfig.border} ${currentConfig.bg} ${currentConfig.text} shadow-sm max-w-2xl mx-auto mb-6`}
                >
                    {currentConfig.icon}
                    <span className="font-medium text-sm">{message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StatusBanner;
