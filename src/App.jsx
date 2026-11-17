import { useEffect, useId, useState } from 'react';
import QRCode from 'qrcode';
import './App.css';

const MAXIMO_NA_TELA = 300;

function IconeDownload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export default function App() {
  const [texto, setTexto] = useState('');
  const [cor, setCor] = useState('#000000');
  const [tamanho, setTamanho] = useState(256);
  const [imagem, setImagem] = useState('');
  const [erro, setErro] = useState('');

  const idTexto = useId();
  const idCor = useId();
  const idTamanho = useId();

  // A mesma imagem PNG é mostrada na tela e baixada: o que se vê é o que se leva.
  useEffect(() => {
    if (!texto) return undefined;

    let cancelado = false;
    QRCode.toDataURL(texto, {
      width: tamanho,
      margin: 3,
      color: { dark: cor, light: '#ffffff' },
    })
      .then((url) => {
        if (cancelado) return;
        setImagem(url);
        setErro('');
      })
      .catch(() => {
        if (cancelado) return;
        setImagem('');
        setErro('Esse texto é longo demais para um QR Code. Encurte o conteúdo.');
      });

    return () => {
      cancelado = true;
    };
  }, [texto, cor, tamanho]);

  const temQrCode = texto !== '' && imagem !== '' && erro === '';
  const naTela = Math.min(tamanho, MAXIMO_NA_TELA);

  return (
    <main className="container">
      <div className="card">
        <h1 className="title">Gerador de QR Code</h1>

        {temQrCode ? (
          <div className="qrcode-container">
            <img src={imagem} alt="QR Code gerado" width={naTela} height={naTela} />
          </div>
        ) : (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <rect x="7" y="7" width="3" height="3" />
              <rect x="14" y="7" width="3" height="3" />
              <rect x="7" y="14" width="3" height="3" />
              <rect x="14" y="14" width="3" height="3" />
            </svg>
            <p role={texto && erro ? 'alert' : undefined}>
              {texto && erro ? erro : 'Digite um texto ou link para gerar seu QR Code'}
            </p>
          </div>
        )}

        <div className="input-wrapper">
          <label htmlFor={idTexto} className="sr-only">
            Texto ou link
          </label>
          <input
            id={idTexto}
            className="input"
            placeholder="Cole seu link ou texto aqui..."
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
          />
        </div>

        <div className="controls">
          <div className="control-group">
            <label htmlFor={idCor}>Cor do QR Code</label>
            <input
              id={idCor}
              type="color"
              className="color-input"
              value={cor}
              onChange={(event) => setCor(event.target.value)}
            />
          </div>
          <div className="control-group">
            <label htmlFor={idTamanho}>Tamanho: {tamanho}px</label>
            <input
              id={idTamanho}
              type="range"
              className="range-input"
              min="128"
              max="1024"
              step="32"
              value={tamanho}
              onChange={(event) => setTamanho(Number(event.target.value))}
            />
          </div>
        </div>

        {temQrCode ? (
          <a className="download-btn" href={imagem} download={`qrcode_${tamanho}px.png`}>
            <IconeDownload />
            Baixar QR Code
          </a>
        ) : (
          <span className="download-btn disabled" aria-disabled="true">
            <IconeDownload />
            Baixar QR Code
          </span>
        )}
      </div>
    </main>
  );
}
