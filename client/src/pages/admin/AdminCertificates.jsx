import React, { useEffect, useState } from 'react';
import {
  getOrgCertificates,
  getCertificateTemplate,
  updateCertificateTemplate,
  resetCertificateTemplate,
  getBackfillEligible,
  backfillCertificates
} from '../../services/api';
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
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  FileText
} from 'lucide-react';

export const AdminCertificates = () => {
  const [activeTab, setActiveTab] = useState('issued'); // 'issued' | 'designer'
  const [loading, setLoading] = useState(true);
  const { addToast } = useNotification();

  // Issued Certificates State
  const [certificates, setCertificates] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);

  // Template Designer State
  const [template, setTemplate] = useState({
    title: 'CERTIFICATE OF COMPLETION',
    primaryColor: '#1E3A8A',
    accentColor: '#D97706',
    fontFamily: 'Inter',
    borderStyle: 'classic_gold',
    layoutStyle: 'centered'
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Backfill State
  const [backfillCount, setBackfillCount] = useState(0);
  const [runningBackfill, setRunningBackfill] = useState(false);

  const fetchCertificatesData = async () => {
    try {
      const [certRes, tplRes, backfillRes] = await Promise.all([
        getOrgCertificates({ search }),
        getCertificateTemplate(),
        getBackfillEligible()
      ]);
      setCertificates(certRes.data.data.certificates || []);
      if (tplRes.data.data.template) {
        setTemplate(tplRes.data.data.template);
      }
      setBackfillCount(backfillRes.data.data.count || 0);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to load certification data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificatesData();
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    getOrgCertificates({ search: val })
      .then(res => setCertificates(res.data.data.certificates || []))
      .catch(() => {});
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    setSavingTemplate(true);
    try {
      const res = await updateCertificateTemplate(template);
      setTemplate(res.data.data.template);
      addToast('success', 'Certificate template settings saved successfully!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to save template settings');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleResetTemplate = async () => {
    if (!window.confirm('Reset certificate template to default colors and layout?')) return;
    setSavingTemplate(true);
    try {
      const res = await resetCertificateTemplate();
      setTemplate(res.data.data.template);
      addToast('success', 'Template settings reset to default values.');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to reset template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleRunBackfill = async () => {
    setRunningBackfill(true);
    try {
      const res = await backfillCertificates();
      addToast('success', res.data.message || 'Backfill completed!');
      await fetchCertificatesData();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to execute backfill');
    } finally {
      setRunningBackfill(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading organization certificates & settings..." />;

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Organization Governance</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading mt-1">Certificates & Designer</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage organization completion certificates, customize certificate template styles, and trigger backfill generation.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('issued')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'issued'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Issued Certificates ({certificates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('designer')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'designer'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Certificate Designer</span>
          </button>
        </div>
      </div>

      {/* BACKFILL NOTICE BANNER FOR MISSING CERTIFICATES */}
      {backfillCount > 0 && (
        <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-scale-up">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center flex-shrink-0">
              <RefreshCw className={`w-5 h-5 ${runningBackfill ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h4 className="font-bold text-xs text-emerald-800 uppercase tracking-wider flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Missing Certificates Found ({backfillCount})
              </h4>
              <p className="text-xs text-slate-700 mt-0.5">
                {backfillCount} completed training assignment{backfillCount === 1 ? '' : 's'} in your organization do not have certificates issued yet.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunBackfill}
            disabled={runningBackfill}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {runningBackfill ? 'Generating Certificates...' : `Generate ${backfillCount} Missing Certificate${backfillCount === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {/* TAB 1: ISSUED CERTIFICATES TABLE */}
      {activeTab === 'issued' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by Employee name, Training title, or Certificate ID..."
              className="w-full bg-transparent text-xs text-slate-900 outline-none"
            />
            {search && (
              <button onClick={() => { setSearch(''); getOrgCertificates().then(res => setCertificates(res.data.data.certificates || [])); }} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider text-[11px]">
                    <th className="p-4">Certificate ID</th>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Training Title</th>
                    <th className="p-4">Completion Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {certificates.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400">
                        No organization certificates found.
                      </td>
                    </tr>
                  ) : (
                    certificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-mono font-bold text-emerald-700">
                          {cert.certificateId}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          {cert.employee?.name}
                        </td>
                        <td className="p-4 text-slate-500">
                          {cert.employee?.department?.name || 'N/A'}
                        </td>
                        <td className="p-4 font-semibold text-slate-800">
                          {cert.training?.title}
                        </td>
                        <td className="p-4 text-slate-500 font-mono">
                          {formatDate(cert.completionDate)}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedCert(cert)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer inline-flex items-center"
                            title="View Certificate"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCert(cert);
                              setTimeout(() => {
                                exportCertificatePNG(`admin_cert_${cert.id}`, `Certificate_${cert.certificateId}.png`);
                              }, 150);
                            }}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer inline-flex items-center border border-emerald-200"
                            title="Download PNG"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCert(cert);
                              setTimeout(() => {
                                exportCertificatePDF(`admin_cert_${cert.id}`, `Certificate_${cert.certificateId}.pdf`);
                              }, 150);
                            }}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-colors cursor-pointer inline-flex items-center border border-red-200"
                            title="Download PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CERTIFICATE DESIGNER */}
      {activeTab === 'designer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Form */}
          <form onSubmit={handleSaveTemplate} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center">
                <Palette className="w-4 h-4 mr-2 text-emerald-600" /> Template Styling
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Customize colors, borders, fonts, and titles for future certificates.
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Certificate Heading Title
              </label>
              <input
                type="text"
                value={template.title}
                onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-emerald-600 outline-none"
              />
            </div>

            {/* Primary Color */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Brand Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={template.primaryColor}
                  onChange={(e) => setTemplate({ ...template, primaryColor: e.target.value })}
                  className="w-9 h-9 rounded-xl border-none cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={template.primaryColor}
                  onChange={(e) => setTemplate({ ...template, primaryColor: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-900 outline-none"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Accent Line / Gold Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={template.accentColor}
                  onChange={(e) => setTemplate({ ...template, accentColor: e.target.value })}
                  className="w-9 h-9 rounded-xl border-none cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={template.accentColor}
                  onChange={(e) => setTemplate({ ...template, accentColor: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-900 outline-none"
                />
              </div>
            </div>

            {/* Border Style */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Frame Border Style
              </label>
              <select
                value={template.borderStyle}
                onChange={(e) => setTemplate({ ...template, borderStyle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 outline-none"
              >
                <option value="classic_gold">Classic Gold Frame</option>
                <option value="modern_slate">Modern Slate Dashed</option>
                <option value="minimal_navy">Minimalist Navy Bars</option>
                <option value="double_emerald">Double Rounded Frame</option>
              </select>
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Typography Font Family
              </label>
              <select
                value={template.fontFamily}
                onChange={(e) => setTemplate({ ...template, fontFamily: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 outline-none"
              >
                <option value="Inter">Inter (Clean Modern)</option>
                <option value="Georgia, serif">Georgia (Classic Serif)</option>
                <option value="Roboto, sans-serif">Roboto (Corporate Sans)</option>
                <option value="Playfair Display, serif">Playfair (Elegant Display)</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
              <p className="font-bold flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Immutability Guarantee:
              </p>
              <p className="opacity-90">
                Updating template settings will apply to future certificates. Already issued certificates retain their frozen snapshot.
              </p>
            </div>

            {/* Submit / Reset Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetTemplate}
                disabled={savingTemplate}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer flex items-center"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
              </button>

              <button
                type="submit"
                disabled={savingTemplate}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" /> {savingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </form>

          {/* LIVE PREVIEW CANVAS */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Live Certificate Preview (Sample Data)
              </h3>
              <span className="text-[11px] text-emerald-600 font-bold">Real-time Rendering</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <CertificateCanvas
                templateSettings={template}
                sampleData={{
                  organizationName: 'LMS',
                  employeeName: 'Sarah Jenkins',
                  trainingTitle: 'Enterprise Cloud Architecture & Compliance',
                  certificateId: 'CERT-2026-SAMPLE',
                  completionDate: new Date()
                }}
                elementId="template_preview_canvas"
              />
            </div>
          </div>
        </div>
      )}

      {/* FULL VIEW MODAL */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl h-[88vh] max-h-[850px] bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 flex flex-col shadow-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3 shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-[11px] font-bold text-emerald-700 font-mono">{selectedCert.certificateId}</span>
                <h2
                  className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 truncate"
                  title={`${selectedCert.employee?.name ? `${selectedCert.employee.name} • ` : ''}${selectedCert.training?.title || ''}`}
                >
                  {selectedCert.employee?.name ? `${selectedCert.employee.name} • ` : ''}
                  {selectedCert.training?.title}
                </h2>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => exportCertificatePNG(`admin_cert_${selectedCert.id}`, `Certificate_${selectedCert.certificateId}.png`)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs inline-flex items-center cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download PNG
                </button>

                <button
                  onClick={() => exportCertificatePDF(`admin_cert_${selectedCert.id}`, `Certificate_${selectedCert.certificateId}.pdf`)}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs inline-flex items-center cursor-pointer"
                >
                  <FileText className="w-4 h-4 mr-1.5" /> Download PDF
                </button>

                <button
                  onClick={() => setSelectedCert(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 min-w-0 p-3 sm:p-5 flex items-center justify-center bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden mt-4">
              <CertificateCanvas
                certificate={selectedCert}
                elementId={`admin_cert_${selectedCert.id}`}
                className="max-h-full max-w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

