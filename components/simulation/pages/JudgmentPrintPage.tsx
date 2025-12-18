import React, { useEffect, useState } from "react";
import { JudgmentData } from "../types/simulation";
import { PenTool, Download, Loader2 } from "lucide-react";

export function JudgmentPrintPage(props: {
  judgment: JudgmentData;
  onPrint?: () => void;
}) {
  const j = props.judgment;
  const [isExporting, setIsExporting] = useState(false);

  // Function to create the HTML content
  const getHtmlContent = () => {
    // We use a specific class for scoping styles so it works in both <body> (print) and <div> (pdf generation)
    return `
<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>صك حكم - ${j.caseMeta[0] || ''}</title>
<style>
  .judgment-doc { font-family: 'Times New Roman', serif; color: #000; direction: rtl; background: white; }
  .judgment-container { padding: 40px; max-width: 210mm; margin: 0 auto; background: white; }
  
  .header-container { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 30px; }
  .h1 { font-weight: bold; font-size: 22px; margin-bottom: 10px; }
  .h2 { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
  
  .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #000; }
  .meta-table td { border: 1px solid #000; padding: 8px; font-size: 14px; }
  .meta-label { background-color: #f0f0f0; font-weight: bold; width: 120px; }
  
  .section-title { font-weight: bold; font-size: 18px; margin: 20px 0 10px 0; text-decoration: underline; }
  .text-content { text-align: justify; line-height: 1.8; font-size: 16px; margin-bottom: 15px; white-space: pre-wrap; }
  
  .ruling-box { border: 2px solid #000; padding: 20px; margin: 30px 0; border-radius: 5px; background-color: #fafafa; }
  .ruling-title { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 15px; }
  
  .signatures { margin-top: 60px; display: flex; justify-content: space-around; text-align: center; }
  .sign-col { width: 40%; }
  .sign-line { margin-top: 50px; border-top: 1px dotted #000; width: 80%; margin-left: auto; margin-right: auto; }
</style>
</head>
<body class="judgment-doc">
  <div id="judgment-content" class="judgment-container">
      <div class="header-container">
        <div class="h1">المملكة العربية السعودية</div>
        <div class="h1">وزارة العدل</div>
        <div class="h2">${j.courtHeader}</div>
      </div>

      <table class="meta-table">
        ${j.caseMeta.map(m => {
            const [k, v] = m.split(':');
            return `<tr><td class="meta-label">${k}</td><td>${v || ''}</td></tr>`;
        }).join('')}
      </table>

      <div class="section-title">الوقائع والأسباب</div>
      <div class="text-content">
        ${j.reasons.join('\n\n')}
      </div>

      <div class="ruling-box">
        <div class="ruling-title">منطوق الحكم</div>
        <div class="text-content" style="font-weight: bold;">
          ${j.ruling.join('\n\n')}
        </div>
      </div>

      <div class="signatures">
         <div class="sign-col">
            <div>أمين السر</div>
            <div style="font-weight:bold; margin-top:5px;">حاوي عبد الله كيلاني</div>
            <div class="sign-line">التوقيع</div>
         </div>
         <div class="sign-col">
            <div>قاضي الدائرة</div>
            <div style="font-weight:bold; margin-top:5px;">معاذ علي العريشي</div>
            <div class="sign-line">التوقيع والختم</div>
         </div>
      </div>
  </div>
</body>
</html>
    `;
  };

  useEffect(() => {
    const iframe = document.getElementById("judgment_iframe") as HTMLIFrameElement | null;
    if (!iframe) return;
    iframe.srcdoc = getHtmlContent();
  }, [j]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (printWindow) {
        printWindow.document.write(getHtmlContent());
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 800);
    }
  };

  const handleExportWord = () => {
      const content = getHtmlContent();
      const blob = new Blob(['\ufeff', content], {
          type: 'application/msword'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `صك_حكم_${Date.now()}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
        const jsPDFModule = await import("jspdf");
        // @ts-ignore
        const jsPDF = jsPDFModule.default ? jsPDFModule.default : jsPDFModule.jsPDF || jsPDFModule;

        const html2canvasModule = await import("html2canvas");
        // @ts-ignore
        const html2canvas = html2canvasModule.default || html2canvasModule;
        
        // Create a temporary container for rendering
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = '210mm'; // A4 width
        container.style.background = 'white';
        container.style.direction = 'rtl';
        // Add class to match styles
        container.className = 'judgment-doc'; 
        
        // We set innerHTML. The <style> tag will be processed.
        // The <body> tag is stripped, so we wrap the content in a div that mimics the body's class if needed,
        // but we already added 'judgment-doc' to the container.
        // However, styles target .judgment-doc, so container having it is good.
        // Also styles target children.
        
        // Extract content from HTML string to avoid <html>/<body> nesting issues in a div
        const fullHtml = getHtmlContent();
        // Naive extraction of body content
        const bodyContent = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || fullHtml;
        // Extract style block
        const styleContent = fullHtml.match(/<style>([\s\S]*)<\/style>/i)?.[0] || '';
        
        container.innerHTML = styleContent + bodyContent;
        
        document.body.appendChild(container);

        // Wait for rendering
        await new Promise(r => setTimeout(r, 800));

        // Target the specific content
        const elementToCapture = container.querySelector('#judgment-content') || container;

        const canvas = await html2canvas(elementToCapture as HTMLElement, { 
            scale: 2,
            useCORS: true,
            windowWidth: 1200 // Force desktop width logic
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`صك_حكم_${Date.now()}.pdf`);
        
        document.body.removeChild(container);
    } catch (e) {
        console.error("PDF Export Error:", e);
        alert("حدث خطأ أثناء تصدير PDF. جاري التصدير كـ Word كبديل.");
        handleExportWord();
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">صك الحكم النهائي</h2>
            <p className="text-slate-500 text-sm">تم إصدار الحكم بناءً على المداولة والوقائع المثبتة</p>
          </div>
          <div className="flex gap-3">
            <button
                onClick={handleExportWord}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-500 transition-colors shadow-lg active:scale-95"
            >
                <Download size={18} />
                Word
            </button>
             <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-red-500 transition-colors shadow-lg disabled:opacity-50 active:scale-95 min-w-[120px] justify-center"
            >
                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {isExporting ? 'جاري...' : 'PDF'}
            </button>
            <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
            >
                <PenTool size={18} />
                طباعة
            </button>
        </div>
      </div>

      <div className="bg-slate-100 p-4 rounded-3xl border border-slate-200">
          <iframe
            id="judgment_iframe"
            className="w-full h-[70vh] rounded-2xl bg-white shadow-sm border border-slate-200"
            title="Judgment Preview"
          />
      </div>
    </div>
  );
}
