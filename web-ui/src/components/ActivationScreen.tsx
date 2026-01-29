import React, { useState, useEffect, useCallback } from 'react';
import { addEventListener, emitEvent, isInJuceWebView } from '../lib/juce-bridge';

interface ActivationScreenProps {
  onActivated: () => void;
}

type ActivationStatus = 'checking' | 'input' | 'activating' | 'success' | 'error';

export function ActivationScreen({ onActivated }: ActivationScreenProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState<ActivationStatus>('checking');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isInJuceWebView()) {
      // Dev mode - auto activate after brief delay
      setTimeout(() => onActivated(), 500);
      return;
    }

    // Check initial activation status
    emitEvent('getActivationStatus', {});

    const handleActivationState = (data: unknown) => {
      const d = data as { isConfigured?: boolean; isActivated?: boolean };

      if (!d.isConfigured) {
        // No activation required - skip to main UI
        onActivated();
        return;
      }

      if (d.isActivated) {
        setStatus('success');
        setTimeout(() => onActivated(), 800);
      } else {
        setStatus('input');
      }
    };

    const handleActivationResult = (data: unknown) => {
      const d = data as { status?: string };
      const resultStatus = d.status?.toLowerCase();

      if (resultStatus === 'valid' || resultStatus === 'already_active') {
        setStatus('success');
        setTimeout(() => onActivated(), 1200);
      } else {
        setStatus('error');
        const errorMap: Record<string, string> = {
          'invalid': 'Invalid license key',
          'revoked': 'License has been revoked',
          'max_reached': 'Maximum activations reached',
          'network_error': 'Network error - please try again',
          'server_error': 'Server error - please try again',
          'not_configured': 'Activation not configured',
        };
        setErrorMessage(errorMap[resultStatus || ''] || 'Activation failed');
      }
    };

    const unsub1 = addEventListener('activationState', handleActivationState);
    const unsub2 = addEventListener('activationResult', handleActivationResult);

    return () => {
      unsub1();
      unsub2();
    };
  }, [onActivated]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;

    setStatus('activating');
    setErrorMessage('');
    emitEvent('activateLicense', { code: licenseKey.trim() });
  }, [licenseKey]);

  const handleRetry = useCallback(() => {
    setStatus('input');
    setErrorMessage('');
  }, []);

  return (
    <div className="activation-screen">
      {/* Animated CRT scan lines */}
      <div className="crt-overlay" />

      {/* Noise texture */}
      <div className="noise-overlay" />

      {/* Glowing orbs background */}
      <div className="glow-orb orb-1" />
      <div className="glow-orb orb-2" />
      <div className="glow-orb orb-3" />

      <div className={`activation-card ${status}`}>
        {/* Logo */}
        <div className="activation-logo">
          <div className="logo-crt-frame">
            <span className="logo-text">OXIDE</span>
            <div className="logo-scanline" />
          </div>
          <span className="logo-sub">Lo-Fi Texture Processor</span>
        </div>

        {/* Status-based content */}
        {status === 'checking' && (
          <div className="status-checking">
            <div className="spinner" />
            <span>Checking activation...</span>
          </div>
        )}

        {status === 'input' && (
          <form onSubmit={handleSubmit} className="activation-form">
            <div className="input-group">
              <label>License Key</label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                autoFocus
                spellCheck={false}
              />
            </div>

            <button type="submit" disabled={!licenseKey.trim()}>
              <span>Activate</span>
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        )}

        {status === 'activating' && (
          <div className="status-activating">
            <div className="spinner" />
            <span>Activating license...</span>
          </div>
        )}

        {status === 'success' && (
          <div className="status-success">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <span>Activated!</span>
          </div>
        )}

        {status === 'error' && (
          <div className="status-error">
            <div className="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <span>{errorMessage}</span>
            <button onClick={handleRetry} className="retry-btn">
              Try Again
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="activation-footer">
          <a href="https://beatconnect.io" target="_blank" rel="noopener noreferrer">
            Get a license at beatconnect.io
          </a>
        </div>
      </div>

      <style>{`
        .activation-screen {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #0a0a0c 0%, #12121a 50%, #0a0808 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          overflow: hidden;
        }

        .crt-overlay {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.1) 0px,
            rgba(0, 0, 0, 0.1) 1px,
            transparent 1px,
            transparent 3px
          );
          pointer-events: none;
          animation: crtScroll 10s linear infinite;
        }

        @keyframes crtScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(3px); }
        }

        .noise-overlay {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          opacity: 0.04;
          pointer-events: none;
          mix-blend-mode: overlay;
        }

        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          pointer-events: none;
          animation: orbFloat 8s ease-in-out infinite;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: #ff6b35;
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 300px;
          height: 300px;
          background: #8b5cf6;
          bottom: -50px;
          right: -50px;
          animation-delay: -3s;
        }

        .orb-3 {
          width: 250px;
          height: 250px;
          background: #06b6d4;
          top: 50%;
          left: 60%;
          animation-delay: -5s;
        }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }

        .activation-card {
          width: 420px;
          background: rgba(15, 15, 20, 0.95);
          border: 1px solid rgba(255, 107, 53, 0.2);
          border-radius: 16px;
          padding: 48px 40px;
          box-shadow:
            0 0 60px rgba(255, 107, 53, 0.1),
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
          position: relative;
          z-index: 10;
          transition: all 0.5s ease;
        }

        .activation-card.success {
          border-color: rgba(34, 197, 94, 0.4);
          box-shadow:
            0 0 60px rgba(34, 197, 94, 0.15),
            0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .activation-card.error {
          border-color: rgba(239, 68, 68, 0.3);
        }

        .activation-logo {
          text-align: center;
          margin-bottom: 40px;
        }

        .logo-crt-frame {
          display: inline-block;
          position: relative;
          padding: 8px 16px;
          border: 2px solid rgba(255, 107, 53, 0.3);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .logo-text {
          display: block;
          font-family: 'Rajdhani', sans-serif;
          font-size: 48px;
          font-weight: 300;
          letter-spacing: 16px;
          text-indent: 16px;
          color: #ff6b35;
          text-shadow:
            0 0 20px rgba(255, 107, 53, 0.5),
            0 0 40px rgba(255, 107, 53, 0.3);
        }

        .logo-scanline {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(255, 107, 53, 0.03) 50%,
            transparent 100%
          );
          animation: scanline 3s linear infinite;
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        .logo-sub {
          display: block;
          font-size: 12px;
          letter-spacing: 4px;
          color: rgba(255, 255, 255, 0.35);
          margin-top: 12px;
          text-transform: uppercase;
        }

        .activation-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2px;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
        }

        .input-group input {
          padding: 16px 20px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 107, 53, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 18px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 3px;
          text-align: center;
          outline: none;
          transition: all 0.2s;
        }

        .input-group input:focus {
          border-color: #ff6b35;
          box-shadow: 0 0 20px rgba(255, 107, 53, 0.2);
        }

        .input-group input::placeholder {
          color: rgba(255, 255, 255, 0.15);
          letter-spacing: 2px;
        }

        button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 32px;
          background: linear-gradient(135deg, #ff6b35 0%, #ff8555 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(255, 107, 53, 0.3);
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(255, 107, 53, 0.4);
        }

        button:active:not(:disabled) {
          transform: translateY(0);
        }

        button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-icon {
          width: 18px;
          height: 18px;
        }

        .status-checking,
        .status-activating,
        .status-success,
        .status-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 24px;
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 107, 53, 0.2);
          border-top-color: #ff6b35;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .success-icon {
          width: 64px;
          height: 64px;
          background: rgba(34, 197, 94, 0.1);
          border: 2px solid #22c55e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: successPop 0.4s ease-out;
        }

        .success-icon svg {
          width: 32px;
          height: 32px;
          stroke: #22c55e;
        }

        @keyframes successPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }

        .status-success span {
          font-size: 20px;
          color: #22c55e;
          font-weight: 600;
          letter-spacing: 2px;
        }

        .error-icon {
          width: 64px;
          height: 64px;
          background: rgba(239, 68, 68, 0.1);
          border: 2px solid #ef4444;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-icon svg {
          width: 32px;
          height: 32px;
          stroke: #ef4444;
        }

        .status-error span {
          color: #ef4444;
          font-size: 14px;
        }

        .retry-btn {
          margin-top: 8px;
          padding: 12px 24px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.7);
          box-shadow: none;
        }

        .retry-btn:hover {
          border-color: rgba(255, 255, 255, 0.4);
          color: white;
        }

        .activation-footer {
          margin-top: 32px;
          text-align: center;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .activation-footer a {
          color: rgba(255, 255, 255, 0.35);
          font-size: 12px;
          text-decoration: none;
          letter-spacing: 1px;
          transition: color 0.2s;
        }

        .activation-footer a:hover {
          color: #ff6b35;
        }
      `}</style>
    </div>
  );
}
