import React, { useState } from 'react';
import { X, Download, Check, Copy, ExternalLink, ShieldCheck, FolderArchive, Terminal } from 'lucide-react';

interface DownloadModalProps {
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const sha256 = '986c008af51d0f8517b7e1f89a60f6b9f65c9cda76e5f8f828cc381ee04a6004';
  const directDownloadUrl = '/Genie-Remix-4.2.4.zip';

  const copyHash = () => {
    navigator.clipboard.writeText(sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div id="modal-download-overlay" className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="modal-download-content"
        className="bg-stone-900 border border-stone-700/80 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-stone-200 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 bg-stone-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-2">
                Download Genie Remix v4.2.4
                <span className="text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 px-2 py-0.5 rounded">
                  Windows 10 / 11 (64-bit)
                </span>
              </h2>
              <p className="text-[11px] text-stone-400">
                Self-contained release bundle with bundled .NET runtime
              </p>
            </div>
          </div>
          <button
            id="btn-close-download-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed">
          {/* Main Download Callout */}
          <div className="bg-stone-950 p-4 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="font-semibold text-stone-100 flex items-center justify-center sm:justify-start gap-1.5 text-sm">
                <FolderArchive className="w-4 h-4 text-amber-400" />
                <span>Genie-Remix-4.2.4.zip</span>
              </div>
              <p className="text-[11px] text-stone-400">
                Size: ~46.5 MB • Architecture: win-x64 • No prerequisites needed
              </p>
            </div>

            <a
              id="btn-direct-download-zip"
              href={directDownloadUrl}
              download="Genie-Remix-4.2.4.zip"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-md hover:shadow-amber-500/20 transition-all text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download ZIP Now</span>
            </a>
          </div>

          {/* Verification Hash */}
          <div className="bg-stone-950/80 p-3.5 rounded-lg border border-stone-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-stone-300 font-medium">
              <span className="flex items-center gap-1 text-stone-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                SHA-256 Checksum:
              </span>
              <button
                id="btn-copy-sha256"
                onClick={copyHash}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Hash</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-[10px] bg-stone-900 px-2.5 py-1.5 rounded border border-stone-800 text-stone-400 break-all select-all">
              {sha256}
            </div>
          </div>

          {/* Step by Step Running Instructions */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-100 uppercase tracking-wider text-[11px] text-amber-400">
              How to Install & Run on Windows 10 / 11
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-stone-300 text-[11px] bg-stone-950/50 p-3.5 rounded-lg border border-stone-800">
              <li>
                Click <strong className="text-amber-300">Download ZIP Now</strong> above or use the Download button in the top navigation bar.
              </li>
              <li>
                In your Windows <code className="bg-stone-900 px-1 py-0.5 rounded text-stone-200">Downloads</code> folder, right-click <code className="bg-stone-900 px-1 py-0.5 rounded text-stone-200">Genie-Remix-4.2.4.zip</code> and select <strong className="text-stone-100">&quot;Extract All...&quot;</strong>.
              </li>
              <li>
                Open the extracted <code className="bg-stone-900 px-1 py-0.5 rounded text-amber-300">Genie-Remix</code> folder and double-click <strong className="text-emerald-300">Genie.exe</strong>.
              </li>
              <li>
                <em>Optional (Upgrading from previous Genie)</em>: Copy your existing <code className="bg-stone-900 px-1 py-0.5 rounded text-stone-300">Config</code>, <code className="bg-stone-900 px-1 py-0.5 rounded text-stone-300">Maps</code>, <code className="bg-stone-900 px-1 py-0.5 rounded text-stone-300">Scripts</code>, <code className="bg-stone-900 px-1 py-0.5 rounded text-stone-300">Logs</code>, and <code className="bg-stone-900 px-1 py-0.5 rounded text-stone-300">Plugins</code> folders into the new folder.
              </li>
            </ol>
          </div>

          {/* Automatic GitHub Releases Integration */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-100 uppercase tracking-wider text-[11px] text-amber-400">
              Automated GitHub Releases Publishing
            </h3>
            <div className="bg-stone-950/50 p-3.5 rounded-lg border border-stone-800 text-[11px] text-stone-400 space-y-2">
              <p>
                We have updated <code className="text-stone-200 font-mono">.github/workflows/build.yml</code> with automatic release publishing.
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1 text-stone-300">
                <li>
                  <strong className="text-stone-100">Automatic on Sync:</strong> Whenever you click &quot;Publish/Sync changes to GitHub&quot; in AI Studio, the GitHub Actions workflow automatically packages and publishes <code className="text-amber-300 font-mono">Genie-Remix-4.2.4.zip</code> directly into your repository&apos;s <strong className="text-stone-100">Releases</strong> tab.
                </li>
                <li>
                  <strong className="text-stone-100">Manual Trigger via GitHub:</strong> On GitHub, go to <strong className="text-stone-200">Actions &rarr; Release &rarr; Run workflow</strong>, enter version <code className="text-stone-200 font-mono">4.2.4</code>, uncheck dry run, and click Run.
                </li>
                <li>
                  <strong className="text-stone-100">Tag Trigger:</strong> If using the terminal or git, run:
                  <div className="font-mono text-[10px] bg-stone-900 p-2 rounded mt-1 border border-stone-800 text-stone-300">
                    git tag v4.2.4 && git push origin v4.2.4
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            SHA256 verified • Self-contained Windows x64 binary
          </span>
          <button
            id="btn-close-download-footer"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-lg text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
