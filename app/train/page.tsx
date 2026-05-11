'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Play, Square, BarChart3, Cpu, Layers, Settings, AlertCircle } from 'lucide-react';

interface DataColumn { name: string; type: 'number' | 'string'; }
interface TrainConfig { epochs: number; learningRate: number; batchSize: number; hiddenLayers: number[]; validationSplit: number; taskType: 'regression' | 'classification'; targetColumn: string; featureColumns: string[]; maxSamples: number; earlyStopping: boolean; patience: number; }
interface TrainLog { epoch: number; loss: number; valLoss: number; accuracy?: number; valAccuracy?: number; }

const MAX_BROWSER_SAMPLES = 15000; // Safe limit for WebGL

export default function TrainPage() {
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [columns, setColumns] = useState<DataColumn[]>([]);
  const [fileName, setFileName] = useState('');
  const [config, setConfig] = useState<TrainConfig>({ epochs: 50, learningRate: 0.01, batchSize: 32, hiddenLayers: [64, 32], validationSplit: 0.2, taskType: 'classification', targetColumn: '', featureColumns: [], maxSamples: MAX_BROWSER_SAMPLES, earlyStopping: true, patience: 5 });
  const [isTraining, setIsTraining] = useState(false);
  const [logs, setLogs] = useState<TrainLog[]>([]);
  const [status, setStatus] = useState('');
  const [finalMetrics, setFinalMetrics] = useState<{ loss: number; accuracy?: number } | null>(null);
  const [dataPreview, setDataPreview] = useState<string[][] | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef(false);

  const handleFile = useCallback((file: File) => {
    const MAX_READ_BYTES = 2 * 1024 * 1024; // Only read first 2MB of large files
    const MAX_ROWS = 50000; // Cap rows for browser training

    setStatus(`Reading ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)...`);
    setLogs([]); setFinalMetrics(null);

    // For large files, only read a portion
    const blob = file.size > MAX_READ_BYTES ? file.slice(0, MAX_READ_BYTES) : file;
    const isPartial = file.size > MAX_READ_BYTES;

    const reader = new FileReader();
    reader.onload = (e) => {
      let text = e.target?.result as string;

      // If we sliced the file, remove the last (potentially incomplete) line
      if (isPartial) {
        const lastNewline = text.lastIndexOf('\n');
        if (lastNewline > 0) text = text.substring(0, lastNewline);
      }

      const lines = text.split('\n').map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      if (lines.length < 3) { setStatus('CSV needs at least 3 rows'); return; }
      const headers = lines[0];
      const allRows = lines.slice(1).filter(r => r.length === headers.length);
      const rows = allRows.slice(0, MAX_ROWS); // Cap rows

      const cols: DataColumn[] = headers.map((name, i) => {
        const vals = rows.slice(0, 50).map(r => r[i]);
        return { name, type: vals.every(v => !isNaN(Number(v)) && v !== '') ? 'number' : 'string' };
      });
      setCsvData(rows);
      setColumns(cols);
      setFileName(file.name);
      setDataPreview(rows.slice(0, 5));
      const numCols = cols.filter(c => c.type === 'number').map(c => c.name);
      setConfig(c => ({ ...c, targetColumn: cols[cols.length - 1].name, featureColumns: numCols.length > 1 ? numCols.slice(0, -1) : cols.slice(0, -1).map(c => c.name), maxSamples: Math.min(rows.length, MAX_BROWSER_SAMPLES) }));

      const sizeInfo = `${(file.size / (1024 * 1024)).toFixed(1)}MB`;
      if (isPartial) {
        setStatus(`Loaded ${rows.length.toLocaleString()} rows from ${sizeInfo} file (read first 2MB). Will sample ${Math.min(rows.length, MAX_BROWSER_SAMPLES).toLocaleString()} for training.`);
      } else if (rows.length > MAX_BROWSER_SAMPLES) {
        setStatus(`Loaded ${rows.length.toLocaleString()} rows (will sample ${MAX_BROWSER_SAMPLES.toLocaleString()} for browser training)`);
      } else {
        setStatus(`Loaded ${rows.length.toLocaleString()} rows, ${cols.length} columns`);
      }
    };
    reader.onerror = () => setStatus(`Error reading file: ${file.name}`);
    reader.readAsText(blob);
  }, []);

  // Draw chart
  useEffect(() => {
    if (!canvasRef.current || logs.length < 2) return;
    const ctx = canvasRef.current.getContext('2d'); if (!ctx) return;
    const w = canvasRef.current.width, h = canvasRef.current.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const y = 30 + (i * (h - 50)) / 4; ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w - 10, y); ctx.stroke(); }
    const maxLoss = Math.max(...logs.map(l => Math.max(l.loss, l.valLoss))) * 1.1 || 1;
    const drawLine = (data: number[], color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
      data.forEach((v, i) => { const x = 40 + (i / Math.max(data.length - 1, 1)) * (w - 50); const y = 30 + (1 - v / maxLoss) * (h - 50); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();
    };
    drawLine(logs.map(l => l.loss), '#6366f1');
    drawLine(logs.map(l => l.valLoss), '#f97316');
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Loss', 5, 20); ctx.fillText(`Epoch ${logs.length}`, w / 2 - 20, h - 5);
    ctx.fillStyle = '#6366f1'; ctx.fillRect(w - 130, 8, 10, 10);
    ctx.fillStyle = '#94a3b8'; ctx.fillText('Train', w - 115, 17);
    ctx.fillStyle = '#f97316'; ctx.fillRect(w - 70, 8, 10, 10);
    ctx.fillStyle = '#94a3b8'; ctx.fillText('Val', w - 55, 17);
  }, [logs]);

  const startTraining = useCallback(async () => {
    if (!csvData || !config.targetColumn) return;
    setIsTraining(true); stopRef.current = false; setLogs([]); setFinalMetrics(null);
    setStatus('Loading TensorFlow.js...');
    try {
      const tf = await import('@tensorflow/tfjs');
      // Use CPU backend for large datasets to avoid WebGL texture limits
      const useGPU = config.maxSamples <= 10000;
      if (!useGPU) {
        setStatus('Large dataset detected — using CPU backend...');
        await tf.setBackend('cpu');
        await tf.ready();
      }
      setStatus('Preparing data...');
      const targetIdx = columns.findIndex(c => c.name === config.targetColumn);
      const featureIdxs = config.featureColumns.map(n => columns.findIndex(c => c.name === n)).filter(i => i >= 0 && columns[i].type === 'number');
      if (featureIdxs.length === 0) { setStatus('Error: Select at least one numeric feature column'); setIsTraining(false); return; }
      // Sample data if too large
      let sampleData = csvData;
      if (csvData.length > config.maxSamples) {
        const shuffled = [...csvData].sort(() => Math.random() - 0.5);
        sampleData = shuffled.slice(0, config.maxSamples);
        setStatus(`Sampled ${config.maxSamples.toLocaleString()} from ${csvData.length.toLocaleString()} rows`);
      }
      // Encode labels
      const uniqueLabels = config.taskType === 'classification' ? [...new Set(sampleData.map(r => r[targetIdx]))] : [];
      const numClasses = uniqueLabels.length;
      // Build arrays
      const xData: number[][] = []; const yData: number[] = [];
      sampleData.forEach(row => {
        const features = featureIdxs.map(i => { const v = Number(row[i]); return isNaN(v) ? 0 : v; });
        let target: number;
        if (config.taskType === 'classification') { target = uniqueLabels.indexOf(row[targetIdx]); if (target < 0) return; }
        else { target = Number(row[targetIdx]); if (isNaN(target)) return; }
        xData.push(features); yData.push(target);
      });
      if (xData.length < 10) { setStatus('Error: Not enough valid numeric data rows (need 10+)'); setIsTraining(false); return; }
      // Normalize
      const xTensor = tf.tensor2d(xData);
      const xMin = xTensor.min(0); const xMax = xTensor.max(0);
      const xNorm = xTensor.sub(xMin).div(xMax.sub(xMin).add(tf.scalar(1e-7)));
      let yTensor: any;
      if (config.taskType === 'classification' && numClasses > 2) { yTensor = tf.oneHot(tf.tensor1d(yData, 'int32'), numClasses); }
      else { yTensor = tf.tensor1d(yData); }
      // Build model
      setStatus(`Building model (${featureIdxs.length} features → [${config.hiddenLayers.join(', ')}] → output)...`);
      const model = tf.sequential();
      config.hiddenLayers.forEach((units, i) => {
        model.add(tf.layers.dense({ units, activation: 'relu', ...(i === 0 ? { inputShape: [featureIdxs.length] } : {}) }));
        if (units > 16) model.add(tf.layers.dropout({ rate: 0.15 }));
      });
      if (config.taskType === 'classification') {
        model.add(tf.layers.dense({ units: numClasses > 2 ? numClasses : 1, activation: numClasses > 2 ? 'softmax' : 'sigmoid' }));
      } else { model.add(tf.layers.dense({ units: 1 })); }
      const loss = config.taskType === 'classification' ? (numClasses > 2 ? 'categoricalCrossentropy' : 'binaryCrossentropy') : 'meanSquaredError';
      model.compile({ optimizer: tf.train.adam(config.learningRate), loss, metrics: config.taskType === 'classification' ? ['accuracy'] : ['mse'] });
      setStatus(`Training on ${xData.length.toLocaleString()} samples...`);
      // Early stopping state
      let bestValLoss = Infinity; let noImproveCount = 0;
      await model.fit(xNorm, yTensor, {
        epochs: config.epochs, batchSize: Math.min(config.batchSize, xData.length), validationSplit: config.validationSplit, shuffle: true,
        callbacks: {
          onEpochEnd: async (epoch: number, log: any) => {
            if (stopRef.current) { model.stopTraining = true; return; }
            const entry: TrainLog = { epoch: epoch + 1, loss: log.loss, valLoss: log.val_loss, accuracy: log.acc, valAccuracy: log.val_acc };
            setLogs(prev => [...prev, entry]);
            setStatus(`Epoch ${epoch + 1}/${config.epochs} — Loss: ${log.loss.toFixed(4)}${log.acc !== undefined ? ` — Acc: ${(log.acc * 100).toFixed(1)}%` : ''}`);
            // Early stopping
            if (config.earlyStopping) {
              if (log.val_loss < bestValLoss - 0.001) { bestValLoss = log.val_loss; noImproveCount = 0; }
              else { noImproveCount++; if (noImproveCount >= config.patience) { setStatus(`Early stopping at epoch ${epoch + 1} (no improvement for ${config.patience} epochs)`); model.stopTraining = true; } }
            }
          },
        },
      });
      const evalResult = model.evaluate(xNorm, yTensor) as any;
      const finalLoss = Array.isArray(evalResult) ? (await evalResult[0].data())[0] : (await evalResult.data())[0];
      const finalAcc = Array.isArray(evalResult) && evalResult.length > 1 ? (await evalResult[1].data())[0] : undefined;
      setFinalMetrics({ loss: finalLoss, accuracy: finalAcc });
      if (!stopRef.current) setStatus('✅ Training complete!');
      tf.dispose([xTensor, xMin, xMax, xNorm, yTensor]); model.dispose();
      // Switch back to WebGL for future runs
      if (!useGPU) { await tf.setBackend('webgl'); await tf.ready(); }
    } catch (err: any) {
      console.error('Training error:', err);
      if (err.message?.includes('texture') || err.message?.includes('WebGL')) {
        setStatus('⚠️ GPU memory exceeded — retrying with CPU backend...');
        // Auto-retry with smaller sample
        setConfig(c => ({ ...c, maxSamples: Math.min(c.maxSamples, 5000) }));
      } else { setStatus(`Error: ${err.message}`); }
    } finally { setIsTraining(false); }
  }, [csvData, columns, config]);

  return (
    <div className="min-h-screen" style={{ background: '#020617', overflow: 'auto' }}>
      <div className="bg-mesh" /><div className="grid-overlay" />
      <header className="sticky top-0 z-20 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: 'rgba(99,102,241,0.1)', background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(20px)' }}>
        <Link href="/" className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-white/5 transition-all"><ArrowLeft size={18} /></Link>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14b8a6, #10b981)', boxShadow: '0 0 15px rgba(20,184,166,0.5)' }}><Cpu size={16} className="text-white" /></div>
          <div><p className="text-sm font-bold text-white">ML Training Playground</p><p className="text-[10px] text-surface-500 uppercase tracking-widest">TensorFlow.js · Browser-based</p></div>
        </div>
        <div className="flex-1" />
        <Link href="/" className="btn-ghost text-xs">← Back to Chat</Link>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Data & Config */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3"><Upload size={14} className="text-brand-400" /><h3 className="text-sm font-semibold text-white">1. Upload Data</h3></div>
            <label className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-brand-500/50" style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.03)' }}
              onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
              <Upload size={24} className="text-surface-500" />
              <p className="text-xs text-surface-400">Drop CSV here or click to browse</p>
              <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </label>
            {fileName && <p className="text-xs text-brand-400 mt-2">📄 {fileName} — {csvData?.length.toLocaleString()} rows</p>}
            {csvData && csvData.length > MAX_BROWSER_SAMPLES && (
              <div className="flex items-start gap-2 mt-2 p-2 rounded-lg text-[10px]" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#fdba74' }}>
                <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                <span>Large dataset! Will randomly sample {config.maxSamples.toLocaleString()} rows for browser training. For full dataset training, use the ML Training chat mode to generate Python scripts.</span>
              </div>
            )}
          </div>

          {columns.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3"><Layers size={14} className="text-brand-400" /><h3 className="text-sm font-semibold text-white">2. Configure</h3></div>
              <label className="text-xs text-surface-400 mb-1 block">Task Type</label>
              <div className="flex gap-2 mb-3">
                {(['classification', 'regression'] as const).map(t => (
                  <button key={t} onClick={() => setConfig(c => ({ ...c, taskType: t }))} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: config.taskType === t ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${config.taskType === t ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`, color: config.taskType === t ? '#a5b8fd' : '#64748b' }}>{t}</button>
                ))}
              </div>
              <label className="text-xs text-surface-400 mb-1 block">Target Column</label>
              <select value={config.targetColumn} onChange={e => { const t = e.target.value; setConfig(c => ({ ...c, targetColumn: t, featureColumns: columns.filter(col => col.name !== t && col.type === 'number').map(col => col.name) })); }}
                className="input-field text-xs mb-3" style={{ background: 'rgba(2,6,23,0.8)' }}>
                {columns.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
              </select>
              <label className="text-xs text-surface-400 mb-1 block">Features ({config.featureColumns.length} selected, numeric only)</label>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {columns.filter(c => c.name !== config.targetColumn).map(c => (
                  <label key={c.name} className={`flex items-center gap-2 text-xs cursor-pointer ${c.type === 'string' ? 'opacity-40' : 'text-surface-300'}`}>
                    <input type="checkbox" disabled={c.type === 'string'} checked={config.featureColumns.includes(c.name)}
                      onChange={e => setConfig(cfg => ({ ...cfg, featureColumns: e.target.checked ? [...cfg.featureColumns, c.name] : cfg.featureColumns.filter(f => f !== c.name) }))} />
                    {c.name} <span className="text-surface-600">({c.type})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {columns.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3"><Settings size={14} className="text-brand-400" /><h3 className="text-sm font-semibold text-white">3. Hyperparameters</h3></div>
              {[['Epochs', 'epochs', 1, 500], ['Learning Rate', 'learningRate', 0.0001, 0.1], ['Batch Size', 'batchSize', 4, 256], ['Validation Split', 'validationSplit', 0.05, 0.5]].map(([label, key, min, max]) => (
                <div key={key as string} className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span className="text-surface-400">{label as string}</span><span className="text-brand-400 font-mono">{(config as any)[key as string]}</span></div>
                  <input type="range" min={min as number} max={max as number} step={key === 'learningRate' ? 0.0001 : key === 'validationSplit' ? 0.05 : 1}
                    value={(config as any)[key as string]} onChange={e => setConfig(c => ({ ...c, [key as string]: Number(e.target.value) }))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer" style={{ background: 'rgba(99,102,241,0.3)' }} />
                </div>
              ))}
              <label className="text-xs text-surface-400 mb-1 block">Hidden Layers</label>
              <input type="text" value={config.hiddenLayers.join(', ')} onChange={e => setConfig(c => ({ ...c, hiddenLayers: e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0) }))}
                className="input-field text-xs font-mono mb-3" placeholder="64, 32" />
              <label className="flex items-center gap-2 text-xs text-surface-300 cursor-pointer">
                <input type="checkbox" checked={config.earlyStopping} onChange={e => setConfig(c => ({ ...c, earlyStopping: e.target.checked }))} />
                Early Stopping (patience: {config.patience})
              </label>
            </div>
          )}
        </div>

        {/* Right — Training & Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-4 flex items-center gap-3 flex-wrap">
            {!isTraining ? (
              <button onClick={startTraining} disabled={!csvData || config.featureColumns.length === 0}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"><Play size={14} /> Start Training</button>
            ) : (
              <button onClick={() => { stopRef.current = true; }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                <Square size={13} fill="currentColor" /> Stop</button>
            )}
            <span className="text-xs text-surface-400 flex-1">{status || 'Upload a CSV to get started'}</span>
            {isTraining && <div className="progress-bar w-24 rounded-full" />}
          </div>

          {/* Data Preview */}
          {dataPreview && columns.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-white mb-2">📋 Data Preview (first 5 rows)</h3>
              <div className="overflow-x-auto"><table className="w-full text-[10px]">
                <thead><tr>{columns.map(c => <th key={c.name} className="text-left py-1 px-2 text-surface-500 font-medium">{c.name}</th>)}</tr></thead>
                <tbody>{dataPreview.map((row, i) => <tr key={i} className="border-t" style={{ borderColor: 'rgba(99,102,241,0.08)' }}>{row.map((cell, j) => <td key={j} className="py-1 px-2 text-surface-400 font-mono truncate max-w-[100px]">{cell}</td>)}</tr>)}</tbody>
              </table></div>
            </div>
          )}

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3"><BarChart3 size={14} className="text-brand-400" /><h3 className="text-sm font-semibold text-white">Training Progress</h3></div>
            <canvas ref={canvasRef} width={700} height={300} className="w-full rounded-xl" style={{ border: '1px solid rgba(99,102,241,0.1)' }} />
            {logs.length === 0 && <p className="text-xs text-surface-600 text-center mt-3">Loss chart will appear here during training</p>}
          </div>

          {finalMetrics && (
            <div className="glass-card p-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-white mb-3">✅ Training Results</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p className="text-xs text-surface-500">Final Loss</p><p className="text-lg font-bold text-brand-400">{finalMetrics.loss.toFixed(4)}</p></div>
                {finalMetrics.accuracy !== undefined && (
                  <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-xs text-surface-500">Accuracy</p><p className="text-lg font-bold text-green-400">{(finalMetrics.accuracy * 100).toFixed(1)}%</p></div>)}
                <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                  <p className="text-xs text-surface-500">Epochs Run</p><p className="text-lg font-bold text-orange-400">{logs.length}</p></div>
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-white mb-3">📊 Epoch Log (last 20)</h3>
              <div className="max-h-48 overflow-y-auto"><table className="w-full text-xs">
                <thead><tr className="text-surface-500"><th className="text-left py-1 px-2">Epoch</th><th className="text-left py-1 px-2">Loss</th><th className="text-left py-1 px-2">Val Loss</th>
                  {logs[0]?.accuracy !== undefined && <><th className="text-left py-1 px-2">Acc</th><th className="text-left py-1 px-2">Val Acc</th></>}</tr></thead>
                <tbody>{logs.slice(-20).map(l => (
                  <tr key={l.epoch} className="text-surface-300 border-t" style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
                    <td className="py-1 px-2">{l.epoch}</td><td className="py-1 px-2 font-mono">{l.loss.toFixed(4)}</td><td className="py-1 px-2 font-mono">{l.valLoss.toFixed(4)}</td>
                    {l.accuracy !== undefined && <><td className="py-1 px-2 font-mono">{(l.accuracy * 100).toFixed(1)}%</td><td className="py-1 px-2 font-mono">{((l.valAccuracy || 0) * 100).toFixed(1)}%</td></>}
                  </tr>))}</tbody>
              </table></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
