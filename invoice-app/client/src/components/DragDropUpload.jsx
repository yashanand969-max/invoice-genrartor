import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileType, X } from 'lucide-react';

const DragDropUpload = ({ onFileSelect, disabled }) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        
        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.xlsx')) {
                setSelectedFile(file);
                onFileSelect(file);
            } else {
                alert('Please upload a valid .xlsx file');
            }
        }
    }, [onFileSelect, disabled]);

    const handleChange = (e) => {
        e.preventDefault();
        if (disabled) return;
        
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.name.endsWith('.xlsx')) {
                setSelectedFile(file);
                onFileSelect(file);
            } else {
                alert('Please upload a valid .xlsx file');
            }
        }
    };

    const removeFile = (e) => {
        e.stopPropagation();
        setSelectedFile(null);
        onFileSelect(null);
    };

    return (
        <form 
            onDragEnter={handleDrag} 
            onDragLeave={handleDrag} 
            onDragOver={handleDrag} 
            onDrop={handleDrop}
            className="w-full max-w-2xl mx-auto"
        >
            <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".xlsx" 
                onChange={handleChange}
                disabled={disabled}
            />
            
            <AnimatePresence mode="wait">
                {!selectedFile ? (
                    <motion.label
                        key="dropzone"
                        htmlFor="file-upload"
                        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-[var(--radius-lg)] cursor-pointer transition-colors duration-200 ease-in-out
                            ${isDragActive ? 'border-primary bg-blue-50' : 'border-border bg-surface hover:bg-slate-50'}
                            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={!disabled ? { scale: 1.01 } : {}}
                        whileTap={!disabled ? { scale: 0.98 } : {}}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                            <motion.div
                                animate={isDragActive ? { y: [0, -10, 0] } : {}}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            >
                                <UploadCloud className={`w-12 h-12 mb-4 ${isDragActive ? 'text-primary' : 'text-slate-400'}`} />
                            </motion.div>
                            <p className="mb-2 text-sm text-slate-600">
                                <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-slate-500">Excel files (.xlsx) only</p>
                        </div>
                    </motion.label>
                ) : (
                    <motion.div
                        key="file-selected"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center justify-between w-full p-4 border border-border rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)]"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-full bg-blue-50 text-primary">
                                <FileType className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-800 truncate max-w-[200px] sm:max-w-xs">{selectedFile.name}</p>
                                <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                        </div>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={removeFile}
                                className="p-2 text-slate-400 hover:text-error transition-colors rounded-full hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </form>
    );
};

export default DragDropUpload;
