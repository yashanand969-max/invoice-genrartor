import React from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2 } from 'lucide-react';

const DownloadButton = ({ onClick, isLoading }) => {
    return (
        <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            disabled={isLoading}
            className={`relative overflow-hidden group flex items-center justify-center space-x-2 w-full sm:w-auto px-8 py-3.5 rounded-[var(--radius-lg)] font-semibold text-white shadow-lg transition-all duration-300
                ${isLoading ? 'bg-primary-dark cursor-not-allowed opacity-90' : 'bg-primary hover:bg-primary-dark hover:shadow-xl hover:shadow-blue-500/20'}
            `}
        >
            {/* Glossy sheen effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
            
            {isLoading ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating PDF...</span>
                </>
            ) : (
                <>
                    <Download className="w-5 h-5" />
                    <span>Download PDF Invoice</span>
                </>
            )}
        </motion.button>
    );
};

export default DownloadButton;
