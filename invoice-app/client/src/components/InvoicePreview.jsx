import React from 'react';
import { motion } from 'framer-motion';

const InvoicePreview = ({ htmlContent }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mt-8 bg-surface rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] border border-border overflow-hidden flex flex-col"
        >
            <div className="bg-slate-50 border-b border-border p-4 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-800">Invoice Preview</h3>
                <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">A4 Document</span>
            </div>
            <div className="p-4 sm:p-8 bg-slate-100/50 flex justify-center items-start overflow-auto max-h-[70vh]">
                {/* The iframe or dangerouslySetInnerHTML container needs scaling to fit well on smaller screens, but for now we just render it in a styled container that looks like A4 page */}
                <div className="shadow-lg bg-white overflow-hidden origin-top scale-[0.6] sm:scale-75 md:scale-90 lg:scale-100 transition-transform" 
                     style={{ width: '210mm', minHeight: '297mm' }}>
                    <iframe 
                        title="Invoice Preview"
                        srcDoc={htmlContent}
                        style={{ width: '100%', height: '100%', border: 'none', minHeight: '297mm' }}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default InvoicePreview;
