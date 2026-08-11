import { useState } from 'react';
import QRCode from 'react-qr-code';
import QRCodeLink from 'qrcode';
import './App.css';

function App() {
  const [link, setLink] = useState('');
  const [qrcodeLink, setQrcodeLink] = useState('');

  function handleGenerate(link_url){
    if(!link_url) {
      setQrcodeLink('');
      return;
    }
    QRCodeLink.toDataURL(link_url, {
      width: 600,
      margin: 3,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, function(err, url){
      setQrcodeLink(url);
    })
  }

  function handleQrcode(e){
    setLink(e.target.value);
    handleGenerate(e.target.value);
  }

  return (
    <div className='container'>
      <div className="card">
        <h1 className="title">Gerador de QR Code</h1>
        
        {link ? (
          <div className="qrcode-container">
            <QRCode value={link} size={256} />
          </div>
        ) : (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <rect x="7" y="7" width="3" height="3"></rect>
              <rect x="14" y="7" width="3" height="3"></rect>
              <rect x="7" y="14" width="3" height="3"></rect>
              <rect x="14" y="14" width="3" height="3"></rect>
            </svg>
            <p>Digite um texto ou link para gerar seu QR Code</p>
          </div>
        )}

        <div className="input-wrapper">
          <input
            className='input'
            placeholder='Cole seu link ou texto aqui...'
            value={link}
            onChange={handleQrcode}
          />
        </div>

        <a 
          className={`download-btn ${!qrcodeLink ? 'disabled' : ''}`}
          href={qrcodeLink || '#'} 
          download={qrcodeLink ? 'qrcode.png' : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Baixar QR Code
        </a>
      </div>
    </div>
  );
}

export default App;
