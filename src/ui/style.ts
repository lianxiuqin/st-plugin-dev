// style.ts —— 注入一次面板样式(分区卡片布局,对齐宿主 var(--ui-*) 主题)
const STYLE_ID = 'prompt-plugin-style'
const CSS = `
.prp .row-preset{display:flex;align-items:center;gap:8px;margin-bottom:14px;border:1px solid var(--ui-border,#e0e0e0);border-radius:10px;padding:8px 12px;background:var(--ui-accent-soft,#f0f0f0);flex-wrap:wrap}
.prp .row-preset select{flex:1;min-width:0;padding:7px 26px 7px 12px;font-size:13px;font-weight:500;border:none;border-radius:6px;background:var(--ui-surface,#ffffff);color:var(--ui-text,#444444);outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.prp .row-preset input{flex:1;min-width:0;padding:7px 10px;font-size:13px;border:1px solid var(--ui-border,#e0e0e0);border-radius:6px;background:var(--ui-surface,#ffffff);color:var(--ui-text,#444444);outline:none}
.prp .active-pill{font-size:11px;font-weight:600;background:var(--ui-accent,#333333);color:var(--ui-on-accent,#ffffff);padding:3px 10px;border-radius:20px;white-space:nowrap;flex-shrink:0}
.prp .text-btn{padding:5px 10px;font-size:12px;font-weight:500;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--ui-text-muted,#888888);cursor:pointer;white-space:nowrap}
.prp .text-btn:hover{background:var(--ui-surface,#ffffff);border-color:var(--ui-border,#e0e0e0);color:var(--ui-text,#444444)}
.prp .text-btn.danger{color:var(--ui-danger,#d9534f)}
.prp .text-btn.danger:hover{background:var(--ui-danger-soft,#fef3f2);border-color:var(--ui-danger-soft,#fef3f2)}
.prp .pid{font-size:11px;color:var(--ui-text-muted,#888888);background:var(--ui-surface,#ffffff);padding:3px 10px;border-radius:20px;border:1px solid var(--ui-border,#e0e0e0);font-family:monospace;white-space:nowrap;flex-shrink:0}
.prp .row-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px}
.prp .row-actions button{padding:11px 10px;font-size:13px;font-weight:500;border-radius:8px;border:1px solid var(--ui-border,#e0e0e0);background:var(--ui-surface,#ffffff);color:var(--ui-text,#444444);cursor:pointer;transition:all .15s}
.prp .row-actions button:hover:not(:disabled){background:var(--ui-accent-soft,#f0f0f0)}
.prp .row-actions button.danger{color:var(--ui-danger,#d9534f)}
.prp .row-actions button.danger:hover:not(:disabled){background:var(--ui-danger-soft,#fef3f2);border-color:var(--ui-danger-soft,#fef3f2)}
.prp .row-actions button:disabled{opacity:.5;cursor:not-allowed}
.prp .fg{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
.prp .fg>label{font-size:13px;font-weight:500;color:var(--ui-text,#444444)}
.prp .fg input,.prp .fg select,.prp .fg textarea{width:100%;padding:10px 14px;font-size:13px;font-family:inherit;border:1px solid var(--ui-border,#e0e0e0);border-radius:8px;background:var(--ui-surface,#ffffff);color:var(--ui-text,#444444);outline:none;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.prp .fg textarea{resize:vertical;min-height:120px;line-height:1.6}
.prp .entry-item{display:flex;align-items:center;gap:8px;border:1px solid var(--ui-border,#e0e0e0);border-radius:8px;padding:6px 10px;background:var(--ui-surface,#ffffff)}
.prp .entry-name{font-size:13.5px;font-weight:500;color:var(--ui-text,#444444);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.prp .entry-role{font-size:11px;color:var(--ui-text,#444444);background:var(--ui-accent-soft,#f0f0f0);border:1px solid var(--ui-border,#e0e0e0);padding:3px 0;min-width:64px;text-align:center;border-radius:12px;flex-shrink:0;font-family:monospace;font-weight:600}
.prp .entry-content{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;padding:0 4px}
.prp .sub-text{font-size:11.5px;color:var(--ui-text-muted,#888888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prp .entry-spacer{flex:1}
.prp .row-bottom{display:flex;align-items:center;gap:10px;margin-top:16px;border-top:1px solid var(--ui-border,#e0e0e0);padding-top:14px}
.prp .btn-group-left{display:flex;align-items:center;gap:10px}
.prp .send-btn{padding:9px 20px;font-size:13px;font-weight:600;border:1px solid var(--ui-accent,#333333);border-radius:8px;background:var(--ui-accent,#333333);color:var(--ui-on-accent,#ffffff);cursor:pointer}
.prp .send-btn:hover{background:var(--ui-accent,#333333)}
.prp .send-btn:disabled{opacity:.45;cursor:not-allowed}
.prp .empty-state{text-align:center;padding:28px 12px;color:var(--ui-text-muted,#888888);font-size:13px}
.prp.overlay{position:fixed;inset:0;background:var(--ui-overlay,rgba(0,0,0,0.28));z-index:10020;display:flex;align-items:center;justify-content:center;padding:20px}
.prp .float-modal{background:var(--ui-surface,#ffffff);border:1px solid var(--ui-border,#e0e0e0);box-shadow:var(--ui-shadow-m,0 4px 16px rgba(0,0,0,0.12));border-radius:12px;width:min(480px,94vw);display:flex;flex-direction:column;max-height:86vh;overflow:hidden}
.prp .float-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--ui-border,#e0e0e0)}
.prp .float-head b{font-size:14px;color:var(--ui-text,#444444)}
.prp .float-head .x{width:22px;height:22px;border-radius:50%;border:none;background:var(--ui-accent-soft,#f0f0f0);color:var(--ui-text-muted,#888888);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center}
.prp .float-body{padding:18px;overflow:auto;flex:1;font-size:13px;color:var(--ui-text,#444444);line-height:1.7}
.prp .float-foot{display:flex;gap:10px;justify-content:flex-end;padding:12px 18px;border-top:1px solid var(--ui-border,#e0e0e0)}
.prp .float-foot button{border:none;border-radius:40px;padding:9px 22px;font-size:12px;font-weight:600;cursor:pointer}
.prp .float-foot .s{background:var(--ui-surface,#ffffff);color:var(--ui-text-muted,#888888);border:1px solid var(--ui-border-strong,#ccc)}
.prp .float-foot .p{background:var(--ui-accent,#333333);color:var(--ui-on-accent,#ffffff);border:1px solid var(--ui-accent,#333333)}
.prp .float-foot .d{background:var(--ui-surface,#ffffff);color:var(--ui-danger,#d9534f);border:1px solid var(--ui-danger-soft,#fef3f2)}
.prp .confirm-t{text-align:center;font-size:14px;font-weight:600;color:var(--ui-text,#444444)}
.prp .confirm-d{text-align:center;font-size:12.5px;color:var(--ui-text-muted,#888888);line-height:1.7;margin-top:6px;word-break:break-all}
.prp .result-meta{background:var(--ui-accent-soft,#f0f0f0);border:1px solid var(--ui-border,#e0e0e0);border-radius:8px;padding:8px 12px;font-size:12px;line-height:1.7;color:var(--ui-text-muted,#888888);white-space:pre-wrap;word-break:break-all;max-height:130px;overflow:auto;margin-bottom:12px}
.prp .result-body{background:var(--ui-surface,#ffffff);border:1px solid var(--ui-border,#e0e0e0);border-radius:8px;padding:12px 14px;font-family:ui-monospace,Consolas,monospace;font-size:12px;line-height:1.6;color:var(--ui-text,#444444);overflow:auto;white-space:pre-wrap;word-break:break-all;min-height:180px;flex:1}
.prp .status-row{display:flex;align-items:center;gap:8px;margin-left:auto}
.prp .status-dot{width:10px;height:10px;border-radius:50%;background:var(--ui-border,#e0e0e0);transition:background .2s}
.prp .status-dot.success{background:var(--ui-accent,#333333)}
.prp .status-dot.error{background:var(--ui-danger,#d9534f)}
.prp .status-text{font-size:12px;color:var(--ui-text-muted,#888888)}
.prp .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.prp .entry-list{display:block;position:relative;min-height:0}
.prp .entry-wrap{position:absolute;left:0;right:0;top:0;transition:top .3s cubic-bezier(.22,.61,.36,1),box-shadow .2s ease,border-color .2s ease;will-change:top}
.prp .entry-wrap.prp-dragging{z-index:100;box-shadow:0 12px 40px rgba(31,38,135,.25);border-color:var(--ui-accent,#333333);cursor:grabbing;transition:box-shadow .2s ease,border-color .2s ease}
.prp .entry-head{display:flex;align-items:center;gap:10px;border:1px solid var(--ui-border,#e0e0e0);border-radius:10px;padding:8px 10px;background:var(--ui-surface,#ffffff)}
.prp .entry-head:hover{border-color:var(--ui-border,#e0e0e0)}
.prp .drag-handle{cursor:grab;color:var(--ui-text-muted,#888888);font-size:12px;user-select:none;flex-shrink:0;padding:0 2px}
.prp .drag-handle:hover{color:var(--ui-accent,#333333)}
.prp .drag-handle:active{cursor:grabbing}
.prp .entry-wrap.prp-dragging .drag-handle,.prp .block-row.prp-dragging .drag-handle{color:var(--ui-accent,#333333)}
.prp .pid-empty{flex-shrink:0}
.prp .entry-detail{margin:2px 0 0 22px;padding:10px 12px 14px;background:var(--ui-surface,#ffffff);border:1px solid var(--ui-border,#e0e0e0);border-radius:10px}
.prp .detail-label{display:block;font-size:12px;color:var(--ui-text-muted,#888888);margin:4px 0}
.prp .detail-text{font-size:12px;color:var(--ui-text-muted,#888888);white-space:pre-wrap;word-break:break-all;max-height:96px;overflow:auto;background:var(--ui-surface,#ffffff);border:1px solid var(--ui-border,#e0e0e0);border-radius:6px;padding:6px 8px;margin-bottom:6px}
.prp .block-list{display:block;position:relative;min-height:0}
.prp .block-row{position:absolute;left:0;right:0;top:0;display:flex;align-items:flex-start;gap:6px;background:var(--ui-surface,#ffffff);border:1px solid var(--ui-accent-soft,#f0f0f0);border-radius:8px;padding:5px;transition:top .3s cubic-bezier(.22,.61,.36,1),box-shadow .2s ease,border-color .2s ease;will-change:top}
.prp .block-row:hover{border-color:var(--ui-border,#e0e0e0)}
.prp .block-row.prp-dragging{z-index:100;box-shadow:0 12px 40px rgba(31,38,135,.25);border-color:var(--ui-accent,#333333);cursor:grabbing;transition:box-shadow .2s ease,border-color .2s ease}
.prp .prp-drop-indicator{position:absolute;left:0;right:0;height:3px;border-radius:3px;background:var(--ui-accent,#333333);opacity:0;transition:opacity .15s ease;pointer-events:none;box-shadow:var(--ui-accent-ring,rgba(51,51,51,0.15));z-index:101}
.prp .prp-drop-indicator.visible{opacity:1}
.prp .block-textarea{flex:1;min-height:44px;resize:vertical;font-family:inherit;font-size:12px;line-height:1.6;border:1px solid var(--ui-border,#e0e0e0);border-radius:6px;padding:5px 7px;background:var(--ui-surface,#ffffff)}
.prp .block-textarea:focus{outline:none;border-color:var(--ui-border-strong,#ccc)}
.prp .dashed-btn{border:1px dashed var(--ui-border-strong,#ccc);background:none;color:var(--ui-text-muted,#888888);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;margin-top:6px}
.prp .dashed-btn:hover{background:var(--ui-accent-soft,#f0f0f0);color:var(--ui-text,#444444)}
.prp .block-empty{font-size:12px;color:var(--ui-text-muted,#888888);padding:8px 4px;text-align:center}
.prp .wizard-tip{font-size:12px;color:var(--ui-text-muted,#888888);margin-bottom:8px}
.prp .wizard-opt{display:block;width:100%;text-align:left;border:1px solid var(--ui-border,#e0e0e0);background:var(--ui-surface,#ffffff);border-radius:10px;padding:12px 14px;cursor:pointer;font-size:13px;color:var(--ui-text,#444444);margin-bottom:8px;transition:all .15s}
.prp .wizard-opt:hover{border-color:var(--ui-border-strong,#ccc);background:var(--ui-accent-soft,#f0f0f0)}
.prp .save-order-btn{margin-left:0;padding:9px 20px;font-size:13px;font-weight:600;border:1px dashed var(--ui-border-strong,#ccc);border-radius:8px;background:var(--ui-surface,#ffffff);color:var(--ui-text-muted,#888888);cursor:pointer}
.prp .save-order-btn:hover:not(:disabled){background:var(--ui-accent-soft,#f0f0f0);border-style:solid}
.prp .save-order-btn:disabled{opacity:.45;cursor:not-allowed}
.prp .child-preview{flex:1;min-width:0;font-size:12px;color:var(--ui-text-muted,#888888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.6;padding-top:6px}
.prp .block-row .entry-name{flex-shrink:0;max-width:150px}
.prp .switch{position:relative;display:inline-block;width:36px;height:20px;flex-shrink:0;margin:0 4px;cursor:pointer;vertical-align:middle}
.prp .switch input{opacity:0;width:0;height:0}
.prp .switch .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:var(--ui-border,#cbd5e1);transition:.3s;border-radius:20px}
.prp .switch .slider:before{position:absolute;content:"";height:16px;width:16px;left:2px;bottom:2px;background:#ffffff;transition:.3s;border-radius:50%}
.prp .switch input:checked + .slider{background:var(--ui-accent,#333333)}
.prp .switch input:checked + .slider:before{transform:translateX(16px)}
.prp .switch input:focus-visible + .slider{box-shadow:0 0 0 2px var(--ui-accent-soft,#f0f0f0)}
.prp .prp-entry-off{opacity:.45}
.prp .block-row.readonly{opacity:.6;font-style:italic;background:var(--ui-accent-soft,#f0f0f0)}
.prp .add-reg-btn{border-radius:14px;padding:0 12px;font-size:12px;font-weight:500;border:1px dashed var(--ui-border-strong,#ccc);background:transparent;color:var(--ui-text,#444444);cursor:pointer;height:26px}
.prp .add-reg-btn:hover:not(:disabled){background:var(--ui-surface,#ffffff);border-style:solid}
.prp .add-reg-btn:disabled{opacity:.45;cursor:not-allowed}
@media (max-width:600px){
  .prp .row-actions{grid-template-columns:1fr}
  .prp .row-bottom{flex-wrap:wrap}
}
`
export function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = CSS
  document.head.appendChild(s)
}
