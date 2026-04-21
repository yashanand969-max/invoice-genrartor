import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import DragDropUpload from './components/DragDropUpload';
import UploadProgress from './components/UploadProgress';
import InvoicePreview from './components/InvoicePreview';
import DownloadButton from './components/DownloadButton';
import StatusBanner from './components/StatusBanner';
import { FileText, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '', isVisible: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [invoiceContext, setInvoiceContext] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const showStatus = (type, message) => {
    setStatus({ type, message, isVisible: true });
    if (type !== 'error') {
      setTimeout(() => setStatus(s => ({ ...s, isVisible: false })), 5000);
    }
  };

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    if (!selectedFile) {
        setInvoiceContext(null);
        setStatus({ type: '', message: '', isVisible: false });
        return;
    }

    setIsProcessing(true);
    setProgress(0);
    setInvoiceContext(null);
    setStatus({ type: '', message: '', isVisible: false });

    // Simulate progress for UI UX
    const progressInterval = setInterval(() => {
        setProgress(p => (p < 90 ? p + 10 : p));
    }, 200);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const response = await axios.post(`${API_URL}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        clearInterval(progressInterval);
        setProgress(100);

        setTimeout(() => {
            setIsProcessing(false);
            setInvoiceContext(response.data);
            showStatus('success', `Successfully detected ${response.data.invoiceType} invoice.`);
        }, 500);
        
    } catch (error) {
        clearInterval(progressInterval);
        setIsProcessing(false);
        setFile(null);
        const errMsg = error.response?.data?.error || 'Failed to process the Excel file.';
        showStatus('error', errMsg);
    }
  };

  const handleDownload = async () => {
      if (!invoiceContext) return;
      setIsDownloading(true);

      try {
          const response = await axios.post(`${API_URL}/download`, {
              invoiceType: invoiceContext.invoiceType,
              invoiceData: invoiceContext.invoiceData
          }, {
              responseType: 'blob' // Important for receiving binary data
          });

          // Create a blob from the PDF stream
          const blob = new Blob([response.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          // Extract filename from header if possible, else default
          const contentDisposition = response.headers['content-disposition'];
          let fileName = `${invoiceContext.invoiceType}_Invoice.pdf`;
          if (contentDisposition) {
              const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
              if (fileNameMatch && fileNameMatch.length === 2) {
                  fileName = fileNameMatch[1];
              }
          }
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          
          showStatus('success', 'Invoice downloaded successfully.');
      } catch (error) {
          console.error(error);
          showStatus('error', 'Failed to generate PDF download.');
      } finally {
          setIsDownloading(false);
      }
  };

  const handleReset = () => {
      setFile(null);
      setInvoiceContext(null);
      setStatus({ isVisible: false, type: '', message: '' });
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-8 sm:mb-12">
          <div className="flex items-center space-x-3">
              <img src="/logo.jpg" alt="I FOUR U Logo" className="w-10 h-10 object-contain rounded-md border border-slate-200 bg-white" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800">
                  M/S I FOUR U ENGINEERING SERVICES
              </h1>
          </div>
      </header>

      <main className="w-full max-w-5xl flex flex-col items-center flex-1">
          
          <div className="w-full max-w-2xl text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4 px-4">
                  Transform raw Excel data into PDFs
              </h2>
              <p className="text-lg text-slate-600 font-medium max-w-xl mx-auto">
                  Automatically detect Chola or Apollo templates and generate standard compliant invoices in seconds.
              </p>
          </div>

          <StatusBanner type={status.type} message={status.message} isVisible={status.isVisible} />

          {!invoiceContext ? (
              <div className="w-full">
                  {!isProcessing ? (
                      <DragDropUpload onFileSelect={handleFileSelect} disabled={isProcessing} />
                  ) : (
                      <UploadProgress progress={progress} message="Analyzing Excel structure and formatting data..." />
                  )}
              </div>
          ) : (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full flex flex-col items-center"
              >
                  <div className="w-full flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] border border-border mb-8 gap-4">
                      <div className="flex items-center space-x-4">
                          <div className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide 
                              ${invoiceContext.invoiceType === 'CHOLA' ? 'bg-blue-100 text-blue-800' : 
                                invoiceContext.invoiceType === 'APOLLO' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}
                          `}>
                              {invoiceContext.invoiceType} INVOICE
                          </div>
                          <span className="text-sm font-medium text-slate-500 line-clamp-1">{file?.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-3 w-full sm:w-auto">
                          <button 
                              onClick={handleReset}
                              disabled={isDownloading}
                              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex flex-1 sm:flex-none justify-center items-center space-x-2"
                          >
                              <RefreshCw className="w-4 h-4" />
                              <span>Restart</span>
                          </button>
                          <DownloadButton onClick={handleDownload} isLoading={isDownloading} />
                      </div>
                  </div>

                  <InvoicePreview htmlContent={invoiceContext.previewHtml} />
              </motion.div>
          )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mt-12 pt-6 pb-4 border-t border-border flex flex-col sm:flex-row items-center justify-between text-sm text-slate-500 text-center sm:text-left gap-4">
          <p>This website belongs to M/S I FOUR U ENGINEERING SERVICES and all rights reserved.</p>
          <p>
              Creator of this website <a href="https://instagram.com/yaxsh27" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:text-primary-dark transition-colors">@yaxsh27</a>
          </p>
      </footer>

    </div>
  );
}

export default App;
