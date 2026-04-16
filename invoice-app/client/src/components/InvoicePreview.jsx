import React from 'react';
import { motion } from 'framer-motion';

const InvoicePreview = ({ htmlContent }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-[calc(100%+2rem)] -mx-4 sm:mx-0 sm:w-full mt-8 bg-surface rounded-none sm:rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] border-y sm:border border-border overflow-hidden flex flex-col"
        >
            <div className="bg-slate-50 border-b border-border p-4 px-6 sm:px-4 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-800">Invoice Preview</h3>
                <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">A4 Document</span>
            </div>
            <div className="w-full bg-slate-100/50 flex justify-start sm:justify-center items-start overflow-x-auto max-h-[75vh]">
                <div className="p-2 sm:p-8 min-w-max">
                    <div className="shadow-lg bg-white overflow-hidden origin-top-left sm:origin-top scale-[0.85] sm:scale-[0.85] md:scale-95 lg:scale-100 transition-transform" 
                         style={{ width: '210mm', minHeight: '297mm' }}>
                        <iframe 
                            title="Invoice Preview"
                            srcDoc={htmlContent}
                            style={{ width: '100%', height: '100%', border: 'none', minHeight: '297mm' }}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default InvoicePreview;
