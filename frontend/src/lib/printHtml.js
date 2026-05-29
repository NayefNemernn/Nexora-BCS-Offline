// Electron blocks window.open("", "_blank") via setWindowOpenHandler.
// Use a hidden iframe so the receipt HTML prints inside the same renderer.
export function printHtml(html) {
  if (window.electronAPI) {
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;visibility:hidden";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 2000);
    }, 300);
  } else {
    // Web: open a popup; the inline <script> inside html triggers window.print()
    const win = window.open("", "_blank", "width=360,height=800");
    if (!win) { window.print(); return; }
    win.document.write(html);
    win.document.close();
  }
}
