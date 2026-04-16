import React from 'react';
import { motion } from 'framer-motion';

const UploadProgress = ({ progress = 0, message = 'Processing...' }) => {
    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-surface rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] border border-border">
            <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{message}</span>
                <span className="text-sm font-medium text-primary">{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <motion.div 
                    className="bg-primary h-2.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeInOut", duration: 0.5 }}
                />
            </div>
            <div className="mt-4 flex justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                />
            </div>
        </div>
    );
};

export default UploadProgress;
