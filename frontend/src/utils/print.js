/**
 * Formats and opens a browser print layout to print or save a PDF.
 * @param {string} title
 * @param {object} details
 * @param {array} items
 */
export const printDocument = (title, details, items = []) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left;">${item.item_name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${Number(item.quantity)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">₹${Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
          .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { margin: 0; color: #1d4ed8; font-size: 28px; font-weight: 800; }
          .meta-date { margin: 5px 0 0 0; color: #6b7280; font-size: 14px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .section-title { font-size: 16px; font-weight: 700; color: #374151; text-transform: uppercase; tracking-wider; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
          .info-block p { margin: 6px 0; font-size: 14px; }
          .info-block strong { color: #4b5563; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th { background-color: #f9fafb; padding: 12px 10px; text-align: left; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; }
          .total { margin-top: 40px; text-align: right; font-size: 20px; font-weight: 800; color: #111827; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${title}</h1>
            <p class="meta-date">Document Date: ${details.date}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #3b82f6;">VendorBridge ERP</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #9ca3af;">Unified Procurement System</p>
          </div>
        </div>
        <div class="grid">
          <div class="info-block">
            <div class="section-title">Vendor / Supplier Details</div>
            <p><strong>Company Name:</strong> ${details.vendor_name}</p>
            <p><strong>GST Number:</strong> ${details.gst_number || '—'}</p>
            <p><strong>Email Address:</strong> ${details.email || '—'}</p>
          </div>
          <div class="info-block">
            <div class="section-title">Document Reference</div>
            <p><strong>Reference ID:</strong> ${details.doc_number}</p>
            <p><strong>Status:</strong> <span style="text-transform: capitalize; font-weight: 600; color: ${details.status === 'paid' || details.status === 'accepted' ? '#10b981' : '#f59e0b'}">${details.status || '—'}</span></p>
          </div>
        </div>
        ${items.length > 0 ? `
          <div class="section-title" style="margin-top: 30px;">Line Items Detail</div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Item Name</th>
                <th style="text-align: right; width: 100px;">Quantity</th>
                <th style="text-align: right; width: 140px;">Unit Price</th>
                <th style="text-align: right; width: 160px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        ` : ''}
        <div class="total">
          Grand Total: ₹${Number(details.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 1000);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
