import React, { useEffect, useState } from 'react';
import { getMyCertificates } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNotification } from '../../context/NotificationContext';
import { CertificateCanvas, exportCertificatePNG, exportCertificatePDF } from '../../components/common/CertificateCanvas';
import { formatDate } from '../../utils/formatters';
import {
  Award,
  Search,
  Download,
  Eye,
  X,
  Calendar,
  Building2,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const MyCertificates = () => {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);
  const [downloadingFormat, setDownloadingFormat] = useState(null); // 'PNG' | 'PDF' | null
  const { addToast } = useNotification();

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await getMyCertificates();
      setCertificates(res.data.data.certificates || []);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleDownload = async (cert, format) => {
    setSelectedCert(cert);
    setDownloadingFormat(format);
    const elementId = `cert_view_${cert.id}`;

    setTimeout(async () => {
      try {
        if (format === 'PNG') {
          await exportCertificatePNG(elementId, `Certificate_${cert.certificateId}.png`);
          addToast('success', 'PNG Certificate downloaded successfully!');
        } else if (format === 'PDF') {
          await exportCertificatePDF(elementId, `Certificate_${cert.certificateId}.pdf`);
          addToast('success', 'PDF Certificate downloaded successfully!');
        }
      } catch (err) {
        console.error('Download error:', err);
        addToast('error', `Failed to export ${format} certificate`);
      } finally {
        setDownloadingFormat(null);
      }
    }, 150);
  };

  const filteredCertificates = certificates.filter((cert) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const certId = (cert.certificateId || '').toLowerCase();
    const title = (cert.training?.title || '').toLowerCase();
    const org = (cert.organization?.name || '').toLowerCase();
    return certId.includes(q) || title.includes(q) || org.includes(q);
  });

  if (loading) return <LoadingSpinner text="Loading earned certificates..." />;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Professional Certifications</span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">My Training Certificates</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View and download official PNG/PDF certificates earned upon completing assigned corporate trainings.
          </p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
          <Award className="w-4 h-4" />
          <span>{certificates.length} Certificate{certificates.length === 1 ? '' : 's'} Earned</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search certificates by training title, certificate ID, or organization..."
          className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
            Clear
          </button>
        )}
      </div>

      {/* Certificates Grid / Empty State */}
      {filteredCertificates.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Certificates Earned Yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {search
              ? 'No certificates match your search query.'
              : 'Complete your assigned training courses 100% to automatically earn official completion certificates.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((cert) => (
            <div
              key={cert.id}
              className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 hover:border-amber-500/40 transition-all space-y-4 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black font-mono">
                    {cert.certificateId}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(cert.completionDate)}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {cert.training?.title || 'Training Program'}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center mt-1">
                    <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {cert.organization?.name || 'Enterprise LMS'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified Corporate Certificate</span>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => setSelectedCert(cert)}
                    className="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> View
                  </button>

                  <button
                    onClick={() => handleDownload(cert, 'PNG')}
                    className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> PNG
                  </button>

                  <button
                    onClick={() => handleDownload(cert, 'PDF')}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center justify-center"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                  </button>
                </div>
              </div>

              {/* Offscreen SVG render canvas element for export */}
              <div className="hidden">
                <CertificateCanvas certificate={cert} elementId={`cert_view_${cert.id}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL CERTIFICATE VIEW MODAL */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
              <div>
                <span className="text-[11px] font-bold text-amber-500 font-mono">{selectedCert.certificateId}</span>
                <h2 className="text-xl font-bold text-white mt-0.5">{selectedCert.training?.title}</h2>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(selectedCert, 'PNG')}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 inline-flex items-center cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download PNG
                </button>

                <button
                  onClick={() => handleDownload(selectedCert, 'PDF')}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/20 inline-flex items-center cursor-pointer"
                >
                  <FileText className="w-4 h-4 mr-1.5" /> Download PDF
                </button>

                <button
                  onClick={() => setSelectedCert(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FULL RESOLUTION CANVAS */}
            <div className="py-2 flex justify-center">
              <CertificateCanvas
                certificate={selectedCert}
                elementId={`cert_view_${selectedCert.id}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
